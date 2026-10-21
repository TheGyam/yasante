"""
Looks: the feed, a look, posting, likes, threaded comments, reports and blocks.

Public reads: anyone can read the feed, a look and its comments. Signing in adds
likes, saves, blocks and her own. Blocking runs both ways.
"""

import logging
import secrets
import uuid
from datetime import datetime, timedelta

from apps.bookings.models import Booking
from apps.common.blocks import blocked_account_ids, is_blocked
from apps.common.models import log_search
from apps.common.pagination import keyset_page, page_limit
from apps.common.people import person
from apps.common.permissions import IsAuthenticatedOrReadOnly
from apps.common.throttling import CommentThrottle, PostingThrottle, ReportThrottle
from apps.common.uploads import media_url, own_media
from apps.feed.models import SWITCH as FEED_SWITCH
from apps.feed.sessions import is_ranked_cursor, ranked_page
from apps.features.switches import is_on
from apps.shelf.models import Product
from apps.stylists.models import StylistProfile
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError, transaction
from django.db.models import (
    Case,
    DurationField,
    Exists,
    ExpressionWrapper,
    F,
    FloatField,
    OuterRef,
    Prefetch,
    Q,
    Value,
    When,
)
from django.db.models.functions import Cast, Extract, Greatest, Power
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import serializers, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Appeal,
    Block,
    CommentLike,
    Look,
    LookComment,
    LookLike,
    LookPhoto,
    ModerationAction,
    NotForMe,
    Report,
    Style,
    not_for_me,
)
from .serializers import (
    AppealRequestSerializer,
    BlockRequestSerializer,
    NotForMeRequestSerializer,
    CommentCreateRequestSerializer,
    LookCreateRequestSerializer,
    ReportRequestSerializer,
    BlockSerializer,
    CommentSerializer,
    CommentsPageSerializer,
    LookSerializer,
    LooksPageSerializer,
    StyleSerializer,
    AppealResponseSerializer,
    COMMENT_REPORT_REASONS,
    MyModerationSerializer,
    MyReportSerializer,
    LOOK_REPORT_REASONS,
    REPORT_REASONS,
    comment_queryset,
    present_comments,
    present_looks,
    with_viewer_flags,
)

logger = logging.getLogger(__name__)

GONE = {"message": "That look is gone"}


def _viewer(request):
    return request.user if request.user.is_authenticated else None


def public_looks(queryset=None):
    """Keep work on draft Featured pages out of every public look lookup."""
    queryset = Look.objects.all() if queryset is None else queryset
    return queryset.exclude(author_id__in=StylistProfile.objects.filter(
        featured=True, published=False,
    ).values("account_id"))


def _looks(viewer):
    return with_viewer_flags(
        public_looks().prefetch_related(
            "styles", "products", Prefetch("photos", queryset=LookPhoto.objects.order_by("position"))
        ), viewer
    )


def _visible_look(pk, viewer):
    """The look, or None when it's private (and not hers), blocked, or missing."""
    look = public_looks().filter(pk=pk).first()
    if look is None:
        return None
    if look.visibility == "private" and (viewer is None or viewer.pk != look.author_id):
        return None
    # Hidden stays hers to see (so she can appeal); removed is gone for everyone.
    if look.status == "removed" or (
        look.status == "hidden" and (viewer is None or viewer.pk != look.author_id)
    ):
        return None
    if viewer and look.author_id != viewer.pk and is_blocked(viewer, look.author):
        return None
    return look


def _not_found(message="That look is gone"):
    return Response({"message": message}, status=status.HTTP_404_NOT_FOUND)


def _is_uuid(value):
    try:
        uuid.UUID(str(value))
        return True
    except (TypeError, ValueError):
        return False


def _texture_to_match(viewer):
    """Her curl pattern, only while she lets us use her hair details."""
    from apps.profiles.models import HairProfile, has_consent

    if viewer is None or not has_consent(viewer, "personalisation"):
        return ""
    # Asked outright: a missing profile cached on the user would make the count vary.
    return HairProfile.objects.filter(user=viewer).values_list("texture", flat=True).first() or ""


# Where the second list starts in a cursor: everything after the looks for her hair.
REST = "rest."


