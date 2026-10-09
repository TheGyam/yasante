import json
from copy import copy
from django.contrib import admin
from django.core import signing
from django.core.cache import cache
from django.core.exceptions import BadRequest, PermissionDenied
from django.db import transaction
from django.http import Http404, JsonResponse, QueryDict
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_POST
from apps.common.uploads import PrivateMediaView
from ..access import staff_data
from ..presentation import fingerprint
from ..privacy import log_access
from ..review import QUEUES, queue_admin, preview
from .actions import action


@staff_data
@require_GET
def review_queue(request, queue):
    ma, label, filters, actions = queue_admin(request, queue)
    try:
        offset = int(request.GET.get("cursor", "0"))
        if not 0 <= offset <= 100000:
            raise ValueError
    except ValueError:
        raise BadRequest
    rows = list(ma.get_queryset(request).filter(**filters).order_by("created_at", "pk")[offset:offset+21])
    return {"name": label, "key": ma.opts.label_lower, "items": [preview(request, queue, obj) for obj in rows[:20] if ma.has_view_or_change_permission(request, obj)],
            "next": str(offset+20) if len(rows) > 20 else None,
            "actions": [{"key": key, "label": label, "shortcut": shortcut, "reversible": queue not in ("reports", "review-reports", "appeals") and not (queue == "photos" and key == "remove")}
                        for key, (label, shortcut) in actions.items() if key in ma.get_actions(request)]}


@staff_data
@csrf_protect
@require_POST
def decide(request, queue, object_id):
    ma, label, filters, actions = queue_admin(request, queue)
    name = request.POST.get("action")
    if name not in actions or name not in ma.get_actions(request):
        raise PermissionDenied
    with transaction.atomic():
        # of=self: an admin's queryset may join nullable relations (reports join handled_by),
        # and Postgres can't lock the nullable side of an outer join.
        obj = ma.get_queryset(request).select_for_update(of=("self",)).filter(pk=object_id, **filters).first()
        if obj is None:
            return JsonResponse({"message": "This item was already reviewed. Refresh the queue."}, status=409)
        field = "moderation_status" if queue == "photos" else "status"
        before = {field: getattr(obj, field)}
        reversible = queue not in ("reports", "review-reports", "appeals") and not (queue == "photos" and name == "remove")
        if not reversible and request.POST.get("confirmed") != "yes":
            return JsonResponse({"message": "This action affects related content and cannot be automatically undone. Confirm to continue.", "confirmation": True}, status=409)
        if queue == "stylist-checks":
            before.update(verified_by_id=str(obj.verified_by_id) if obj.verified_by_id else None, verified_at=obj.verified_at.isoformat() if obj.verified_at else None)
            phone = obj.account.phone_verified
        wrapped = copy(request)
        wrapped.GET = QueryDict("")
        wrapped.POST = QueryDict("", mutable=True)
        wrapped.POST.update({"action": name, "ids": str(obj.pk)})
        review = action(wrapped, *ma.opts.label_lower.split("."))
        if review.status_code != 200:
            return review
        token = json.loads(review.content)["token"]
        wrapped.POST.update({"confirm": "yes", "token": token})
        result = action(wrapped, *ma.opts.label_lower.split("."))
        if result.status_code != 200:
            return result
        note = request.POST.get("note", "").strip()[:2000]
        if note:
            ma.log_change(request, obj, f"Review note: {note}")
        undo = None
        if reversible:
            obj.refresh_from_db()
            undo = signing.dumps({"queue": queue, "id": str(obj.pk), "user": str(request.user.pk), "before": before,
                                  "revision": fingerprint(obj), "phone": phone if queue == "stylist-checks" else None}, salt="staff.undo")
        return {"done": True, "label": actions[name][0], "undo": undo}


@staff_data
@csrf_protect
@require_POST
def undo(request):
    try:
        token = request.POST.get("token", "")
        data = signing.loads(token, salt="staff.undo", max_age=30)  # the toast shows 8s; allow for a slow connection
    except signing.BadSignature:
        return JsonResponse({"message": "The undo window has closed. Open the record to review it."}, status=409)
    if data["user"] != str(request.user.pk):
        raise PermissionDenied
    ma, _, _, _ = queue_admin(request, data["queue"])
    with transaction.atomic():
        obj = ma.get_queryset(request).select_for_update(of=("self",)).get(pk=data["id"])
        if not ma.has_change_permission(request, obj):
            raise PermissionDenied
        if fingerprint(obj) != data["revision"]:
            return JsonResponse({"message": "Someone changed this item after your decision. Open it to review."}, status=409)
        for field, value in data["before"].items():
            setattr(obj, field, obj._meta.get_field(field.removesuffix("_id")).to_python(value) if not field.endswith("_id") else value)
        ma.save_model(request, obj, None, change=True)
        if data["queue"] == "stylist-checks":
            obj.account.__class__.objects.filter(pk=obj.account_id).update(phone_verified=data["phone"])
        ma.log_change(request, obj, "Undid review decision")
    return {"done": True}


@staff_data
@require_GET
def private_media(request, pk):
    # Session and 2FA are verified first; PrivateMediaView retains owner/staff rules.
    response = PrivateMediaView.as_view()(request, pk=pk)
    if response.status_code == 200:
        from apps.common.models import Media

        media = Media.objects.filter(pk=pk).first()
        if media:
            log_access(request, Media, "Viewed a private photo", media)
    return response
