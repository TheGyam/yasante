"""
How looks and comments are sent to the app.

Built as plain dicts for a whole page at once, so a page of 20 costs a fixed
handful of queries however many authors, likes, styles or products it involves.
Keys are snake_case here; the renderer turns them into the app's camelCase.
"""

import uuid

from apps.common.people import load_people
from apps.planner.models import CollectionItem
from django.db.models import CharField, Count, Exists, OuterRef, Q, Value
from django.db.models.functions import Cast
from rest_framework import serializers

from apps.common.schema import optional
from apps.profiles.models import TEXTURE_CHOICES

from .models import CommentLike, LookComment, LookLike

REPORT_REASONS = ("not-their-work", "nudity", "hate", "scam", "other")
# A look can also be off-topic: Yasante is for hair.
LOOK_REPORT_REASONS = REPORT_REASONS + ("not-hair",)
COMMENT_REPORT_REASONS = REPORT_REASONS[1:]


def _uuid(value):
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError):
        return None


def with_viewer_flags(qs, viewer):
    """Annotate liked / saved for the viewer in the same query as the looks."""
    if viewer is None:
        return qs.annotate(liked=Value(False), saved=Value(False))
    return qs.annotate(
        liked=Exists(LookLike.objects.filter(user=viewer, look=OuterRef("pk"))),
        saved=Exists(
            CollectionItem.objects.filter(
                collection__user=viewer,
                kind="look",
                ref_id=Cast(OuterRef("pk"), CharField()),
            )
        ),
    )


def present_looks(looks, viewer):
    """A page of looks (already annotated with liked / saved) as the app reads them."""
    looks = list(looks)
    stylist_ids = [_uuid(look.stylist_id) for look in looks]
    people = load_people([look.author_id for look in looks] + stylist_ids)
    out = []
    for look in looks:
        author = people.get(look.author_id, {})
        stylist_id = _uuid(look.stylist_id)
        stylist = people.get(stylist_id) if stylist_id else None
        out.append(
            {
                "id": str(look.pk),
                "author_id": str(look.author_id),
                "author_name": author.get("name", "Someone"),
                "author_handle": author.get("handle"),
                "author_avatar_uri": author.get("avatar_uri"),
                "photo_uri": look.photo_uri,
                "thumb_uri": look.thumb_uri or None,
                "feed_uri": look.feed_uri or None,
                "photo_aspect": look.photo_aspect or None,
                "photos": [
                    {
                        "uri": photo.photo_uri,
                        "thumb_uri": photo.thumb_uri or None,
                        "feed_uri": photo.feed_uri or None,
                        "aspect": photo.aspect,
                    }
                    for photo in look.photos.all()
                ] or [{
                    "uri": look.photo_uri,
                    "thumb_uri": look.thumb_uri or None,
                    "feed_uri": look.feed_uri or None,
                    "aspect": look.photo_aspect,
                }],
                "caption": look.caption,
                "stylist": (
                    {"id": str(stylist_id), "name": stylist["name"], "handle": stylist["handle"]}
                    if stylist
                    else None
                ),
                "service_id": look.service_id,
                "service_name": look.service_name,
                "price": float(look.price) if look.price is not None else None,
                "from_price": look.from_price if look.price is not None else None,
                "styles": [s.slug for s in look.styles.all()],
                "hair_texture": look.hair_texture,
                "area": (stylist or {}).get("base_area") or look.area or None,
                "products": [
                    {"id": str(p.pk), "brand": p.brand, "name": p.name}
                    for p in look.products.all()
                ],
                "visibility": look.visibility,
                "like_count": look.like_count,
                "liked": bool(getattr(look, "liked", False)),
                "comment_count": look.comment_count,
                "save_count": look.save_count,
                "saved": bool(getattr(look, "saved", False)),
                "created_at": look.created_at,
                "mine": bool(viewer and look.author_id == viewer.pk),
            }
        )
    return out


def comment_queryset(viewer, blocked_ids):
    qs = LookComment.objects.filter(status="live")
    if viewer is None:
        qs = qs.annotate(liked=Value(False))
    else:
        qs = qs.annotate(
            liked=Exists(CommentLike.objects.filter(user=viewer, comment=OuterRef("pk")))
        )
    return qs.annotate(
        reply_total=Count("replies", filter=~Q(replies__author_id__in=blocked_ids))
    )


def present_comments(comments, viewer):
    comments = list(comments)
    people = load_people([c.author_id for c in comments])
    out = []
    for c in comments:
        who = people.get(c.author_id, {})
        out.append(
            {
                "id": str(c.pk),
                "look_id": str(c.look_id),
                "author_id": str(c.author_id),
                "author_name": who.get("name", "Someone"),
                "author_avatar_uri": who.get("avatar_uri"),
                "body": c.body,
                "created_at": c.created_at,
                "mine": bool(viewer and c.author_id == viewer.pk),
                "parent_id": str(c.parent_id) if c.parent_id else None,
                "reply_to_name": c.reply_to_name if c.parent_id else None,
                "reply_count": getattr(c, "reply_total", 0) if not c.parent_id else None,
                "like_count": c.like_count,
                "liked": bool(getattr(c, "liked", False)),
            }
        )
    return out