def for_her_hair(texture):
    """
    Looks on hair like hers, and looks by stylists or with products seen on hair like
    hers in other public looks. Only what's been posted publicly says what goes together.
    """
    seen = Look.objects.filter(visibility="public", status="live", hair_texture=texture)
    with_products = Look.products.through.objects.filter(product_id__in=seen.values("products"))
    return (
        Q(hair_texture=texture)
        | Q(stylist_id__in=seen.exclude(stylist_id="").values("stylist_id"))
        | Q(pk__in=with_products.values("look_id"))
    )


def matched_first(qs, texture, request, cursor=None, limit=None):
    """
    Looks for her hair first, newest first, then everything else, newest first.
    The cursor says which list she's in, so nothing repeats or goes missing between
    them. The page where the first list ends can be short; the next one starts the rest.
    """
    if cursor is None:
        cursor = request.query_params.get("cursor") or ""
    if not cursor.startswith(REST):
        items, after = keyset_page(qs.filter(for_her_hair(texture)), request, cursor=cursor, limit=limit)
        if after or items:
            return items, after or REST
        cursor = REST
    items, after = keyset_page(qs.exclude(for_her_hair(texture)), request, cursor=cursor[len(REST):], limit=limit)
    return items, after and REST + after


# A mixed feed's cursor: where each of its two lists is up to, and a list that's run out.
MIX, DONE = "mix.", "-"
# About one look in this many is from styles she's searched for, while there are some.
MIX_EVERY = 4


def mixed_in(qs, texture, styles, request):
    """
    The feed with looks in styles she's searched for mixed through it, about one in
    MIX_EVERY, newest first, until they run out; everything else in its usual order.
    Each list keeps its own place in the cursor, so nothing repeats or goes missing.
    """
    limit = page_limit(request)
    cursor = request.query_params.get("cursor") or ""
    searched_at, usual_at = cursor[len(MIX):].split("~", 1) if cursor.startswith(MIX) else ("", "")
    searched = qs.filter(styles__slug__in=styles).distinct()
    usual = qs.exclude(styles__slug__in=styles)

    # Her share of the page, or all of it once the usual list has run out.
    share = limit if usual_at == DONE else limit // MIX_EVERY
    picks, searched_next = [], searched_at
    if searched_at != DONE and share:
        picks, searched_next = keyset_page(searched, request, cursor=searched_at, limit=share)
        searched_next = searched_next or DONE
    def usual_page(cursor, size):
        if texture:
            return matched_first(usual, texture, request, cursor=cursor, limit=size)
        return keyset_page(usual, request, cursor=cursor, limit=size)

    rest, usual_next = [], usual_at
    if usual_at != DONE and limit - len(picks):
        rest, usual_next = usual_page(usual_at, limit - len(picks))
        usual_next = usual_next or DONE

    # One of hers after every few of the rest, and whatever's left at the end.
    items, picks = [], list(picks)
    for i, look in enumerate(rest, 1):
        items.append(look)
        if i % (MIX_EVERY - 1) == 0 and picks:
            items.append(picks.pop(0))
    items += picks
    if searched_next == DONE and usual_next == DONE:
        return items, None
    return items, f"{MIX}{searched_next}~{usual_next}"


def everyday_looks(viewer, style=None, queryset=None):
    """
    The public, live looks she can be shown: nobody she's blocked, and nothing she's said
    isn't for her (a style she's asked for herself still shows). The ranked feed starts
    from the same set (apps.feed.ranking), so the two never disagree on what's allowed.
    """
    qs = (_looks(viewer) if queryset is None else queryset).filter(visibility="public", status="live")
    blocked = blocked_account_ids(viewer)
    if blocked:
        qs = qs.exclude(author_id__in=blocked)
    looks, stylists, styles = not_for_me(viewer)
    if looks:
        qs = qs.exclude(pk__in=looks)
    if stylists:
        qs = qs.exclude(author_id__in=stylists).exclude(stylist_id__in=[str(s) for s in stylists])
    if styles - {style}:
        qs = qs.exclude(styles__slug__in=styles - {style})
    return qs


