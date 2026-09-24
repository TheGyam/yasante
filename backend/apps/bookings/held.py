"""Diary holds and clash checks. Two clients cannot take the same time."""

from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from .models import Booking

HOLD_STATUSES = ("requested", "awaiting_deposit", "confirmed")


def held_start(booking) -> list:
    """Times this booking occupies: scheduled, else proposal, else requested."""
    starts = []
    if booking.scheduled_for:
        starts.append(booking.scheduled_for)
    elif booking.proposal and booking.proposal.get("scheduled_for"):
        from apps.common.timeparse import parse_iso

        starts.append(parse_iso(booking.proposal["scheduled_for"]))
    elif booking.requested_times:
        starts.extend(booking.requested_times)
    return [s for s in starts if s]


def held_ranges(profile, exclude_id=None):
    qs = Booking.objects.filter(stylist_profile=profile, status__in=HOLD_STATUSES)
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    ranges = []
    for booking in qs:
        duration = booking.duration_minutes or 120
        for start in held_start(booking):
            ranges.append((start, start + timedelta(minutes=duration)))
    return ranges


def clashes(start, minutes, ranges) -> bool:
    end = start + timedelta(minutes=minutes)
    for held_start_dt, held_end in ranges:
        if start < held_end and end > held_start_dt:
            return True
    return False


def clash_exists(profile, start, minutes, exclude_id=None) -> bool:
    return clashes(start, minutes, held_ranges(profile, exclude_id=exclude_id))


def expire_if_due(booking) -> Booking:
    """Reads must reflect lapse even if the job is late."""
    now = timezone.now()
    if (
        booking.status in ("requested", "awaiting_deposit")
        and booking.expires_at
        and booking.expires_at <= now
    ):
        booking.status = "expired"
        booking.save(update_fields=["status", "updated_at"])
        release(booking)
    return booking


def release(booking):
    """
    A slot came free: anyone waiting on that stylist for that day hears about it,
    except the client whose booking it was.
    """
    from .models import SlotInterest

    start = booking.scheduled_for or (booking.requested_times or [None])[0]
    if not start or not booking.stylist_id:
        return
    from zoneinfo import ZoneInfo

    from django.conf import settings

    day = start.astimezone(ZoneInfo(settings.STYLIST_TIME_ZONE)).date()
    for interest in SlotInterest.objects.filter(
        stylist_id=booking.stylist_id,
        from_date__lte=day,
        to_date__gte=day,
        opened_on__isnull=True,
    ).exclude(client_id=booking.client_id):
        interest.opened_on = day
        interest.save(update_fields=["opened_on", "updated_at"])
        from apps.common.notifications import notify

        notify(
            interest.client_id,
            "waitlist",
            f"slot:{interest.pk}:{day.isoformat()}",
            f"A slot opened with {interest.stylist_name}",
            f"{day:%a} {day.day} {day:%b}. Ask before someone else does.",
            url=f"/book/{interest.stylist_handle}?date={day.isoformat()}",
            mode="client",
        )


def sweep(qs=None, now=None):
    """
    The scheduled jobs, applied on read so state is right even if a job runs late:
    requests and unpaid deposits lapse; an appointment nobody closed completes itself
    24 hours after it ends.
    """
    from django.conf import settings

    now = now or timezone.now()
    qs = qs if qs is not None else Booking.objects.all()
    for booking in qs.filter(
        status__in=("requested", "awaiting_deposit"), expires_at__lte=now
    ):
        booking.status = "expired"
        booking.expires_at = None
        booking.save(update_fields=["status", "expires_at", "updated_at"])
        release(booking)
    grace = timedelta(hours=settings.BOOKING_AUTO_COMPLETE_HOURS)
    for booking in qs.filter(status="confirmed", scheduled_for__lte=now - grace):
        end = booking.scheduled_for + timedelta(minutes=booking.duration_minutes or 120)
        if end + grace < now:
            booking.status = "completed"
            booking.completed_at = now
            booking.save(update_fields=["status", "completed_at", "updated_at"])
