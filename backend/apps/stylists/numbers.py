"""Stylist numbers, timing labels and response time — computed, not guessed."""

from datetime import timedelta
from datetime import timezone as dt_timezone

from apps.bookings.models import Booking
from apps.bookings.state_machine import CLIENT_SIDE_REASONS
from django.db.models import Avg, Count
from django.utils import timezone

from .models import MenuItem, PageView, StylistProfile

BUCKET_MINUTES = {
    "under_30": 15,
    "30_60": 45,
    "1_2h": 90,
    "2h_plus": 150,
}


def monday_of(at):
    """Monday 00:00 of the week `at` falls in, where she works."""
    from zoneinfo import ZoneInfo

    from django.conf import settings

    local = at.astimezone(ZoneInfo(settings.STYLIST_TIME_ZONE))
    start = local.replace(hour=0, minute=0, second=0, microsecond=0)
    return start - timedelta(days=start.weekday())


def in_range(dt, start, end):
    return dt is not None and start <= dt < end


def count_week(profile, start, end):
    mine = Booking.objects.filter(stylist_profile=profile)
    completed = [
        b
        for b in mine
        if b.status == "completed" and in_range(b.completed_at, start, end)
    ]
    return {
        "views": PageView.objects.filter(
            stylist=profile, viewed_at__gte=start, viewed_at__lt=end
        ).count(),
        "requests": mine.filter(created_at__gte=start, created_at__lt=end).count(),
        "confirmed": mine.filter(
            status__in=["confirmed", "completed"],
            scheduled_for__gte=start,
            scheduled_for__lt=end,
        ).count(),
        "completed": len(completed),
        "noShows": mine.filter(
            status="no_show", scheduled_for__gte=start, scheduled_for__lt=end
        ).count(),
        "lateCancellations": mine.filter(
            status="cancelled_late",
            updated_at__gte=start,
            updated_at__lt=end,
        ).count(),
        "earned": float(sum(b.actual_price or 0 for b in completed)),
    }


def numbers_for(profile: StylistProfile, now=None):
    now = now or timezone.now()
    monday = monday_of(now)
    week = timedelta(days=7)
    return {
        "weekOf": monday.astimezone(dt_timezone.utc).isoformat().replace("+00:00", "Z"),
        "thisWeek": count_week(profile, monday, monday + week),
        "lastWeek": count_week(profile, monday - week, monday),
        "timing": timing_for(profile),
    }


def timing_for(profile: StylistProfile):
    records = Booking.objects.filter(
        stylist_profile=profile, status="completed"
    ).exclude(timing_outcome="")
    menu = MenuItem.objects.filter(stylist=profile)
    out = []
    for item in menu:
        mine = [b for b in records if b.service_id == item.pk]
        if not mine:
            continue
        actual = []
        for b in mine:
            if not b.duration_minutes:
                continue
            shift = BUCKET_MINUTES.get(b.timing_bucket, 0)
            sign = 1 if b.timing_outcome == "over" else -1 if b.timing_outcome == "early" else 0
            actual.append(b.duration_minutes + sign * shift)
        actual.sort()
        typical = actual[len(actual) // 2] if actual else None
        out.append(
            {
                "serviceId": str(item.pk),
                "serviceName": item.name,
                "quotedMinutes": item.duration_minutes,
                "typicalMinutes": typical,
                "sample": len(mine),
                "early": sum(1 for b in mine if b.timing_outcome == "early"),
                "onTime": sum(1 for b in mine if b.timing_outcome == "on_time"),
                "over": sum(1 for b in mine if b.timing_outcome == "over"),
                "clientSide": sum(
                    1 for b in mine if b.timing_reason in CLIENT_SIDE_REASONS
                ),
            }
        )
    return out


def timing_label_for(profile: StylistProfile, now=None):
    now = now or timezone.now()
    year_ago = now - timedelta(days=365)
    recent = list(
        Booking.objects.filter(
            stylist_profile=profile,
            status="completed",
            completed_at__gte=year_ago,
        )
    )
    if len(recent) < 10:
        return None
    usable = []
    for b in recent:
        if not b.timing_outcome or b.contested_timing:
            continue
        if b.timing_reason in CLIENT_SIDE_REASONS:
            continue
        usable.append(b)
    if len(usable) < 6:
        return None
    for outcome in ("on_time", "early", "over"):
        count = sum(1 for b in usable if b.timing_outcome == outcome)
        if count / len(usable) >= 0.6:
            return {"outcome": outcome, "count": count, "sample": len(usable)}
    return None


def response_hours_for(profile: StylistProfile):
    hours = []
    for created, responded in Booking.objects.filter(
        stylist_profile=profile, responded_at__isnull=False
    ).values_list("created_at", "responded_at"):
        hours.append((responded - created).total_seconds() / 3600)
    if not hours:
        return None
    hours.sort()
    return round(hours[len(hours) // 2], 1)


def recompute_public_stats(profile: StylistProfile):
    from apps.bookings.models import Review

    agg = Review.objects.filter(
        booking__stylist_profile=profile, status="published"
    ).aggregate(avg=Avg("rating"), count=Count("id"))
    profile.rating_count = agg["count"] or 0
    profile.rating_average = (
        round(float(agg["avg"]), 1) if agg["avg"] is not None else None
    )
    profile.confirmed_styles_count = Booking.objects.filter(
        stylist_profile=profile, status="completed"
    ).count()
    profile.response_hours = response_hours_for(profile)
    profile.save(
        update_fields=[
            "rating_count",
            "rating_average",
            "confirmed_styles_count",
            "response_hours",
            "updated_at",
        ]
    )