class FeedView(APIView):
    """GET /api/looks/?cursor=&limit=&hair=&style=&area=&q= — also POST, to post a look."""

    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_throttles(self):
        return [PostingThrottle()] if self.request.method == "POST" else []

    @extend_schema(responses=LooksPageSerializer)
    def get(self, request):
        viewer = _viewer(request)
        style = request.query_params.get("style")
        qs = everyday_looks(viewer, style)
        params = request.query_params
        # Styles she's searched for, sent by her phone for this page only: never kept or
        # logged.
        searched = [s for s in (params.get("searched") or "").split(",") if s][:3]
        # "Latest": newest first, nothing personal. Otherwise, while the ranked feed is on
        # for her, the everyday feed (no filters, no search) is ranked (apps.feed).
        latest = params.get("order") == "latest"
        ranking = is_on(FEED_SWITCH, request.user)
        everyday = not any(params.get(k) for k in ("hair", "style", "area", "q"))
        if ranking and everyday and not latest and is_ranked_cursor(params.get("cursor")):
            return self.ranked(request, viewer, qs, searched)

        hair = request.query_params.get("hair")
        if hair:
            qs = qs.filter(hair_texture=hair)
        if style:
            qs = qs.filter(styles__slug=style)
        area = request.query_params.get("area")
        if area:
            qs = qs.filter(area=area)
        # Search: every word has to appear somewhere a person would look for it.
        for word in (request.query_params.get("q") or "").split()[:6]:
            qs = qs.filter(
                Q(caption__icontains=word)
                | Q(service_name__icontains=word)
                | Q(stylist_name__icontains=word)
                | Q(author__name__icontains=word)
                | Q(styles__name__icontains=word)
            ).distinct()

        # With her yes, looks for her hair come first, unless she's chosen a hair type.
        texture = "" if hair or latest else _texture_to_match(viewer)
        # Her searched styles mix in, but not when she's chosen a style or a hair type.
        if searched and not style and not hair and not latest:
            items, next_cursor = mixed_in(qs, texture, searched, request)
        elif texture:
            items, next_cursor = matched_first(qs, texture, request)
        else:
            items, next_cursor = keyset_page(qs, request)
        q = request.query_params.get("q", "")
        filters = {"hair": hair, "style": style, "area": area}
        # Log what people search or filter for, on the first page only (not every scroll).
        if (q or any(filters.values())) and not request.query_params.get("cursor"):
            log_search(request, "looks", q, filters, len(items))
        body = {"data": present_looks(items, viewer), "next_cursor": next_cursor}
        # While the ranked feed is on for her, the first page starts a feed session that
        # the app records what she sees and opens against (apps.feed).
        if not request.query_params.get("cursor") and ranking:
            body["session"] = secrets.token_urlsafe(12)
        return Response(body)

    def ranked(self, request, viewer, allowed, searched):
        pairs, next_cursor, session = ranked_page(viewer, searched, request.query_params.get("cursor"), page_limit(request))
        # Checked again now: anything blocked, removed or hidden since it was ranked stays out.
        found = {str(look.pk): look for look in allowed.filter(pk__in=[pk for pk, _ in pairs])}
        shown = [(found[pk], source) for pk, source in pairs if pk in found]
        data = present_looks([look for look, _ in shown], viewer)
        for item, (_, source) in zip(data, shown):
            item["source"] = source
        return Response({"data": data, "next_cursor": next_cursor, "session": session})

    @extend_schema(request=LookCreateRequestSerializer, responses={201: LookSerializer})
    def post(self, request):
        return create_look(request)


