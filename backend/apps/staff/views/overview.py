from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from django.contrib.admin.models import LogEntry
from django.contrib.contenttypes.models import ContentType
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.http import require_GET
from ..access import staff_data, visible_admins, workspace_url, available_admins
from ..names import model_name
from ..review import QUEUES, preview

UK = ZoneInfo("Europe/London")
# Things made on a page of their own rather than a record form.
ADD_PAGES = {"staff.broadcast": "/notifications/new"}


@staff_data
@require_GET
def overview(request):
    admins = visible_admins(request)
    now = timezone.now()
    today = now.astimezone(UK).date()
    start = today - timedelta(days=13)
    monday = today - timedelta(days=today.weekday())
    week = datetime.combine(monday, time.min, UK)
    models = [{"key": key, **model_name(model),
               "url": workspace_url(key), "addUrl": (ADD_PAGES.get(key, f"{workspace_url(key)}/new")) if ma.has_add_permission(request) else None, "canView": key in admins}
              for model, ma in available_admins(request) for key in [model._meta.label_lower]
              if ma.has_module_permission(request) and (key in admins or ma.has_add_permission(request))]
    metrics, series = [], []
    for key, label, filters in [("accounts.user", "New people", {}), ("bookings.booking", "Booking requests", {}),
                                ("bookings.booking", "Confirmed bookings", {"status__in": ["confirmed", "completed"]}), ("looks.look", "New looks", {})]:
        if key not in admins:
            continue
        qs = admins[key].get_queryset(request).filter(**filters)
        counts = qs.aggregate(current=Count("pk", filter=Q(created_at__gte=week)), previous=Count("pk", filter=Q(created_at__gte=week-timedelta(days=7), created_at__lt=week)))
        daily = {row["day"]: row["count"] for row in qs.filter(created_at__gte=datetime.combine(start, time.min, UK))
                 .annotate(day=TruncDate("created_at", tzinfo=UK)).values("day").annotate(count=Count("pk")).order_by("day")}
        values = [daily.get(start+timedelta(days=i), 0) for i in range(14)]
        url = f"{workspace_url(key)}?created_at__gte={monday.isoformat()}"
        if filters:
            url += "&status__in=confirmed,completed"
        metrics.append({"label": label, "hint": "This week", "value": counts["current"], "previous": counts["previous"],
                        "change": round((counts["current"]-counts["previous"])/counts["previous"]*100) if counts["previous"] else None, "values": values, "url": url})
        if label != "Confirmed bookings":
            series.append({"label": label, "values": values, "url": workspace_url(key)})
    queues, needs = [], []
    for slug, (key, label, filters, actions) in QUEUES.items():
        if key not in admins:
            continue
        ma = admins[key]
        qs = ma.get_queryset(request).filter(**filters)
        queues.append({"key": slug, "model": key, "label": label, "hint": model_name(ma.model)["description"], "count": qs.count(), "url": f"/review/{slug}"})
        needs += [(obj.created_at, slug, label, ma, obj) for obj in qs.order_by("created_at", "pk")[:6]]
    # Only the six oldest across every queue are previewed; previews cost queries.
    oldest = []
    for _, slug, label, ma, obj in sorted(needs, key=lambda item: item[0]):
        if len(oldest) == 6:
            break
        if ma.has_view_or_change_permission(request, obj):
            item = preview(request, slug, obj)
            oldest.append({"id": item["id"], "title": item["title"], "facts": item["facts"], "at": item["at"], "queue": label, "url": f"/review/{slug}?item={obj.pk}"})
    content_types = ContentType.objects.get_for_models(*(ma.model for ma in admins.values())) if admins else {}
    audit = []
    for entry in LogEntry.objects.filter(Q(content_type_id__in=[ct.pk for ct in content_types.values()]) | (Q(content_type=None) if request.user.is_superuser else Q(pk__in=[]))).select_related("user", "content_type").order_by("-action_time")[:12]:
        ma = admins.get(f"{entry.content_type.app_label}.{entry.content_type.model}") if entry.content_type else None
        audit.append({"id": entry.pk, "object": entry.get_change_message() if entry.content_type is None else entry.object_repr,
                      "actor": "System" if entry.content_type is None and entry.change_message.startswith("System · ") else entry.user.name,
                      "action": "Security" if entry.content_type is None else next((word for word in ("Viewed", "Exported") if entry.change_message.startswith(word)), {1: "Added", 2: "Updated", 3: "Deleted"}.get(entry.action_flag, "Updated")),
                      "at": entry.action_time.isoformat(), "url": f"{workspace_url(ma.opts.label_lower)}/{entry.object_id}/history" if ma and entry.action_flag != 3 else None})
    errors = {"open": 0, "new": 0}
    if "common.errorissue" in admins:
        qs = admins["common.errorissue"].get_queryset(request)
        errors = {"open": qs.filter(status="open").count(), "new": qs.filter(first_seen__gte=now-timedelta(days=1)).count()}
    return {"user": {"name": request.user.name, "superuser": request.user.is_superuser, "avatar": request.user.avatar_uri},
            "csrfToken": get_token(request), "models": models, "metrics": metrics, "queues": queues,
            "status": {item["key"]: item["count"] for item in queues}, "totalOpen": sum(item["count"] for item in queues),
            "needs": oldest, "errors": errors, "audit": audit,
            "trend": {"dates": [(start+timedelta(days=i)).isoformat() for i in range(14)], "series": series}, "generatedAt": now.isoformat()}
