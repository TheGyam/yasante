"""
Planner: collections (what she's saving) and care plans (how she looks after it).
"""

import logging

from apps.common.timeparse import local_parts
from apps.looks.models import Look
from django.db import transaction
from django.db.models import Count, Prefetch
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CarePlan, CarePlanSession, CarePlanStep, Collection, CollectionItem
from .serializers import (
    CarePlanRequestSerializer,
    CarePlanResponseSerializer,
    CarePlanSessionRequestSerializer,
    CarePlanSessionResponseSerializer,
    CollectionItemRequestSerializer,
    CollectionItemResponseSerializer,
    CollectionRequestSerializer,
    CollectionResponseSerializer,
)

logger = logging.getLogger(__name__)

FREQUENCIES = ("daily", "every-2-days", "weekly", "specific-days")
TIMES_OF_DAY = ("morning", "afternoon", "evening", "night")


# ── Collections ──────────────────────────────────────


PREVIEWS = 4


def _with_photos():
    return CollectionItem.objects.exclude(photo_uri="").order_by("-created_at")


def present_collection(c):
    # The newest few pictures, for the stacked card; prefetched when listing.
    photos = getattr(c, "with_photos", None)
    photos = photos[:PREVIEWS] if photos is not None else list(_with_photos().filter(collection=c)[:PREVIEWS])
    cover = photos[0] if photos else None
    return {
        "id": str(c.pk),
        "name": c.name,
        "is_private": c.is_private,
        "created_at": c.created_at,
        "item_count": c.item_total if hasattr(c, "item_total") else c.items.count(),
        "cover_uri": (cover.thumb_uri or cover.photo_uri) if cover else None,
        "preview_uris": [p.thumb_uri or p.photo_uri for p in photos],
    }


def present_item(i):
    return {
        "id": str(i.pk),
        "kind": i.kind,
        "ref_id": i.ref_id,
        "image_uri": i.photo_uri or None,
        "title": i.title or None,
        "added_at": i.created_at,
    }


def _collection(request, pk):
    return Collection.objects.filter(pk=pk, user=request.user).first()


def _gone():
    return Response({"message": "That collection is gone"}, status=404)


@extend_schema_view(get=extend_schema(responses=CollectionResponseSerializer(many=True)), post=extend_schema(request=CollectionRequestSerializer, responses={201: CollectionResponseSerializer}))
class CollectionListCreateView(APIView):
    """GET / POST /api/collections/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        collections = (
            Collection.objects.filter(user=request.user)
            .annotate(item_total=Count("items"))
            # ponytail: fetches every pictured item per collection; slice in SQL if
            # collections grow to hundreds of items.
            .prefetch_related(Prefetch("items", queryset=_with_photos(), to_attr="with_photos"))
            .order_by("-created_at")
        )
        return Response([present_collection(c) for c in collections])

    def post(self, request):
        name = str(request.data.get("name") or "").strip()[:150]
        if not name:
            return Response({"message": "Give it a name"}, status=400)
        if Collection.objects.filter(user=request.user, name__iexact=name).exists():
            return Response({"message": "You already have a collection called that"}, status=409)
        collection = Collection.objects.create(
            user=request.user,
            name=name,
            # Private by default.
            is_private=request.data.get("is_private", True) is not False,
        )
        return Response(present_collection(collection), status=201)


@extend_schema_view(get=extend_schema(responses=CollectionResponseSerializer), patch=extend_schema(request=CollectionRequestSerializer(partial=True), responses=CollectionResponseSerializer), delete=extend_schema(responses={204: None}))
class CollectionDetailView(APIView):
    """GET / PATCH / DELETE /api/collections/:id/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        collection = _collection(request, pk)
        return Response(present_collection(collection)) if collection else _gone()

    def patch(self, request, pk):
        collection = _collection(request, pk)
        if collection is None:
            return _gone()
        if "name" in request.data:
            name = str(request.data.get("name") or "").strip()[:150]
            if not name:
                return Response({"message": "Give it a name"}, status=400)
            clash = (
                Collection.objects.filter(user=request.user, name__iexact=name)
                .exclude(pk=collection.pk)
                .exists()
            )
            if clash:
                return Response(
                    {"message": "You already have a collection called that"}, status=409
                )
            collection.name = name
        if "is_private" in request.data:
            collection.is_private = bool(request.data["is_private"])
        collection.save()
        return Response(present_collection(collection))

    def delete(self, request, pk):
        collection = _collection(request, pk)
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
        return Response(
            [present_item(i) for i in collection.items.order_by("-created_at")]
        )

    def post(self, request, pk):
        collection = _collection(request, pk)
        if collection is None:
            return _gone()
        kind = request.data.get("kind")
        ref_id = str(request.data.get("ref_id") or "").strip()[:64]
        if kind not in ("look", "content") or not ref_id:
            return Response({"message": "Nothing to save"}, status=400)

        existing = collection.items.filter(kind=kind, ref_id=ref_id).first()
        if existing:
            return Response(present_item(existing), status=200)

        if kind == "look":
            # The server reads the picture and caption off the look itself.
            from apps.common.blocks import is_blocked

            try:
                look = Look.objects.select_related("author").filter(pk=ref_id).first()
            except Exception:
                look = None
            hidden = look is not None and (
                (look.visibility == "private" and look.author_id != request.user.pk)
                or is_blocked(request.user, look.author)
            )
            if look is None or hidden:
                return Response({"message": "That look is gone"}, status=404)
            photo, thumb = look.photo_uri, look.thumb_uri
            title = look.caption or look.service_name
        else:
            # Library articles live elsewhere; the app sends what it has on screen.
            photo, thumb = str(request.data.get("image_uri") or "")[:500], ""
            title = str(request.data.get("title") or "")[:150]

        with transaction.atomic():
            item = CollectionItem.objects.create(
                collection=collection,
                kind=kind,
                ref_id=ref_id,
                photo_uri=photo,
                thumb_uri=thumb,
                title=title or "",
            )
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
            if item.kind == "look":
                _refresh_save_counts([item.ref_id])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Care plans ───────────────────────────────────────