def create_look(request):
    """
    Posting a look. Who did it is never typed in: a client credits her stylist
    through her own completed booking, a stylist's own post credits herself.
    """
    user = request.user
    body = request.data
    uris = body.get("photo_uris", [body.get("photo_uri")] if body.get("photo_uri") else [])
    if not isinstance(uris, list) or not uris:
        return Response({"message": "A look needs a photo"}, status=400)
    if len(uris) > 1 and not is_on("multi_photo_looks", user):
        return Response(
            {"message": "Posting several photos in one look isn't open yet"}, status=400
        )
    if len(uris) > 5:
        return Response({"message": "Up to 5 photos in a look"}, status=400)
    photos = []
    for uri in uris:
        photo = own_media(user, uri) if isinstance(uri, str) else None
        if photo is None:
            return Response({"message": "That photo isn't one of yours"}, status=400)
        if any(other.pk == photo.pk for other in photos):
            return Response({"message": "That photo is in this look twice"}, status=400)
        photos.append(photo)
    photo = photos[0]

    wanted = body.get("styles") if isinstance(body.get("styles"), list) else []
    styles = list(Style.objects.filter(slug__in=[str(s) for s in wanted][:3]))
    if not styles:
        return Response({"message": "Tag the style"}, status=400)

    stylist_profile = None
    service = None
    booking_id = body.get("booking_id")
    if booking_id:
        booking = (
            Booking.objects.filter(pk=booking_id, client=user, status="completed").first()
            if _is_uuid(booking_id)
            else None
        )
        if booking is None:
            return Response(
                {"message": "You can tag a stylist from a completed booking"}, status=400
            )
        stylist_profile = booking.stylist_profile
        if stylist_profile:
            service = stylist_profile.menu_items.filter(pk=booking.service_id).first()
    else:
        own = StylistProfile.objects.filter(account=user, published=True).first()
        if own:
            stylist_profile = own
            service_id = body.get("service_id")
            if service_id and _is_uuid(service_id):
                service = own.menu_items.filter(pk=service_id).first()

    product_ids = [p for p in (body.get("product_ids") or []) if _is_uuid(p)]
    products = list(Product.objects.filter(pk__in=product_ids)[:5])

    with transaction.atomic():
        look = Look.objects.create(
            author=user,
            # Every size from the upload itself, never from what was sent.
            photo_uri=media_url(request, photo, photo.full_path),
            thumb_uri=media_url(request, photo, photo.thumb_path) if photo.thumb_path else "",
            feed_uri=media_url(request, photo, photo.feed_path) if photo.feed_path else "",
            photo_aspect=round(photo.width / photo.height, 4) if photo.height else 1,
            caption=str(body.get("caption") or "").strip()[:1000],
            visibility="private" if body.get("visibility") == "private" else "public",
            hair_texture=str(body.get("hair_texture") or "")[:20],
            booking_id=booking_id or None,
            stylist_id=str(stylist_profile.account_id) if stylist_profile else "",
            stylist_name=stylist_profile.display_name if stylist_profile else "",
            stylist_handle=stylist_profile.handle if stylist_profile else "",
            service_id=str(service.pk) if service else "",
            service_name=service.name if service else "",
            price=service.price if service else None,
            from_price=service.from_price if service else False,
            area=stylist_profile.base_area if stylist_profile else "",
        )
        LookPhoto.objects.bulk_create([
            LookPhoto(
                look=look, position=position,
                photo_uri=media_url(request, photo, photo.full_path),
                thumb_uri=media_url(request, photo, photo.thumb_path) if photo.thumb_path else "",
                feed_uri=media_url(request, photo, photo.feed_path) if photo.feed_path else "",
                aspect=round(photo.width / photo.height, 4) if photo.height else 1,
            )
            for position, photo in enumerate(photos)
        ])
        look.styles.set(styles)
        if products:
            look.products.set(products)

    look = _looks(user).get(pk=look.pk)
    return Response(present_looks([look], user)[0], status=status.HTTP_201_CREATED)


