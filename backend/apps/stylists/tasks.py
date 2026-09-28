"""Nightly public stats and the monthly recap each stylist gets."""

from datetime import timedelta
from apps.common import zones

from celery import shared_task
from django.utils import timezone

from apps.common.notifications import notify

from .models import StylistProfile
from .numbers import count_week, recompute_public_stats


@shared_task
def nightly_stats():
    """Ratings, response time and styles done, for pages whose bookings closed on their own."""
    # ponytail: every published page each night; move to "changed today" at a few thousand stylists.
    for profile in StylistProfile.objects.filter(published=True):
        recompute_public_stats(profile)


def _count(n, noun):
    return f"{n} {noun}{'' if n == 1 else 's'}"


@shared_task
def monthly_recap(now=None):
    """On the 1st: last month's views, bookings and earnings, for anyone who had some."""
    for profile in StylistProfile.objects.filter(published=True):
        # Last month as her calendar has it.
        local = (now or timezone.now()).astimezone(zones.of(profile))
        end = local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start = (end - timedelta(days=1)).replace(day=1)
        month = start.strftime("%B")
        n = count_week(profile, start, end)
        if not (n["views"] or n["requests"] or n["completed"]):
            continue
        parts = [_count(n["views"], "page view"), _count(n["completed"], "appointment")]
        if n["earned"]:
            parts.append(f"£{n['earned']:.0f} earned")
        notify(
            profile.account_id,
            "weekly_digest",
            f"recap:{profile.pk}:{start:%Y-%m}",
            f"Your {month}",
            ", ".join(parts) + ". Tap for the full numbers.",
            url="/numbers",
            mode="stylist",
        )
