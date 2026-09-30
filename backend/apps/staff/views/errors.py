from datetime import timedelta
from django.core.exceptions import BadRequest, PermissionDenied
from django.db import transaction
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_POST
from apps.common.models import ClientError
from ..access import staff_data, model_admin


def issue_data(issue):
    return {"id": issue.pk, "title": issue.title, "platform": issue.platform, "count": issue.count, "users": issue.users_affected,
            "first": issue.first_seen.isoformat(), "last": issue.last_seen.isoformat(), "version": issue.app_version,
            "status": issue.status, "regressed": issue.regressed, "note": issue.note, "resolvedInVersion": issue.resolved_in_version}


@staff_data
@require_GET
def issues(request):
    ma = model_admin(request, "common", "errorissue")
    if not ma.has_view_or_change_permission(request):
        raise PermissionDenied
    qs = ma.get_queryset(request)
    for key, field in [("platform", "platform"), ("status", "status"), ("version", "app_version")]:
        if request.GET.get(key):
            qs = qs.filter(**{field: request.GET[key][:40]})
    try:
        page = int(request.GET.get("p", 1))
        if not 1 <= page <= 10000:
            raise ValueError
    except ValueError:
        raise BadRequest
    rows = list(qs.order_by("-last_seen")[(page-1)*25:page*25])
    start = timezone.localdate()-timedelta(days=13)
    buckets = ClientError.objects.filter(fingerprint__in=[row.fingerprint for row in rows], created_at__date__gte=start).annotate(day=TruncDate("created_at")).values("fingerprint", "day").annotate(count=Count("pk"))
    values = {(row["fingerprint"], row["day"]): row["count"] for row in buckets}
    return {"items": [{**issue_data(row), "sparkline": [values.get((row.fingerprint, start+timedelta(days=i)), 0) for i in range(14)]} for row in rows], "count": qs.count(), "page": page,
            "versions": list(ma.get_queryset(request).exclude(app_version="").order_by("app_version").values_list("app_version", flat=True).distinct()[:100])}


@staff_data
@require_GET
def issue_detail(request, pk):
    ma = model_admin(request, "common", "errorissue")
    obj = get_object_or_404(ma.get_queryset(request), pk=pk)
    if not ma.has_view_or_change_permission(request, obj):
        raise PermissionDenied
    rows = ClientError.objects.filter(fingerprint=obj.fingerprint).select_related("user")
    occurrences = [{"id": row.pk, "at": row.created_at.isoformat(), "stack": row.stack, "device": row.context.get("browser", row.context.get("device", "")), "os": row.os_version,
                    "version": row.app_version, "path": row.context.get("path", ""), "user": str(row.user) if row.user else "Anonymous",
                    "userUrl": f"/records/accounts/user/{row.user_id}" if row.user_id and request.user.has_perm("accounts.view_user") else None} for row in rows.order_by("-created_at")[:20]]
    trend = list(rows.filter(created_at__gte=timezone.now()-timedelta(days=14)).annotate(day=TruncDate("created_at")).values("day", "app_version").annotate(value=Count("pk")).order_by("day"))
    return {**issue_data(obj), "occurrences": occurrences, "trend": trend, "editable": ma.has_change_permission(request, obj)}


@staff_data
@csrf_protect
@require_POST
@transaction.atomic
def issue_action(request, pk):
    ma = model_admin(request, "common", "errorissue")
    obj = get_object_or_404(ma.get_queryset(request).select_for_update(), pk=pk)
    if not ma.has_change_permission(request, obj):
        raise PermissionDenied
    status = request.POST.get("status")
    if status not in ("open", "resolved", "ignored"):
        raise BadRequest
    obj.status, obj.regressed = status, False
    obj.resolved_in_version = request.POST.get("version", "")[:40]
    obj.note = request.POST.get("note", "")[:2000]
    ma.save_model(request, obj, None, True)
    ma.log_change(request, obj, f"Issue {status}. {obj.note}")
    return {"done": True}