class MyLooksView(APIView):
    """GET /api/looks/mine/ — her own, private ones included."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=LookSerializer(many=True))
    def get(self, request):
        looks = _looks(request.user).filter(author=request.user).order_by("-created_at")
        return Response(present_looks(looks, request.user))


class LookTagsRequestSerializer(serializers.Serializer):
    styles = serializers.ListField(child=serializers.CharField(), required=False)
    hair_texture = serializers.CharField(required=False, allow_blank=True)
    visibility = serializers.ChoiceField(choices=["public", "private"], required=False)


class LookDetailView(APIView):
    """GET / DELETE /api/looks/:id/"""

    permission_classes = [IsAuthenticatedOrReadOnly]

    @extend_schema(responses=LookSerializer)
    def get(self, request, pk):
        viewer = _viewer(request)
        if _visible_look(pk, viewer) is None:
            return _not_found()
        look = _looks(viewer).get(pk=pk)
        return Response(present_looks([look], viewer)[0])

    @extend_schema(request=LookTagsRequestSerializer, responses=LookSerializer)
    @transaction.atomic
    def patch(self, request, pk):
        look = Look.objects.select_for_update().filter(pk=pk).first()
        if look is None:
            return _not_found()
        if look.author_id != request.user.pk:
            return Response({"message": "That look isn’t yours"}, status=403)
        if set(request.data) - {"styles", "hair_texture", "visibility"}:
            return Response({"message": "Only the style, hair type and who sees it can be changed"}, status=400)
        if "visibility" in request.data:
            wanted = request.data["visibility"]
            if wanted not in ("public", "private"):
                return Response({"message": "Pick public or just me"}, status=400)
            if wanted != look.visibility:
                # It keeps its date, so going public never jumps it up the feed; likes and
                # comments stay with it, hidden while it's private.
                look.visibility = wanted
                look.save(update_fields=["visibility", "updated_at"])
                if wanted == "public" and look.status == "live":
                    from apps.web.indexnow import announce

                    announce(f"/looks/{look.pk}", *([f"/{look.stylist_handle}"] if look.stylist_handle else []))
        if "styles" in request.data:
            wanted = request.data["styles"] if isinstance(request.data["styles"], list) else []
            if len(wanted) > 3:
                return Response({"message": "Pick up to 3 styles"}, status=400)
            styles = list(Style.objects.filter(slug__in=[str(s) for s in wanted]))
            if look.type == "look" and not styles:
                return Response({"message": "Tag the style"}, status=400)
            look.styles.set(styles)
        if "hair_texture" in request.data:
            look.hair_texture = str(request.data.get("hair_texture") or "")[:20]
            look.save(update_fields=["hair_texture", "updated_at"])
        # This response is private to the author, including work on a draft page.
        look = with_viewer_flags(
            Look.objects.filter(pk=look.pk, author=request.user).prefetch_related("styles", "products", "photos"),
            request.user,
        ).get()
        return Response(present_looks([look], request.user)[0])

    @extend_schema(responses={204: None})
    def delete(self, request, pk):
        look = Look.objects.filter(pk=pk).first()
        if look is None:
            return _not_found("That look is already gone")
        if look.author_id != request.user.pk:
            return Response({"message": "That look isn’t yours"}, status=403)
        look.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LookLikeView(APIView):
    """POST / DELETE /api/looks/:id/like/ — idempotent."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def post(self, request, pk):
        look = _visible_look(pk, request.user)
        if look is None:
            return _not_found()
        with transaction.atomic():
            _, created = LookLike.objects.get_or_create(user=request.user, look=look)
            if created:
                Look.objects.filter(pk=pk).update(like_count=F("like_count") + 1)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(responses={204: None})
    def delete(self, request, pk):
        with transaction.atomic():
            deleted, _ = LookLike.objects.filter(user=request.user, look_id=pk).delete()
            if deleted:
                Look.objects.filter(pk=pk, like_count__gt=0).update(
                    like_count=F("like_count") - 1
                )
        return Response(status=status.HTTP_204_NO_CONTENT)


# How "top" comments are ranked, the way social apps rank them:
# engagement (a reply counts double a like: a conversation says more than a tap),
# the creator's involvement (she replied to it, liked it, or wrote it), faded by age
# so a newer comment gathering likes can climb past an old one. Her own new comment
# comes first for her for a while, so posting never loses it down the list.
TOP_WEIGHTS = {"like": 1, "reply": 2, "creator_liked": 3, "creator_replied": 3, "by_creator": 5}
TOP_GRAVITY = 1.2
OWN_FRESH = timedelta(hours=1)


def top_comments_page(qs, request, look, viewer, default=10):
    """
    One page of a look's threads, best first. Keyset on (score, id) with the clock
    fixed for the whole scroll (it rides in the cursor), so later pages never repeat
    or skip a comment as scores drift with time.
    """
    import base64
    import json

    try:
        limit = max(1, min(int(request.query_params.get("limit", default)), 50))
    except (TypeError, ValueError):
        limit = default

    now, after = timezone.now(), None
    cursor = request.query_params.get("cursor")
    if cursor:
        try:
            data = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
            now = datetime.fromisoformat(data["now"])
            after = (float(data["score"]), uuid.UUID(data["id"]))
        except (ValueError, TypeError, KeyError):
            pass  # A bad cursor starts from the top rather than failing.

    creator = look.author_id
    creators = [creator] + ([look.stylist_id] if look.stylist_id else [])
    age_hours = Extract(
        ExpressionWrapper(Value(now) - F("created_at"), output_field=DurationField()), "epoch"
    ) / Value(3600.0)
    engagement = (
        F("like_count") * TOP_WEIGHTS["like"]
        + F("reply_total") * TOP_WEIGHTS["reply"]
        + Case(When(creator_liked=True, then=Value(TOP_WEIGHTS["creator_liked"])), default=Value(0))
        + Case(When(creator_replied=True, then=Value(TOP_WEIGHTS["creator_replied"])), default=Value(0))
        + Case(When(author_id__in=creators, then=Value(TOP_WEIGHTS["by_creator"])), default=Value(0))
        + Value(1)
    )
    own_fresh = (
        Case(
            When(author_id=viewer.pk, created_at__gte=now - OWN_FRESH, then=Value(1e9)),
            default=Value(0.0),
        )
        if viewer is not None
        else Value(0.0)
    )
    qs = qs.annotate(
        creator_liked=Exists(CommentLike.objects.filter(user_id=creator, comment=OuterRef("pk"))),
        creator_replied=Exists(
            LookComment.objects.filter(parent=OuterRef("pk"), author_id=creator)
        ),
    ).annotate(
        score=ExpressionWrapper(
            Cast(engagement, FloatField())
            / Power(Greatest(age_hours, Value(0.0)) + Value(2.0), Value(TOP_GRAVITY))
            + own_fresh,
            output_field=FloatField(),
        )
    )
    if after:
        score, last_id = after
        qs = qs.filter(Q(score__lt=score) | Q(score=score, pk__lt=last_id))
    items = list(qs.order_by("-score", "-pk")[: limit + 1])
    next_cursor = None
    if len(items) > limit:
        items = items[:limit]
        last = items[-1]
        next_cursor = base64.urlsafe_b64encode(
            json.dumps({"now": now.isoformat(), "score": last.score, "id": str(last.pk)}).encode()
        ).decode()
    return items, next_cursor