def present_plan(plan):
    return {
        "id": str(plan.pk),
        "name": plan.name,
        "frequency": plan.frequency,
        "specific_days": plan.specific_days if plan.frequency == "specific-days" else None,
        "time_of_day": plan.time_of_day,
        "reminders_on": plan.reminders_on,
        "steps": [{"id": str(s.pk), "text": s.text} for s in plan.steps.all()],
        "last_done_at": plan.last_done_at,
        "created_at": plan.created_at,
    }


def _plan_fields(data, partial):
    """Validated plan fields from a draft, or (None, message)."""
    out = {}
    if "name" in data or not partial:
        name = str(data.get("name") or "").strip()[:150]
        if not name:
            return None, "Give it a name"
        out["name"] = name
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
        if not isinstance(days, list) or any(d not in range(7) for d in days):
            return None, "Pick the days of the week"
        out["specific_days"] = sorted(set(days))
    if "reminders_on" in data:
        out["reminders_on"] = bool(data["reminders_on"])
    if out.get("frequency") == "specific-days" and not (
        out.get("specific_days") or (partial and "specific_days" not in data)
    ):
        return None, "Pick the days of the week"
    steps = None
    if "steps" in data or not partial:
        raw = data.get("steps") or []
        steps = [str(s).strip()[:255] for s in raw if str(s).strip()]
        if not steps:
            return None, "Add at least one step"
    return (out, steps), None


def _plan(request, pk):
    return CarePlan.objects.filter(pk=pk, user=request.user).first()


@extend_schema_view(get=extend_schema(responses=CarePlanResponseSerializer(many=True)), post=extend_schema(request=CarePlanRequestSerializer, responses={201: CarePlanResponseSerializer}))
class CarePlanListCreateView(APIView):
    """GET / POST /api/care-plans/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        plans = CarePlan.objects.filter(user=request.user).prefetch_related("steps").order_by(
            "-created_at"
        )
        return Response([present_plan(p) for p in plans])

    def post(self, request):
        parsed, error = _plan_fields(request.data, partial=False)
        if error:
            return Response({"message": error}, status=400)
        fields, steps = parsed
        if CarePlan.objects.filter(user=request.user, name=fields["name"]).exists():
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
        if plan is None:
            return Response({"message": "That plan is gone"}, status=404)
        return Response(present_plan(plan))

    def patch(self, request, pk):
        plan = _plan(request, pk)
        if plan is None:
            return Response({"message": "That plan is gone"}, status=404)
        parsed, error = _plan_fields(request.data, partial=True)
        if error:
            return Response({"message": error}, status=400)
        fields, steps = parsed
        if "name" in fields and (
            CarePlan.objects.filter(user=request.user, name=fields["name"])
            .exclude(pk=plan.pk)
            .exists()
        ):
            return Response({"message": "You already have a plan called that"}, status=409)
        with transaction.atomic():
            for key, value in fields.items():
                setattr(plan, key, value)
            plan.save()
            if steps is not None:
                plan.steps.all().delete()
                CarePlanStep.objects.bulk_create(
                    [CarePlanStep(plan=plan, text=t, sort_order=i) for i, t in enumerate(steps)]
                )
        return Response(present_plan(plan))

    def delete(self, request, pk):
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
            return Response({"message": "That plan is gone"}, status=404)
        return Response(
            [present_session(s) for s in plan.sessions.order_by("-completed_at")]
        )

    def post(self, request, pk):
        plan = _plan(request, pk)
        if plan is None:
            return Response({"message": "That plan is gone"}, status=404)
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
