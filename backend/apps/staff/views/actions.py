from django.contrib import messages
from django.contrib.admin.helpers import ACTION_CHECKBOX_NAME
from django.core import signing
from django.core.exceptions import BadRequest, PermissionDenied, ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from ..access import model_admin, staff_data, validate_parameters
from ..presentation import deletion_data, queryset_revision

MAX_BULK = 5000


@staff_data
@csrf_protect
@require_POST
def action(request, app_label, model_name):
    validate_parameters(request)
    ma = model_admin(request, app_label, model_name)
    name = request.POST.get("action", "")
    available = ma.get_actions(request)
    if name not in available:
        raise PermissionDenied
    function, _, description = available[name]
    queryset = ma.get_changelist_instance(request).queryset
    if request.POST.get("all") != "yes":
        ids = request.POST.getlist("ids")
        if not ids or len(ids) > MAX_BULK:
            raise BadRequest
        try:
            ids = [ma.model._meta.pk.to_python(value) for value in ids]
        except (ValidationError, ValueError, TypeError):
            raise BadRequest
        queryset = queryset.filter(pk__in=ids)
    if queryset.count() > MAX_BULK:
        return JsonResponse({"message": "Bulk actions are limited to 5,000 records. Narrow your filters first."}, status=400)
    apply = request.POST.get("confirm") == "yes"
    # Reviews never lock rows. Only application holds locks, inside this transaction.
    with transaction.atomic():
        ordered = queryset.order_by("pk")
        objects = list((ordered.select_for_update(of=("self",)) if apply else ordered)[:MAX_BULK + 1])
        if len(objects) > MAX_BULK:
            return JsonResponse({"message": "Bulk actions are limited to 5,000 records. Narrow your filters first."}, status=400)
        if not objects:
            raise BadRequest
        queryset = queryset.filter(pk__in=[obj.pk for obj in objects])
        revision = queryset_revision(queryset)
        review = {"user": str(request.user.pk), "model": ma.opts.label_lower, "action": name, "revision": revision}
        permissions = getattr(function, "allowed_permissions", ["change"])
        for obj in objects:
            if not any(getattr(ma, f"has_{permission}_permission")(request, obj) for permission in permissions):
                raise PermissionDenied
        deletion = deletion_data(ma, request, objects) if name == "delete_selected" else None
        label = str(description) % {"verbose_name_plural": ma.opts.verbose_name_plural}
        if not apply:
            return {"count": len(objects), "label": label, "token": signing.dumps(review, salt="staff.action"), "deletion": deletion}
        try:
            confirmed = signing.loads(request.POST.get("token", ""), salt="staff.action", max_age=600)
        except signing.BadSignature:
            confirmed = None
        if confirmed != review:
            return JsonResponse({"message": "The selection changed or the review expired. Review the action again."}, status=409)
        if deletion:
            if not deletion["canDelete"]:
                raise PermissionDenied
            ma.log_deletions(request, queryset)
            ma.delete_queryset(request, queryset)
        else:
            request.POST = request.POST.copy()
            request.POST.setlist(ACTION_CHECKBOX_NAME, [str(obj.pk) for obj in objects])
            function(ma, request, queryset)
            for obj in objects:
                ma.log_change(request, obj, label)
        return {"done": True, "count": len(objects), "messages": [
            {"message": str(message), "level": message.level} for message in messages.get_messages(request)]}