class CommentListCreateView(APIView):
    """
    GET  /api/looks/:id/comments/?sort=top|new — the top of each thread, best first
         (sort=new: newest first).
    POST /api/looks/:id/comments/ — { body, replyTo? }
    """

    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_throttles(self):
        return [CommentThrottle()] if self.request.method == "POST" else []

    @extend_schema(responses=CommentsPageSerializer)
    def get(self, request, look_id):
        viewer = _viewer(request)
        look = _visible_look(look_id, viewer)
        if look is None:
            return _not_found()
        blocked = blocked_account_ids(viewer)
        qs = comment_queryset(viewer, blocked).filter(look=look, parent__isnull=True)
        if blocked:
            qs = qs.exclude(author_id__in=blocked)
        if request.query_params.get("sort") == "new":
            items, next_cursor = keyset_page(qs, request)
        else:
            items, next_cursor = top_comments_page(qs, request, look, viewer)
        return Response(
            {"data": present_comments(items, viewer), "next_cursor": next_cursor}
        )

    @extend_schema(request=CommentCreateRequestSerializer, responses={201: CommentSerializer})
    def post(self, request, look_id):
        user = request.user
        look = _visible_look(look_id, user)
        if look is None:
            return _not_found()
        body = str(request.data.get("body") or "").strip()
        if not body:
            return Response({"message": "Write something first"}, status=400)
        if len(body) > 500:
            return Response({"message": "Keep it under 500 characters"}, status=400)

        answered = None
        reply_to = request.data.get("reply_to")
        if reply_to:
            answered = (
                LookComment.objects.filter(pk=reply_to, look=look).first()
                if _is_uuid(reply_to)
                else None
            )
            if answered is None or is_blocked(user, answered.author):
                return Response({"message": "That comment is gone"}, status=404)

        with transaction.atomic():
            comment = LookComment.objects.create(
                look=look,
                author=user,
                body=body,
                # A reply joins the thread of whatever it answers: one level deep.
                parent_id=(answered.parent_id or answered.pk) if answered else None,
                reply_to=answered,
                reply_to_name=person(answered.author_id)["name"] if answered else "",
            )
            Look.objects.filter(pk=look.pk).update(comment_count=F("comment_count") + 1)

        comment = comment_queryset(user, set()).get(pk=comment.pk)
        return Response(present_comments([comment], user)[0], status=201)


