"""Planner background jobs."""

from celery import shared_task
from django.db.models import F, Q
from django.utils import timezone


def _changed(model):
    """Rows tagging along whose source changed since she last heard, or since she started."""
    return (
        model.objects.filter(follows__isnull=False, follows__share_code__isnull=False)
        .filter(Q(told_at__isnull=True, follows__changed_at__gt=F("created_at")) | Q(follows__changed_at__gt=F("told_at")))
        .select_related("follows__user")
    )


@shared_task
def tell_people_tagging_along(now=None):
    """
    Daily: one note to each person whose collections or plans she tags along with
    changed, naming it if it's just one. Never more than once a day; nothing if she
    switched it off, or if either of them has blocked the other.
    """
    from apps.common.blocks import is_blocked
    from apps.common.notifications import notify

    from .models import CarePlan, Collection

    now = now or timezone.now()
    changed = {}
    for model, kind in ((Collection, "collection"), (CarePlan, "care-plan")):
        for row in _changed(model):
            if not is_blocked(row.user, row.follows.user):
                changed.setdefault(row.user_id, []).append((kind, row))
    for user_id, rows in changed.items():
        if len(rows) == 1:
            kind, row = rows[0]
            first = (row.follows.user.name or "").split(" ")[0] or "Someone"
            title = f"{first} updated {row.follows.name}"
            body = "See what’s new." if kind == "collection" else "See the new steps."
            url = f"/collections/{row.pk}" if kind == "collection" else f"/care-plans/{row.pk}"
        else:
            title = f"{len(rows)} things you tag along with changed"
            body = ", ".join(row.follows.name for _, row in rows[:3]) + ("…" if len(rows) > 3 else "")
            url = "/planner"
        notify(user_id, "tagging_along", f"tagging-along:{user_id}:{now.date()}", title, body, url=url, mode="client")
        for _, row in rows:
            type(row).objects.filter(pk=row.pk).update(told_at=now)
