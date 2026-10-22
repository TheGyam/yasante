"""
Planner: collections (what she's saving) and care plans (how she looks after it).
"""

import logging
import uuid

from apps.common.blocks import blocked_account_ids, is_blocked
from apps.common.throttling import ReportThrottle, SharedViewThrottle, SharingThrottle
from apps.looks.serializers import ReportRequestSerializer
from apps.common.timeparse import local_parts
from apps.looks.models import Look
from apps.looks.views import public_looks
from django.db import IntegrityError, transaction
from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CarePlan, CarePlanSession, CarePlanStep, Collection, CollectionItem
from .serializers import (
    CarePlanRequestSerializer,
    CarePlanResponseSerializer,
    CarePlanScheduleRequestSerializer,
    CarePlanSessionRequestSerializer,
    CarePlanSessionResponseSerializer,
    CollectionItemRequestSerializer,
    CollectionItemResponseSerializer,
    CollectionRequestSerializer,
    CollectionResponseSerializer,
    MakeMineRequestSerializer,
    SharedCarePlanResponseSerializer,
    SharedCollectionResponseSerializer,
)

logger = logging.getLogger(__name__)

FREQUENCIES = ("daily", "every-2-days", "weekly", "specific-days")
TIMES_OF_DAY = ("morning", "afternoon", "evening", "night")


# ── Collections ──────────────────────────────────────


PREVIEWS = 4
# Always the site's address: it's sent in messages, and opens the app where it's installed.
SITE = "https://yasante.com"
NOT_SHARED = "This isn’t shared any more"
NOT_HERS = "This one is someone else’s to change"


def _with_photos():
    return CollectionItem.objects.exclude(photo_uri="").order_by("-created_at")


def shown_items(items, viewer):
    """
    What someone other than its author may see of a shared collection: never a private,
    hidden or removed look, or one by anyone either of them has blocked. Each viewer's
    page is filtered for them.
    """
    items = list(items)
    ids = []
    for ref in {i.ref_id for i in items if i.kind == "look"}:
        try:
            ids.append(uuid.UUID(ref))
        except ValueError:
            continue
    if not ids:
        return [i for i in items if i.kind != "look"]
    viewer_id = viewer.pk if viewer is not None and viewer.is_authenticated else None
    visible = (
        public_looks()
        .filter(pk__in=ids)
        .filter(Q(visibility="public", status="live") | (Q(author_id=viewer_id) & ~Q(status="removed")))
        .exclude(author_id__in=blocked_account_ids(viewer))
        .values_list("pk", flat=True)
    )
    ok = {str(pk) for pk in visible}
    return [i for i in items if i.kind != "look" or i.ref_id.lower() in ok]


def present_author(user):
    """All anyone else ever sees of who made it: the id is only so she can be blocked."""
    return {
        "id": str(user.pk),
        "name": user.name,
        "username": user.username or None,
        "avatar_uri": user.avatar_uri or None,
    }


def _share_fields(row, kind):
    """The author's own view of her sharing: her link and counts, never who."""
    out = {"sharing": "link" if row.share_code else "private"}
    if row.share_code:
        followers = getattr(row, "follower_total", None)
        copies = getattr(row, "copy_total", None)
        out.update(
            share_url=f"{SITE}/{'c' if kind == 'collection' else 'p'}/{row.share_code}",
            followers=row.followers.count() if followers is None else followers,
            made_it_theirs=row.copies.count() if copies is None else copies,
        )
    if row.based_on_name:
        source = row.based_on
        out["based_on"] = {
            "name": row.based_on_name,
            "author_name": row.based_on_author or None,
            "code": source.share_code if source is not None and source.share_code else None,
        }
    return out


def _following(source):
    return {"author": present_author(source.user), "code": source.share_code, "updated_at": source.changed_at}