class CommentRepliesView(APIView):
    """GET /api/comments/:id/replies/ — one thread's replies, oldest first."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(responses=CommentsPageSerializer)
    def get(self, request, pk):
        viewer = _viewer(request)
        root = LookComment.objects.filter(pk=pk, parent__isnull=True).first()
        if root is None or _visible_look(root.look_id, viewer) is None:
            return Response({"message": "That comment is gone"}, status=404)
        blocked = blocked_account_ids(viewer)
        qs = comment_queryset(viewer, blocked).filter(parent=root)
        if blocked:
            qs = qs.exclude(author_id__in=blocked)
        items, next_cursor = keyset_page(qs, request, newest_first=False, default=10)
        return Response(
            {"data": present_comments(items, viewer), "next_cursor": next_cursor}
        )


class CommentDeleteView(APIView):
    """DELETE /api/comments/:id/ — her own. A thread goes with its first comment."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={204: None})
    def delete(self, request, pk):
        comment = LookComment.objects.filter(pk=pk).first()
        if comment is None:
            return Response({"message": "That comment is already gone"}, status=404)
        if comment.author_id != request.user.pk:
            return Response({"message": "That comment isn’t yours"}, status=403)
        with transaction.atomic():
            removed = 1 + (comment.replies.count() if comment.parent_id is None else 0)
            look_id = comment.look_id
            comment.delete()
            Look.objects.filter(pk=look_id).update(
                comment_count=F("comment_count") - removed
            )
            Look.objects.filter(pk=look_id, comment_count__lt=0).update(comment_count=0)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CommentLikeView(APIView):
    """POST / DELETE /api/comments/:id/like/ — idempotent."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def post(self, request, pk):
        comment = LookComment.objects.filter(pk=pk).first()
        if comment is None or _visible_look(comment.look_id, request.user) is None:
            return Response({"message": "That comment is gone"}, status=404)
        with transaction.atomic():
            _, created = CommentLike.objects.get_or_create(user=request.user, comment=comment)
            if created:
                LookComment.objects.filter(pk=pk).update(like_count=F("like_count") + 1)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(responses={204: None})
    def delete(self, request, pk):
        with transaction.atomic():
            deleted, _ = CommentLike.objects.filter(user=request.user, comment_id=pk).delete()
            if deleted:
                LookComment.objects.filter(pk=pk, like_count__gt=0).update(
                    like_count=F("like_count") - 1
                )
        return Response(status=status.HTTP_204_NO_CONTENT)


class StyleListView(APIView):
    """GET /api/styles/ — the taxonomy looks are tagged from: [{ id, name }]."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(responses=StyleSerializer(many=True))
    def get(self, request):
        return Response(
            [{"id": s.slug, "name": s.name} for s in Style.objects.order_by("sort_order", "name")]
        )


class AreaListView(APIView):
    """GET /api/looks/areas/ — districts that have public looks in them."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(responses=serializers.ListSerializer(child=serializers.CharField()))
    def get(self, request):
        areas = (
            public_looks().filter(visibility="public")
            .exclude(area="")
            .values_list("area", flat=True)
            .distinct()
            .order_by("area")
        )
        return Response(list(areas))


def _report(request, model, pk, allowed=REPORT_REASONS):
    reason = request.data.get("reason")
    if reason not in allowed:
        return Response({"message": "Say what’s wrong with it"}, status=400)
    Report.objects.create(
        reporter=request.user,
        content_type=ContentType.objects.get_for_model(model),
        object_id=pk,
        reason=reason,
        note=str(request.data.get("note") or "")[:500],
    )
    return Response(status=status.HTTP_201_CREATED)


class LookReportView(APIView):
    """POST /api/looks/:id/report/ — into moderation, never to the author."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ReportThrottle]

    @extend_schema(request=ReportRequestSerializer, responses={201: None})
    def post(self, request, pk):
        if not public_looks().filter(pk=pk).exists():
            return _not_found("That look is already gone")
        return _report(request, Look, pk, LOOK_REPORT_REASONS)


class CommentReportView(APIView):
    """POST /api/comments/:id/report/"""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ReportThrottle]

    @extend_schema(request=ReportRequestSerializer, responses={201: None})
    def post(self, request, pk):
        if not LookComment.objects.filter(pk=pk, look_id__in=public_looks().values("pk")).exists():
            return Response({"message": "That comment is already gone"}, status=404)
        # A comment can't be stolen work.
        return _report(request, LookComment, pk, COMMENT_REPORT_REASONS)


class StylistReportView(APIView):
    """POST /api/stylists/:accountId/report/"""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ReportThrottle]

    @extend_schema(request=ReportRequestSerializer, responses={201: None})
    def post(self, request, pk):
        if not StylistProfile.objects.filter(account_id=pk).exists():
            return Response({"message": "No page to report"}, status=404)
        return _report(request, StylistProfile, pk)


