"""
Looks: the feed, a look, posting, likes, threaded comments, reports and blocks.

Public reads: anyone can read the feed, a look and its comments. Signing in adds
likes, saves, blocks and her own. Blocking runs both ways.
"""

import logging
import uuid

from apps.bookings.models import Booking
from apps.common.blocks import blocked_account_ids, is_blocked
from apps.common.pagination import keyset_page
from apps.common.people import person
from apps.common.permissions import IsAuthenticatedOrReadOnly
from apps.common.throttling import PostingThrottle, ReportThrottle
from apps.shelf.models import Product
from apps.stylists.models import StylistProfile
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError, transaction
from django.db.models import F, Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Block, CommentLike, Look, LookComment, LookLike, Report, Style
from .serializers import (
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


def _looks(viewer):
    return with_viewer_flags(
        Look.objects.prefetch_related("styles", "products"), viewer
    )


def _visible_look(pk, viewer):
    """The look, or None when it's private (and not hers), blocked, or missing."""
    look = Look.objects.filter(pk=pk).first()
    if look is None:
        return None
    if look.visibility == "private" and (viewer is None or viewer.pk != look.author_id):
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


class FeedView(APIView):
    """GET /api/looks/?cursor=&limit=&hair=&style=&area= — also POST, to post a look."""

    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_throttles(self):
        return [PostingThrottle()] if self.request.method == "POST" else []

    def get(self, request):
        viewer = _viewer(request)
        qs = _looks(viewer).filter(visibility="public")
        blocked = blocked_account_ids(viewer)
        if blocked:
            qs = qs.exclude(author_id__in=blocked)

        hair = request.query_params.get("hair")
        if hair:
            qs = qs.filter(hair_texture=hair)
        style = request.query_params.get("style")
        if style:
            qs = qs.filter(styles__slug=style)
        area = request.query_params.get("area")
        if area:
            qs = qs.filter(area=area)

        items, next_cursor = keyset_page(qs, request)
        return Response({"data": present_looks(items, viewer), "next_cursor": next_cursor})

    def post(self, request):
        return create_look(request)


def create_look(request):
    """
    Posting a look. Who did it is never typed in: a client credits her stylist
    through her own completed booking, a stylist's own post credits herself.
    """
    user = request.user
    body = request.data
    photo_uri = str(body.get("photo_uri") or "").strip()
    if not photo_uri.startswith(("http://", "https://")):
        return Response({"message": "A look needs a photo"}, status=400)

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
            photo_uri=photo_uri,
            thumb_uri=str(body.get("thumb_uri") or ""),
            photo_aspect=float(body.get("photo_aspect") or 0) or 1,
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
        look.styles.set(styles)
        if products:
            look.products.set(products)

    look = _looks(user).get(pk=look.pk)
    return Response(present_looks([look], user)[0], status=status.HTTP_201_CREATED)


class MyLooksView(APIView):
    """GET /api/looks/mine/ — her own, private ones included."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        looks = _looks(request.user).filter(author=request.user).order_by("-created_at")
        return Response(present_looks(looks, request.user))


class LookDetailView(APIView):
    """GET / DELETE /api/looks/:id/"""

    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, pk):
        viewer = _viewer(request)
        if _visible_look(pk, viewer) is None:
            return _not_found()
        look = _looks(viewer).get(pk=pk)
        return Response(present_looks([look], viewer)[0])

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

    def post(self, request, pk):
        look = _visible_look(pk, request.user)
        if look is None:
            return _not_found()
        with transaction.atomic():
            _, created = LookLike.objects.get_or_create(user=request.user, look=look)
            if created:
                Look.objects.filter(pk=pk).update(like_count=F("like_count") + 1)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, pk):
        with transaction.atomic():
            deleted, _ = LookLike.objects.filter(user=request.user, look_id=pk).delete()
            if deleted:
                Look.objects.filter(pk=pk, like_count__gt=0).update(
                    like_count=F("like_count") - 1
                )
        return Response(status=status.HTTP_204_NO_CONTENT)


class CommentListCreateView(APIView):
    """
    GET  /api/looks/:id/comments/ — the top of each thread, newest first.
    POST /api/looks/:id/comments/ — { body, replyTo? }
    """

    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, look_id):
        viewer = _viewer(request)
        look = _visible_look(look_id, viewer)
        if look is None:
            return _not_found()
        blocked = blocked_account_ids(viewer)
        qs = comment_queryset(viewer, blocked).filter(look=look, parent__isnull=True)
        if blocked:
            qs = qs.exclude(author_id__in=blocked)
        items, next_cursor = keyset_page(qs, request)
        return Response(
            {"data": present_comments(items, viewer), "next_cursor": next_cursor}
        )

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

    def post(self, request, pk):
        comment = LookComment.objects.filter(pk=pk).first()
        if comment is None or _visible_look(comment.look_id, request.user) is None:
            return Response({"message": "That comment is gone"}, status=404)
        with transaction.atomic():
            _, created = CommentLike.objects.get_or_create(user=request.user, comment=comment)
            if created:
                LookComment.objects.filter(pk=pk).update(like_count=F("like_count") + 1)
        return Response(status=status.HTTP_204_NO_CONTENT)

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

    def get(self, request):
        return Response(
            [{"id": s.slug, "name": s.name} for s in Style.objects.order_by("sort_order", "name")]
        )


class AreaListView(APIView):
    """GET /api/looks/areas/ — districts that have public looks in them."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        areas = (
            Look.objects.filter(visibility="public")
            .exclude(area="")
            .values_list("area", flat=True)
            .distinct()
            .order_by("area")
        )
        return Response(list(areas))


def _report(request, model, pk, allow_not_their_work=True):
    reason = request.data.get("reason")
    allowed = REPORT_REASONS if allow_not_their_work else REPORT_REASONS[1:]
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

    def post(self, request, pk):
        if not Look.objects.filter(pk=pk).exists():
            return _not_found("That look is already gone")
        return _report(request, Look, pk)


class CommentReportView(APIView):
    """POST /api/comments/:id/report/"""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ReportThrottle]

    def post(self, request, pk):
        if not LookComment.objects.filter(pk=pk).exists():
            return Response({"message": "That comment is already gone"}, status=404)
        # A comment can't be stolen work.
        return _report(request, LookComment, pk, allow_not_their_work=False)


class StylistReportView(APIView):
    """POST /api/stylists/:accountId/report/"""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ReportThrottle]

    def post(self, request, pk):
        if not StylistProfile.objects.filter(account_id=pk).exists():
            return Response({"message": "No page to report"}, status=404)
        return _report(request, StylistProfile, pk)


class BlockListCreateView(APIView):
    """GET / POST /api/blocks/ — { accountId }. Mutual from that moment."""

    permission_classes = [permissions.IsAuthenticated]

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


class BlockDeleteView(APIView):
    """DELETE /api/blocks/:id/"""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        deleted, _ = Block.objects.filter(
            Q(pk=pk) | Q(blocked_id=pk), blocker=request.user
        ).delete()
        if not deleted:
            return Response({"message": "Block not found."}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)