def present_collection(c, viewer=None, items=None):
    """
    Her own, or one she tags along with: then its name and pictures are its source's,
    as she may see them. `items` is the source's items, already fetched, when listing.
    """
    source = c.follows
    if source is not None:
        shown = shown_items(source.items.order_by("-created_at") if items is None else items, viewer)
        photos = [i for i in shown if i.photo_uri][:PREVIEWS]
        count = len(shown)
        name = source.name
    else:
        # The newest few pictures, for the stacked card; prefetched when listing.
        photos = getattr(c, "with_photos", None)
        photos = photos[:PREVIEWS] if photos is not None else list(_with_photos().filter(collection=c)[:PREVIEWS])
        count = c.item_total if hasattr(c, "item_total") else c.items.count()
        name = c.name
    cover = photos[0] if photos else None
    out = {
        "id": str(c.pk),
        "name": name,
        # For versions of the app from before sharing.
        "is_private": not c.share_code,
        "created_at": c.created_at,
        "item_count": count,
        "cover_uri": (cover.thumb_uri or cover.photo_uri) if cover else None,
        "preview_uris": [p.thumb_uri or p.photo_uri for p in photos],
        **_share_fields(c, "collection"),
    }
    if source is not None:
        out["following"] = _following(source)
    return out


def present_item(i):
    return {
        "id": str(i.pk),
        "kind": i.kind,
        "ref_id": i.ref_id,
        "image_uri": i.photo_uri or None,
        "title": i.title or None,
        "added_at": i.created_at,
    }


def _mine(model, request, pk):
    """Hers: her own, or one she tags along with, unless either has blocked the other."""
    row = model.objects.select_related("follows__user", "based_on").filter(pk=pk, user=request.user).first()
    if row is not None and row.follows is not None and is_blocked(request.user, row.follows.user):
        return None
    return row


def _collection(request, pk):
    return _mine(Collection, request, pk)


def _gone():
    return Response({"message": "That collection is gone"}, status=404)


def _free_name(model, user, wanted):
    """Her name for it, unless she already has one called that: then "Winter braids 2"."""
    taken = {
        n.lower() for n in model.objects.filter(user=user, follows__isnull=True).values_list("name", flat=True)
    }
    wanted = wanted[:145]
    if wanted.lower() not in taken:
        return wanted
    n = 2
    while f"{wanted} {n}".lower() in taken:
        n += 1
    return f"{wanted} {n}"


def _counted(queryset):
    return queryset.annotate(
        follower_total=Count("followers", distinct=True), copy_total=Count("copies", distinct=True)
    )


@extend_schema_view(get=extend_schema(responses=CollectionResponseSerializer(many=True)), post=extend_schema(request=CollectionRequestSerializer, responses={201: CollectionResponseSerializer}))
class CollectionListCreateView(APIView):
    """GET / POST /api/collections/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        collections = list(
            _counted(Collection.objects.filter(user=request.user))
            .exclude(follows__user_id__in=blocked_account_ids(request.user))
            .annotate(item_total=Count("items", distinct=True))
            .select_related("follows__user", "based_on")
            # ponytail: fetches every pictured item per collection; slice in SQL if
            # collections grow to hundreds of items.
            .prefetch_related(Prefetch("items", queryset=_with_photos(), to_attr="with_photos"))
            .order_by("-created_at")
        )
        # What the ones she tags along with hold, in one query.
        sources = {}
        for item in CollectionItem.objects.filter(
            collection_id__in=[c.follows_id for c in collections if c.follows_id]
        ).order_by("-created_at"):
            sources.setdefault(item.collection_id, []).append(item)
        return Response(
            [
                present_collection(c, request.user, sources.get(c.follows_id, []) if c.follows_id else None)
                for c in collections
            ]
        )

    def post(self, request):
        name = str(request.data.get("name") or "").strip()[:150]
        if not name:
            return Response({"message": "Give it a name"}, status=400)
        if Collection.objects.filter(user=request.user, follows__isnull=True, name__iexact=name).exists():
            return Response({"message": "You already have a collection called that"}, status=409)
        # Only hers until she shares it.
        collection = Collection.objects.create(user=request.user, name=name)
        return Response(present_collection(collection), status=201)


@extend_schema_view(get=extend_schema(responses=CollectionResponseSerializer), patch=extend_schema(request=CollectionRequestSerializer(partial=True), responses=CollectionResponseSerializer), delete=extend_schema(responses={204: None}))
class CollectionDetailView(APIView):
    """GET / PATCH / DELETE /api/collections/:id/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        collection = _collection(request, pk)
        return Response(present_collection(collection, request.user)) if collection else _gone()

    def patch(self, request, pk):
        collection = _collection(request, pk)
        if collection is None:
            return _gone()
        if collection.follows_id:
            return Response({"message": NOT_HERS}, status=403)
        if "name" in request.data:
            name = str(request.data.get("name") or "").strip()[:150]
            if not name:
                return Response({"message": "Give it a name"}, status=400)
            clash = (
                Collection.objects.filter(user=request.user, follows__isnull=True, name__iexact=name)
                .exclude(pk=collection.pk)
                .exists()
            )
            if clash:
                return Response(
                    {"message": "You already have a collection called that"}, status=409
                )
            if name != collection.name:
                collection.name = name
                collection.changed_at = timezone.now()
        collection.save()
        return Response(present_collection(collection))

    def delete(self, request, pk):
        # Hers, or one she tags along with (that's leaving it). Everyone tagging along
        # with hers loses it with her.
        collection = Collection.objects.filter(pk=pk, user=request.user).first()
        if collection is None:
            return _gone()
        with transaction.atomic():
            look_ids = list(
                collection.items.filter(kind="look").values_list("ref_id", flat=True)
            )
            collection.delete()
            _refresh_save_counts(look_ids)
        return Response(status=status.HTTP_204_NO_CONTENT)