class BlockListCreateView(APIView):
    """GET / POST /api/blocks/ — { accountId }. Mutual from that moment."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=BlockSerializer(many=True))
    def get(self, request):
        blocks = Block.objects.filter(blocker=request.user).select_related("blocked")
        return Response(
            [
                {
                    "id": str(b.pk),
                    "account_id": str(b.blocked_id),
                    "name": b.blocked.name,
                    "created_at": b.created_at,
                }
                for b in blocks
            ]
        )

    @extend_schema(request=BlockRequestSerializer, responses={204: None})
    def post(self, request):
        blocked_id = request.data.get("account_id") or request.data.get("blocked_id")
        if not blocked_id or not _is_uuid(blocked_id) or str(blocked_id) == str(request.user.pk):
            return Response({"message": "Nobody to block"}, status=400)
        from apps.accounts.models import User

        if not User.objects.filter(pk=blocked_id).exists():
            return Response({"message": "Nobody to block"}, status=400)
        try:
            Block.objects.get_or_create(blocker=request.user, blocked_id=blocked_id)
        except IntegrityError:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(post=extend_schema(request=NotForMeRequestSerializer, responses={204: None}))
class NotForMeView(APIView):
    """POST /api/not-for-me/ — { lookId } or { stylistId }: her feed shows fewer like it."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.accounts.models import User

        look_id, stylist_id = request.data.get("look_id"), request.data.get("stylist_id")
        if look_id and _is_uuid(look_id) and Look.objects.filter(pk=look_id).exists():
            NotForMe.objects.get_or_create(user=request.user, look_id=look_id)
        elif stylist_id and _is_uuid(stylist_id) and User.objects.filter(pk=stylist_id).exists():
            NotForMe.objects.get_or_create(user=request.user, stylist_id=stylist_id)
        else:
            return Response({"message": "Say which look or stylist"}, status=400)
        return Response(status=status.HTTP_204_NO_CONTENT)


class BlockDeleteView(APIView):
    """DELETE /api/blocks/:id/"""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={204: None})
    def delete(self, request, pk):
        deleted, _ = Block.objects.filter(
            Q(pk=pk) | Q(blocked_id=pk), blocker=request.user
        ).delete()
        if not deleted:
            return Response({"message": "That person isn’t blocked."}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)



class MyReportsView(APIView):
    serializer_class = MyReportSerializer
    """GET /api/reports/mine/ — what she reported, and what was done about it."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=MyReportSerializer(many=True))
    def get(self, request):
        from apps.bookings.models import ReviewReport

        rows = [
            {
                "id": str(r.pk),
                "target": r.content_type.model,
                "reason": r.reason,
                "status": r.status,
                "resolution": r.resolution or None,
                "created_at": r.created_at,
                "handled_at": r.handled_at,
            }
            for r in Report.objects.filter(reporter=request.user).select_related("content_type")[:50]
        ] + [
            {
                "id": str(r.pk),
                "target": "review",
                "reason": r.reason,
                "status": r.status,
                "resolution": r.resolution or None,
                "created_at": r.created_at,
                "handled_at": r.handled_at,
            }
            for r in ReviewReport.objects.filter(reporter=request.user)[:50]
        ]
        rows.sort(key=lambda r: r["created_at"], reverse=True)
        return Response(rows)


class MyModerationView(APIView):
    serializer_class = MyModerationSerializer
    """GET /api/moderation/mine/ — actions taken on her content, each appealable."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=MyModerationSerializer(many=True))
    def get(self, request):
        return Response(
            [
                {
                    "id": str(a.pk),
                    "action": a.action,
                    "reason": a.reason,
                    "target": a.content_type.model,
                    "target_id": str(a.object_id),
                    "created_at": a.created_at,
                    "appeal": next(
                        ({"status": ap.status, "created_at": ap.created_at} for ap in a.appeals.all()),
                        None,
                    ),
                }
                for a in ModerationAction.objects.filter(author=request.user)
                .exclude(action__in=["dismiss", "restore"])
                .select_related("content_type")
                .prefetch_related("appeals")[:50]
            ]
        )


@extend_schema(request=AppealRequestSerializer, responses={201: AppealResponseSerializer})
class AppealCreateView(APIView):
    """POST /api/moderation/:id/appeal/ — { body } once, by the author only."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        action = ModerationAction.objects.filter(pk=pk, author=request.user).first()
        if action is None:
            return Response({"message": "We couldn’t find that. It may have been removed."}, status=404)
        if action.appeals.exists():
            return Response({"message": "You’ve already appealed this"}, status=409)
        body = str(request.data.get("body") or "").strip()
        if not body:
            return Response({"message": "Say why it should come back"}, status=400)
        appeal = Appeal.objects.create(action=action, author=request.user, body=body[:1000])
        return Response({"id": str(appeal.pk), "status": appeal.status}, status=201)
