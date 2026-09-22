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

from .models import CommentLike, LookComment, LookLike

REPORT_REASONS = ("not-their-work", "nudity", "hate", "scam", "other")


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
                "photo_aspect": look.photo_aspect or None,
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
    qs = LookComment.objects.all()
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