def _refresh_save_counts(look_ids):
    """A look's save count is the number of distinct people holding it."""
    for look_id in set(look_ids):
        people = (
            CollectionItem.objects.filter(kind="look", ref_id=look_id)
            .values("collection__user")
            .distinct()
            .count()
        )
        try:
            Look.objects.filter(pk=look_id).update(save_count=people)
        except (ValueError, Exception):  # a non-UUID ref can't be a look
            continue


@extend_schema_view(get=extend_schema(responses=CollectionItemResponseSerializer(many=True)), post=extend_schema(request=CollectionItemRequestSerializer, responses={200: CollectionItemResponseSerializer, 201: CollectionItemResponseSerializer}))
class CollectionItemsView(APIView):
    """GET / POST /api/collections/:id/items/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        collection = _collection(request, pk)
        if collection is None:
            return _gone()
        if collection.follows is not None:
            items = shown_items(collection.follows.items.order_by("-created_at"), request.user)
        else:
            items = collection.items.order_by("-created_at")
        return Response([present_item(i) for i in items])

    def post(self, request, pk):
        collection = _collection(request, pk)
        if collection is None:
            return _gone()
        if collection.follows_id:
            return Response({"message": NOT_HERS}, status=403)
        kind = request.data.get("kind")
        ref_id = str(request.data.get("ref_id") or "").strip()[:64]
        if kind not in ("look", "content") or not ref_id:
            return Response({"message": "Nothing to save"}, status=400)
        try:
            ref_id = str(uuid.UUID(ref_id))
        except ValueError:
            return Response({"message": "That’s gone"}, status=404)

        existing = collection.items.filter(kind=kind, ref_id=ref_id).first()
        if existing:
            return Response(present_item(existing), status=200)

        # The server reads the picture and title off the look or article itself, so a
        # shared collection only ever shows what's really there.
        if kind == "look":
            look = public_looks().select_related("author").filter(pk=ref_id).first()
            hidden = look is not None and (
                (look.visibility == "private" and look.author_id != request.user.pk)
                or look.status == "removed"
                or (look.status == "hidden" and look.author_id != request.user.pk)
                or is_blocked(request.user, look.author)
            )
            if look is None or hidden:
                return Response({"message": "That look is gone"}, status=404)
            photo, thumb = look.photo_uri, look.thumb_uri
            title = look.caption or look.service_name
        else:
            from apps.content.models import ContentItem

            article = ContentItem.objects.filter(pk=ref_id, published=True).first()
            if article is None:
                return Response({"message": "That article is gone"}, status=404)
            photo, thumb, title = article.cover_uri, "", article.title

        with transaction.atomic():
            item = CollectionItem.objects.create(
                collection=collection,
                kind=kind,
                ref_id=ref_id,
                photo_uri=photo,
                thumb_uri=thumb,
                title=(title or "")[:150],
            )
            collection.touch()
            if kind == "look":
                _refresh_save_counts([ref_id])
        return Response(present_item(item), status=201)


@extend_schema_view(delete=extend_schema(responses={204: None}))
class CollectionItemDeleteView(APIView):
    """DELETE /api/collections/:id/items/:item_id/"""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk, item_id):
        item = CollectionItem.objects.filter(
            pk=item_id, collection_id=pk, collection__user=request.user
        ).first()
        if item is None:
            return Response({"message": "That’s no longer in it"}, status=404)
        with transaction.atomic():
            item.delete()
            Collection(pk=pk).touch()
            if item.kind == "look":
                _refresh_save_counts([item.ref_id])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Care plans ───────────────────────────────────────


def present_plan(plan):
    """Her own, or one she tags along with: the author's name and steps, her schedule."""
    source = plan.follows
    shown = source or plan
    out = {
        "id": str(plan.pk),
        "name": shown.name,
        "frequency": plan.frequency,
        "specific_days": plan.specific_days if plan.frequency == "specific-days" else None,
        "time_of_day": plan.time_of_day,
        "reminders_on": plan.reminders_on,
        "steps": [{"id": str(s.pk), "text": s.text} for s in shown.steps.all()],
        "last_done_at": plan.last_done_at,
        "created_at": plan.created_at,
        **_share_fields(plan, "care-plan"),
    }
    if source is not None:
        out["following"] = _following(source)
    return out


