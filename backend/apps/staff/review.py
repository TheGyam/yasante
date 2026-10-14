"""Queue definitions and permission-aware, human-readable previews."""
from urllib.parse import urlparse
from django.contrib import admin
from django.core.exceptions import PermissionDenied
from django.http import Http404
from apps.common.uploads import media_url
from .access import model_admin, workspace_url

QUEUES = {
    "reports": ("looks.report", "Reports", {"status": "open"}, {"hide_target": ("Hide", "h"), "remove_target": ("Remove", "r"), "dismiss": ("Dismiss", "d")}),
    "review-reports": ("bookings.reviewreport", "Review reports", {"status": "open"}, {"remove_review": ("Remove", "r"), "dismiss": ("Dismiss", "d")}),
    "appeals": ("looks.appeal", "Appeals", {"status": "open"}, {"uphold": ("Uphold", "u"), "overturn": ("Overturn", "o")}),
    "stylist-checks": ("stylists.verification", "Stylist checks", {"status": "pending"}, {"approve": ("Approve", "a"), "reject": ("Reject", "x")}),
    "reviews": ("bookings.review", "Reviews to publish", {"status": "pending"}, {"restore_reviews": ("Publish", "p"), "remove_reviews": ("Remove", "r")}),
    "photos": ("common.media", "Flagged photos", {"moderation_status": "flagged"}, {"clear_flag": ("Approve", "a"), "remove": ("Delete permanently", "r")}),
    "products": ("shelf.product", "Products to approve", {"status": "pending"}, {"approve": ("Approve", "a"), "reject": ("Reject", "x")}),
}


def queue_admin(request, queue):
    if queue not in QUEUES:
        raise Http404
    key, label, filters, actions = QUEUES[queue]
    ma = model_admin(request, *key.split("."))
    if not ma.has_view_or_change_permission(request):
        raise PermissionDenied
    return ma, label, filters, actions


def image(request, obj):
    if obj is None:
        return ""
    if obj._meta.label_lower == "common.media":
        if obj.visibility == "private":
            return f"/data/media/{obj.pk}/"
        return media_url(request, obj, obj.thumb_path or obj.full_path)
    uri = next((getattr(obj, field, "") for field in ("thumb_uri", "photo_uri", "avatar_uri") if getattr(obj, field, "")), "")
    parsed = urlparse(uri)
    if parsed.scheme not in ("", "http", "https"):
        return ""
    if parsed.path.startswith("/api/media/"):
        return "/data/media/" + parsed.path.split("/api/media/", 1)[1]
    return uri


def person(user):
    return getattr(user, "name", "") or (str(user) if user else "")


def content(request, obj):
    if obj is None or not admin.site.is_registered(type(obj)):
        return {"title": "Content no longer available"}
    ma = admin.site.get_model_admin(type(obj))
    if not ma.has_view_or_change_permission(request, obj):
        return {"title": "You don't have access to this content"}
    return {"title": str(obj), "text": getattr(obj, "caption", getattr(obj, "body", "")),
            "author": person(getattr(obj, "author", None) or getattr(obj, "account", None)), "image": image(request, obj),
            "url": f"{workspace_url(obj._meta.label_lower)}/{obj.pk}"}


def preview(request, queue, obj):
    data = {"id": str(obj.pk), "title": str(obj), "at": obj.created_at.isoformat(), "facts": [], "text": "", "images": [],
            "url": f"{workspace_url(obj._meta.label_lower)}/{obj.pk}"}
    if queue == "reports":
        data.update(title=obj.get_reason_display(), text=obj.note, content=content(request, obj.content_object))
        target = obj.content_object
        if target is not None and target._meta.label_lower == "looks.look" and "url" in data["content"]:
            data["images"] = [image(request, photo) for photo in target.photos.all()] or [image(request, target)]
        times = type(obj).objects.filter(content_type=obj.content_type, object_id=obj.object_id).count()
        data["facts"] = [f"Reported by {obj.reporter.name}", "First report" if times == 1 else f"Reported {times} times"]
    elif queue == "review-reports":
        data.update(title=obj.get_reason_display(), text=obj.note, content=content(request, obj.review))
        data["facts"] = [f"{obj.review.rating}/5", obj.review.author_name, obj.review.booking.stylist_name]
    elif queue == "appeals":
        data.update(text=obj.body, content=content(request, obj.action.target))
        data["facts"] = [obj.action.get_action_display(), obj.action.reason, obj.author.name]
    elif queue == "stylist-checks":
        data.update(title=obj.account.name, text=obj.evidence)
        profile = getattr(obj.account, "stylistprofile", None)
        data["facts"] = [obj.get_type_display(), f"@{profile.handle}" if profile else "", "Approval updates the stylist's verification badge"]
        if obj.evidence.startswith(("https://", "http://", "/api/media/")):
            data["evidence"] = obj.evidence.replace("/api/media/", "/data/media/") if obj.evidence.startswith("/api/media/") else obj.evidence
    elif queue == "reviews":
        data.update(title=obj.author_name, text=obj.body)
        data["facts"] = [f"{obj.rating}/5", obj.booking.client_name, obj.booking.stylist_name, str(obj.booking.scheduled_for or "")]
    elif queue == "photos":
        data.update(title=f"Photo by {obj.owner.name}", images=[image(request, obj), image(request, obj.duplicate_of)])
        data["facts"] = [obj.kind, "Possible duplicate"]
    elif queue == "products":
        data.update(title=obj.name, text=obj.description, images=[image(request, obj)])
        data["facts"] = [obj.brand, f"Added by {obj.added_by.name}" if obj.added_by else "Imported catalogue"]
    return data