# Response shapes for the reporter's and author's views of moderation, for the schema.
class MyReportSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    target = serializers.CharField(help_text="look, lookcomment, stylistprofile or review")
    reason = serializers.CharField()
    status = serializers.ChoiceField(choices=["open", "actioned", "dismissed"])
    resolution = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()
    handled_at = serializers.DateTimeField(allow_null=True)


class AppealStateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["open", "upheld", "overturned"])
    created_at = serializers.DateTimeField()


class MyModerationSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    action = serializers.ChoiceField(choices=["hide", "remove", "unpublish"])
    reason = serializers.CharField()
    target = serializers.CharField(help_text="look, lookcomment, stylistprofile or review")
    target_id = serializers.CharField()
    created_at = serializers.DateTimeField()
    appeal = AppealStateSerializer(allow_null=True)


class AppealRequestSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=1000)


class AppealResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    status = serializers.CharField()


# ── Response shapes, for the schema the app's types are generated from ──────────
# The renderer leaves out None and "" values, so anything that can be empty is
# declared nullable, which the schema hook turns into an optional field.


class LookStylistSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    handle = optional(serializers.CharField())


class TaggedProductSerializer(serializers.Serializer):
    id = serializers.CharField()
    brand = serializers.CharField()
    name = serializers.CharField()


class LookPhotoSerializer(serializers.Serializer):
    uri = serializers.CharField()
    thumb_uri = optional(serializers.CharField())
    feed_uri = optional(serializers.CharField())
    aspect = serializers.FloatField()


class LookSerializer(serializers.Serializer):
    photos = LookPhotoSerializer(many=True)
    id = serializers.CharField()
    author_id = serializers.CharField()
    author_name = serializers.CharField()
    author_handle = optional(serializers.CharField())
    author_avatar_uri = optional(serializers.CharField())
    photo_uri = serializers.CharField()
    thumb_uri = optional(serializers.CharField())
    feed_uri = optional(serializers.CharField())
    photo_aspect = optional(serializers.FloatField())
    caption = optional(serializers.CharField())
    stylist = optional(LookStylistSerializer())
    service_id = optional(serializers.CharField())
    service_name = optional(serializers.CharField())
    price = optional(serializers.FloatField())
    from_price = optional(serializers.BooleanField())
    styles = serializers.ListField(child=serializers.CharField())
    hair_texture = optional(serializers.ChoiceField(choices=TEXTURE_CHOICES))
    area = optional(serializers.CharField())
    products = TaggedProductSerializer(many=True)
    visibility = serializers.ChoiceField(choices=["public", "private"])
    like_count = serializers.IntegerField()
    liked = serializers.BooleanField()
    comment_count = serializers.IntegerField()
    save_count = serializers.IntegerField()
    saved = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    mine = serializers.BooleanField()


class LooksPageSerializer(serializers.Serializer):
    data = LookSerializer(many=True)
    next_cursor = optional(serializers.CharField())


class CommentSerializer(serializers.Serializer):
    id = serializers.CharField()
    look_id = serializers.CharField()
    author_id = serializers.CharField()
    author_name = serializers.CharField()
    author_avatar_uri = optional(serializers.CharField())
    body = serializers.CharField()
    created_at = serializers.DateTimeField()
    mine = serializers.BooleanField()
    parent_id = optional(serializers.CharField())
    reply_to_name = optional(serializers.CharField())
    reply_count = optional(serializers.IntegerField())
    like_count = serializers.IntegerField()
    liked = serializers.BooleanField()


class CommentsPageSerializer(serializers.Serializer):
    data = CommentSerializer(many=True)
    next_cursor = optional(serializers.CharField())


class StyleSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()


class BlockSerializer(serializers.Serializer):
    id = serializers.CharField()
    account_id = serializers.CharField()
    name = serializers.CharField()
    created_at = serializers.DateTimeField()


# ── Request shapes ───────────────────────────────────────────────────────────────
class LookCreateRequestSerializer(serializers.Serializer):
    photo_uri = serializers.CharField(required=False)
    # shortcut: array bounds generate incorrect tuples in openapi-typescript 7.13; restore after upgrading it.
    photo_uris = serializers.ListField(
        child=serializers.CharField(), required=False,
        help_text="One to five upload addresses, in display order",
    )
    thumb_uri = serializers.CharField(required=False)
    feed_uri = serializers.CharField(required=False)
    photo_aspect = serializers.FloatField(required=False)
    caption = serializers.CharField(required=False)
    styles = serializers.ListField(child=serializers.CharField(), help_text="Style slugs; at least one")
    booking_id = serializers.CharField(required=False, help_text="Credits the stylist through this booking")
    service_id = serializers.CharField(required=False)
    product_ids = serializers.ListField(child=serializers.CharField(), required=False)
    visibility = serializers.ChoiceField(choices=["public", "private"], required=False)
    hair_texture = serializers.CharField(required=False)


class CommentCreateRequestSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=500)
    reply_to = serializers.CharField(required=False, help_text="The comment being answered")


class ReportRequestSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(choices=list(LOOK_REPORT_REASONS))
    note = serializers.CharField(required=False, max_length=500)


class BlockRequestSerializer(serializers.Serializer):
    account_id = serializers.CharField()