def _plan_fields(data, partial):
    """Validated plan fields from a draft, or (None, message)."""
    out = {}
    if "name" in data or not partial:
        name = str(data.get("name") or "").strip()[:150]
        if not name:
            return None, "Give it a name"
        out["name"] = name
    schedule, error = _schedule(data, partial)
    if error:
        return None, error
    out.update(schedule)
    steps = None
    if "steps" in data or not partial:
        raw = data.get("steps") or []
        if not isinstance(raw, list):
            return None, "Add at least one step"
        steps = [str(s).strip()[:255] for s in raw if str(s).strip()][:MAX_STEPS]
        if not steps:
            return None, "Add at least one step"
    return (out, steps), None


MAX_STEPS = 30


def _schedule(data, partial):
    """Her rhythm: how often, which days, when in the day, and reminders."""
    out = {}
    if "frequency" in data or not partial:
        if data.get("frequency") not in FREQUENCIES:
            return None, "Say how often"
        out["frequency"] = data["frequency"]
    if "time_of_day" in data or not partial:
        if data.get("time_of_day") not in TIMES_OF_DAY:
            return None, "Say when in the day"
        out["time_of_day"] = data["time_of_day"]
    if "specific_days" in data:
        days = data.get("specific_days") or []
        if not isinstance(days, list) or any(not isinstance(d, int) or d not in range(7) for d in days):
            return None, "Pick the days of the week"
        out["specific_days"] = sorted(set(days))
    if "reminders_on" in data:
        out["reminders_on"] = bool(data["reminders_on"])
    if out.get("frequency") == "specific-days" and not (
        out.get("specific_days") or (partial and "specific_days" not in data)
    ):
        return None, "Pick the days of the week"
    return out, None


def _plans():
    return CarePlan.objects.select_related("follows__user", "based_on").prefetch_related(
        "steps", "follows__steps"
    )


def _plan(request, pk):
    plan = _plans().filter(pk=pk, user=request.user).first()
    if plan is not None and plan.follows is not None and is_blocked(request.user, plan.follows.user):
        return None
    return plan


def _plan_gone():
    return Response({"message": "That plan is gone"}, status=404)


