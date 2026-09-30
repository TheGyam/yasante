from datetime import datetime, time, timedelta
from django.contrib.admin.models import LogEntry
from django.contrib.contenttypes.models import ContentType
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.http import require_GET
from ..access import staff_data, visible_admins, workspace_url, available_admins


@staff_data
@require_GET
def overview(request):
    admins = visible_admins(request)
    now = timezone.now()
    start = timezone.localdate() - timedelta(days=13)
    start_at = timezone.make_aware(datetime.combine(start, time.min))
    models = [
        {
            "key": key,
            "name": str(ma.opts.verbose_name_plural).capitalize(),
            "group": str(ma.opts.app_config.verbose_name),
            "url": workspace_url(key),
            "addUrl": f"{workspace_url(key)}/new" if ma.has_add_permission(request) else None,
            "canView": key in admins,
        }
        for model, ma in available_admins(request)
        for key in [model._meta.label_lower]
        if ma.has_module_permission(request) and (key in admins or ma.has_add_permission(request))
    ]
    metrics = []
    for key, label, hint in [
        ("accounts.user", "People", "Accounts in your community"),
        ("stylists.stylistprofile", "Stylists", "Businesses on Yasante"),
        ("bookings.booking", "Bookings", "All appointment requests"),
        ("looks.look", "Looks", "Community posts"),
    ]:
        if key in admins:
            metrics.append({"label": label, "hint": hint, "value": admins[key].get_queryset(request).count(), "url": workspace_url(key)})

    queues = []
    for key, label, hint, filters in [
        ("looks.report", "Community reports", "Review reported posts, comments and profiles", {"status": "open"}),
        ("bookings.reviewreport", "Review reports", "Check reported appointment reviews", {"status": "open"}),
        ("looks.appeal", "Appeals", "Give moderation decisions a second look", {"status": "open"}),
        ("stylists.verification", "Stylist checks", "Review evidence before granting a badge", {"status": "pending"}),
        ("bookings.review", "Reviews to publish", "Read new reviews before they go live", {"status": "pending"}),
        ("common.media", "Flagged uploads", "Check photos flagged as possible duplicates", {"moderation_status": "flagged"}),
    ]:
        if key in admins:
            query = "&".join(f"{field}__exact={value}" for field, value in filters.items())
            queues.append({"label": label, "hint": hint, "count": admins[key].get_queryset(request).filter(**filters).count(), "url": f"{workspace_url(key)}?{query}"})

    series = []
    for key, label in [("accounts.user", "New people"), ("bookings.booking", "Booking requests")]:
        if key not in admins:
            continue
        counts = {
            row["day"]: row["count"]
            for row in admins[key].get_queryset(request).filter(created_at__gte=start_at, created_at__lte=now)
            .annotate(day=TruncDate("created_at")).values("day").annotate(count=Count("pk")).order_by("day")
        }
        series.append({"label": label, "values": [counts.get(start + timedelta(days=i), 0) for i in range(14)]})

    # Audit entries follow the same model access as the record browser.
    content_types = ContentType.objects.get_for_models(*(ma.model for ma in admins.values())) if admins else {}
    audit = []
    for entry in LogEntry.objects.filter(Q(content_type_id__in=[ct.pk for ct in content_types.values()]) | (Q(content_type=None) if request.user.is_superuser else Q(pk__in=[]))).select_related("user", "content_type").order_by("-action_time")[:12]:
        ma = admins.get(f"{entry.content_type.app_label}.{entry.content_type.model}") if entry.content_type else None
        audit.append({
            "id": entry.pk, "object": entry.get_change_message() if entry.content_type is None else entry.object_repr,
            "actor": "System" if entry.content_type is None and entry.change_message.startswith("System · ") else entry.user.name,
            "action": "Security" if entry.content_type is None else {1: "Added", 2: "Changed", 3: "Deleted"}.get(entry.action_flag, "Updated"),
            "at": entry.action_time.isoformat(),
            "url": f"{workspace_url(ma.opts.label_lower)}/{entry.object_id}/history" if ma and entry.action_flag != 3 else None,
        })
    return {
        "user": {"name": request.user.name, "superuser": request.user.is_superuser},
        "csrfToken": get_token(request), "models": sorted(models, key=lambda m: (m["group"], m["name"])),
        "metrics": metrics, "queues": queues, "audit": audit,
        "trend": {"dates": [(start + timedelta(days=i)).isoformat() for i in range(14)], "series": series},
        "generatedAt": now.isoformat(),
    }