@extend_schema_view(get=extend_schema(responses=CarePlanResponseSerializer(many=True)), post=extend_schema(request=CarePlanRequestSerializer, responses={201: CarePlanResponseSerializer}))
class CarePlanListCreateView(APIView):
    """GET / POST /api/care-plans/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        plans = (
            _counted(_plans().filter(user=request.user))
            .exclude(follows__user_id__in=blocked_account_ids(request.user))
            .order_by("-created_at")
        )
        return Response([present_plan(p) for p in plans])

    def post(self, request):
        parsed, error = _plan_fields(request.data, partial=False)
        if error:
            return Response({"message": error}, status=400)
        fields, steps = parsed
        if CarePlan.objects.filter(user=request.user, follows__isnull=True, name__iexact=fields["name"]).exists():
            return Response({"message": "You already have a plan called that"}, status=409)
        with transaction.atomic():
            plan = CarePlan.objects.create(user=request.user, **fields)
            CarePlanStep.objects.bulk_create(
                [CarePlanStep(plan=plan, text=t, sort_order=i) for i, t in enumerate(steps)]
            )
        return Response(present_plan(plan), status=201)


@extend_schema_view(get=extend_schema(responses=CarePlanResponseSerializer), patch=extend_schema(request=CarePlanRequestSerializer(partial=True), responses=CarePlanResponseSerializer), delete=extend_schema(responses={204: None}))
class CarePlanDetailView(APIView):
    """GET / PATCH / DELETE /api/care-plans/:id/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        plan = _plan(request, pk)
        return Response(present_plan(plan)) if plan else _plan_gone()

    def patch(self, request, pk):
        plan = _plan(request, pk)
        if plan is None:
            return _plan_gone()
        if plan.follows_id:
            # Her schedule is hers on one she tags along with; the name and steps aren't.
            if "name" in request.data or "steps" in request.data:
                return Response({"message": NOT_HERS}, status=403)
            fields, error = _schedule(request.data, partial=True)
            steps = None
        else:
            parsed, error = _plan_fields(request.data, partial=True)
            fields, steps = parsed if parsed else (None, None)
        if error:
            return Response({"message": error}, status=400)
        if "name" in fields and (
            CarePlan.objects.filter(user=request.user, follows__isnull=True, name__iexact=fields["name"])
            .exclude(pk=plan.pk)
            .exists()
        ):
            return Response({"message": "You already have a plan called that"}, status=409)
        with transaction.atomic():
            # What others see changed: the name or the steps.
            if steps is not None or fields.get("name", plan.name) != plan.name:
                plan.changed_at = timezone.now()
            for key, value in fields.items():
                setattr(plan, key, value)
            plan.save()
            if steps is not None:
                plan.steps.all().delete()
                CarePlanStep.objects.bulk_create(
                    [CarePlanStep(plan=plan, text=t, sort_order=i) for i, t in enumerate(steps)]
                )
        return Response(present_plan(_plan(request, pk)))

    def delete(self, request, pk):
        # Hers, or leaving one she tags along with. Everyone tagging along with hers
        # loses it with her.
        CarePlan.objects.filter(pk=pk, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def present_session(s):
    return {"id": str(s.pk), "completed_at": s.completed_at, "notes": s.notes}


@extend_schema_view(get=extend_schema(responses=CarePlanSessionResponseSerializer(many=True)), post=extend_schema(request=CarePlanSessionRequestSerializer, responses={201: CarePlanSessionResponseSerializer}))
class CarePlanSessionView(APIView):
    """GET / POST /api/care-plans/:id/sessions/ — appended, never edited."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        plan = _plan(request, pk)
        if plan is None:
            return _plan_gone()
        return Response(
            [present_session(s) for s in plan.sessions.order_by("-completed_at")]
        )

    def post(self, request, pk):
        plan = _plan(request, pk)
        if plan is None:
            return _plan_gone()
        now = timezone.now()
        weekday, hour = local_parts(request.data.get("local_at") or "")
        with transaction.atomic():
            session = CarePlanSession.objects.create(
                plan=plan,
                user=request.user,
                completed_at=now,
                notes=str(request.data.get("notes") or "").strip()[:1000],
                local_at=str(request.data.get("local_at") or "")[:40],
                local_weekday=weekday,
                local_hour=hour,
            )
            plan.last_done_at = now
            plan.save(update_fields=["last_done_at", "updated_at"])
        return Response(present_session(session), status=201)


# ── Sharing ──────────────────────────────────────────
#
# A link carries only a random code. Whoever opens it gets the shared view, filtered for
# them; tagging along keeps a row of her own that reads the source; "Make it yours" copies
# it. See docs/SHARING_PLAN.md.


def _shared(model, request, code):
    """The shared one a code points at, unless either of them has blocked the other."""
    row = find_shared(model, code)
    if row is None or (request.user.is_authenticated and is_blocked(request.user, row.user)):
        return None
    return row


def _not_shared():
    return Response({"message": NOT_SHARED}, status=404)


def _needs_username(request):
    if not request.user.username:
        return Response(
            {"message": "Choose a username first, so people see that and not your email", "code": "username_required"},
            status=400,
        )
    return None


def _share_view(model, present):
    @extend_schema_view(
        post=extend_schema(request=None, responses=CarePlanResponseSerializer if model is CarePlan else CollectionResponseSerializer),
        delete=extend_schema(responses=CarePlanResponseSerializer if model is CarePlan else CollectionResponseSerializer),
    )
    class ShareView(APIView):
        """POST to share by link; DELETE to stop (the link stops working at once)."""

        permission_classes = [permissions.IsAuthenticated]
        throttle_classes = [SharingThrottle]

        def post(self, request, pk):
            row = model.objects.filter(pk=pk, user=request.user).first()
            if row is None:
                return Response({"message": "That’s gone"}, status=404)
            if row.follows_id:
                return Response({"message": "Only its author can share it"}, status=403)
            if row.share_blocked:
                return Response(
                    {"message": "We stopped this being shared because it broke our community guidelines"},
                    status=403,
                )
            needs = _needs_username(request)
            if needs:
                return needs
            row.share()
            return Response(present(_counted(model.objects.filter(pk=row.pk)).first()))

        def delete(self, request, pk):
            row = model.objects.filter(pk=pk, user=request.user, follows__isnull=True).first()
            if row is None:
                return Response({"message": "That’s gone"}, status=404)
            with transaction.atomic():
                row.stop_sharing()
            return Response(present(_counted(model.objects.filter(pk=row.pk)).first()))

    ShareView.__name__ = f"{model.__name__}ShareView"
    return ShareView


CollectionShareView = _share_view(Collection, present_collection)
CarePlanShareView = _share_view(CarePlan, present_plan)


def find_shared(model, code):
    """What a link's code points at, while it's shared and its author's account is open."""
    if not code:
        return None
    return model.objects.select_related("user").filter(share_code=code, follows__isnull=True, user__is_active=True).first()


def shared_collection_data(source, viewer):
    """A shared collection as `viewer` (None when signed out) may see it. Also the website's page."""
    items = shown_items(source.items.order_by("-created_at"), viewer)
    return {
        "code": source.share_code,
        "name": source.name,
        "author": present_author(source.user),
        "item_count": len(items),
        "updated_at": source.changed_at,
        "preview_uris": [i.thumb_uri or i.photo_uri for i in items if i.photo_uri][:PREVIEWS],
        "items": [present_item(i) for i in items],
    }


def shared_plan_data(source):
    """A shared care plan: its steps and the author's rhythm, nothing of her own record."""
    return {
        "code": source.share_code,
        "name": source.name,
        "author": present_author(source.user),
        "frequency": source.frequency,
        "specific_days": source.specific_days if source.frequency == "specific-days" else None,
        "time_of_day": source.time_of_day,
        "steps": [{"id": str(s.pk), "text": s.text} for s in source.steps.all()],
        "updated_at": source.changed_at,
    }


def _theirs(model, request, source):
    """Her own (she sees hers instead), and the one she tags along with, if any."""
    if not request.user.is_authenticated:
        return None, None
    own = str(source.pk) if source.user_id == request.user.pk else None
    following = model.objects.filter(user=request.user, follows=source).values_list("pk", flat=True).first()
    return own, str(following) if following else None


@extend_schema_view(get=extend_schema(responses=SharedCollectionResponseSerializer))
class SharedCollectionView(APIView):
    """GET /api/shared/collections/:code/ — what anyone with the link sees."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [SharedViewThrottle]

    def get(self, request, code):
        source = _shared(Collection, request, code)
        if source is None:
            return _not_shared()
        own, following = _theirs(Collection, request, source)
        viewer = request.user if request.user.is_authenticated else None
        return Response({**shared_collection_data(source, viewer), "own_id": own, "following_id": following})


@extend_schema_view(get=extend_schema(responses=SharedCarePlanResponseSerializer))
class SharedCarePlanView(APIView):
    """GET /api/shared/care-plans/:code/ — the steps and the author's rhythm."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [SharedViewThrottle]

    def get(self, request, code):
        source = _shared(CarePlan, request, code)
        if source is None:
            return _not_shared()
        own, following = _theirs(CarePlan, request, source)
        return Response({**shared_plan_data(source), "own_id": own, "following_id": following})


@extend_schema_view(post=extend_schema(request=None, responses={200: CollectionResponseSerializer, 201: CollectionResponseSerializer}))
class TagAlongCollectionView(APIView):
    """POST /api/shared/collections/:code/follow/ — it joins her Planner, kept up to date."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [SharingThrottle]

    def post(self, request, code):
        source = _shared(Collection, request, code)
        if source is None:
            return _not_shared()
        if source.user_id == request.user.pk:
            return Response({"message": "It’s already yours"}, status=400)
        try:
            with transaction.atomic():
                row, created = Collection.objects.get_or_create(user=request.user, follows=source)
        except IntegrityError:  # two taps at once
            row, created = Collection.objects.get(user=request.user, follows=source), False
        row = _collection(request, row.pk)
        return Response(present_collection(row, request.user), status=201 if created else 200)


@extend_schema_view(post=extend_schema(request=CarePlanScheduleRequestSerializer, responses={200: CarePlanResponseSerializer, 201: CarePlanResponseSerializer}))
class TagAlongCarePlanView(APIView):
    """POST /api/shared/care-plans/:code/follow/ — the author's steps, on her own schedule."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [SharingThrottle]

    def post(self, request, code):
        source = _shared(CarePlan, request, code)
        if source is None:
            return _not_shared()
        if source.user_id == request.user.pk:
            return Response({"message": "It’s already yours"}, status=400)
        existing = CarePlan.objects.filter(user=request.user, follows=source).first()
        if existing:
            return Response(present_plan(_plan(request, existing.pk)), status=200)
        # Starting from the author's rhythm, with whatever she changed.
        data = {
            "frequency": source.frequency,
            "time_of_day": source.time_of_day,
            "specific_days": source.specific_days,
            **{k: v for k, v in request.data.items() if k in ("frequency", "time_of_day", "specific_days", "reminders_on")},
        }
        schedule, error = _schedule(data, partial=False)
        if error:
            return Response({"message": error}, status=400)
        try:
            with transaction.atomic():
                plan = CarePlan.objects.create(user=request.user, follows=source, **schedule)
        except IntegrityError:
            plan = CarePlan.objects.get(user=request.user, follows=source)
        return Response(present_plan(_plan(request, plan.pk)), status=201)


def _copy_collection(user, source, name, viewer_items):
    copy = Collection.objects.create(
        user=user,
        name=_free_name(Collection, user, name or source.name),
        based_on=source,
        based_on_name=source.name,
        based_on_author=source.user.name,
    )
    CollectionItem.objects.bulk_create(
        [
            CollectionItem(
                collection=copy, kind=i.kind, ref_id=i.ref_id, photo_uri=i.photo_uri,
                thumb_uri=i.thumb_uri, title=i.title,
            )
            for i in viewer_items
        ]
    )
    _refresh_save_counts([i.ref_id for i in viewer_items if i.kind == "look"])
    return copy


def _copy_steps(plan, source):
    CarePlanStep.objects.bulk_create(
        [CarePlanStep(plan=plan, text=s.text, sort_order=i) for i, s in enumerate(source.steps.all())]
    )


@extend_schema_view(post=extend_schema(request=MakeMineRequestSerializer, responses={201: CollectionResponseSerializer}))
class MakeSharedCollectionMineView(APIView):
    """POST /api/shared/collections/:code/make-mine/ — her own version to change."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [SharingThrottle]

    def post(self, request, code):
        source = _shared(Collection, request, code)
        if source is None:
            return _not_shared()
        if source.user_id == request.user.pk:
            return Response({"message": "It’s already yours"}, status=400)
        name = str(request.data.get("name") or "").strip()[:150]
        with transaction.atomic():
            copy = _copy_collection(
                request.user, source, name, shown_items(source.items.order_by("created_at"), request.user)
            )
        return Response(present_collection(_collection(request, copy.pk)), status=201)


@extend_schema_view(post=extend_schema(request=MakeMineRequestSerializer, responses={201: CollectionResponseSerializer}))
class MakeCollectionMineView(APIView):
    """POST /api/collections/:id/make-mine/ — one she tags along with becomes hers, in place."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [SharingThrottle]

    def post(self, request, pk):
        row = _collection(request, pk)
        if row is None:
            return _gone()
        source = row.follows
        if source is None:
            return Response({"message": "This one is already yours"}, status=400)
        name = str(request.data.get("name") or "").strip()[:150]
        with transaction.atomic():
            copy = _copy_collection(
                request.user, source, name, shown_items(source.items.order_by("created_at"), request.user)
            )
            row.delete()
        return Response(present_collection(_collection(request, copy.pk)), status=201)


@extend_schema_view(post=extend_schema(request=MakeMineRequestSerializer, responses={201: CarePlanResponseSerializer}))
class MakeSharedCarePlanMineView(APIView):
    """POST /api/shared/care-plans/:code/make-mine/ — the steps become hers to change."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [SharingThrottle]

    def post(self, request, code):
        source = _shared(CarePlan, request, code)
        if source is None:
            return _not_shared()
        if source.user_id == request.user.pk:
            return Response({"message": "It’s already yours"}, status=400)
        name = str(request.data.get("name") or "").strip()[:150]
        with transaction.atomic():
            plan = CarePlan.objects.create(
                user=request.user,
                name=_free_name(CarePlan, request.user, name or source.name),
                frequency=source.frequency,
                specific_days=source.specific_days,
                time_of_day=source.time_of_day,
                based_on=source,
                based_on_name=source.name,
                based_on_author=source.user.name,
            )
            _copy_steps(plan, source)
        return Response(present_plan(_plan(request, plan.pk)), status=201)


@extend_schema_view(post=extend_schema(request=MakeMineRequestSerializer, responses={201: CarePlanResponseSerializer}))
class MakeCarePlanMineView(APIView):
    """
    POST /api/care-plans/:id/make-mine/ — one she tags along with becomes hers, in place:
    her schedule, reminders and history stay, and the steps become hers to change.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [SharingThrottle]

    def post(self, request, pk):
        plan = _plan(request, pk)
        if plan is None:
            return _plan_gone()
        source = plan.follows
        if source is None:
            return Response({"message": "This one is already yours"}, status=400)
        name = str(request.data.get("name") or "").strip()[:150]
        with transaction.atomic():
            plan.name = _free_name(CarePlan, request.user, name or source.name)
            plan.follows = None
            plan.based_on = source
            plan.based_on_name = source.name
            plan.based_on_author = source.user.name
            plan.changed_at = timezone.now()
            plan.save()
            _copy_steps(plan, source)
        return Response(present_plan(_plan(request, plan.pk)), status=201)


def _report_view(model):
    @extend_schema_view(post=extend_schema(request=ReportRequestSerializer, responses={201: None}))
    class ReportView(APIView):
        """Into moderation, never to the author. Staff can stop it being shared."""

        permission_classes = [permissions.IsAuthenticated]
        throttle_classes = [ReportThrottle]

        def post(self, request, code):
            from apps.looks.serializers import LOOK_REPORT_REASONS
            from apps.looks.views import _report

            source = _shared(model, request, code)
            if source is None:
                return _not_shared()
            return _report(request, model, source.pk, LOOK_REPORT_REASONS)

    ReportView.__name__ = f"Shared{model.__name__}ReportView"
    return ReportView


SharedCollectionReportView = _report_view(Collection)
SharedCarePlanReportView = _report_view(CarePlan)
