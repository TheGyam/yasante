"""
Diary holds and clash checks. Two clients cannot take the same time, and nobody can
take a time someone is still waiting to hear about.

A booking holds its time from the moment it's asked for until it's done with: the time
asked for while the stylist decides, the time she suggests while the client decides, the
appointment once agreed, and a time either side has asked to move it to while the other
decides. A hold lapses with its request, so a time nobody answered comes free again.
Time she blocks out herself holds the same way.
"""

from contextlib import contextmanager
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import Booking, TimeBlock

# What working out a hold reads from a booking, and nothing more: read as plain rows,
# not whole bookings, because a busy diary is hundreds of them on every look.
_HOLD_FIELDS = (
    "id", "status", "scheduled_for", "move_request", "proposal", "requested_times",
    "duration_minutes", "client_id", "client_name", "stylist_profile_id", "stylist_name",
)


@contextmanager
def diary_lock(profile_id, client_id=None):
    """
    One change at a time to a stylist's diary, and to her client's: two people can look
    at the same free time, but only the first to take it gets it. Always the stylist
    first, then the client, so two changes never wait on each other.
    """
    from django.contrib.auth import get_user_model

    from apps.stylists.models import StylistProfile

    with transaction.atomic():
        if profile_id:
            list(StylistProfile.objects.select_for_update().filter(pk=profile_id).values_list("pk"))
        if client_id:
            list(get_user_model().objects.select_for_update().filter(pk=client_id).values_list("pk"))
        yield

HOLD_STATUSES = ("requested", "awaiting_deposit", "confirmed")


def held_starts(booking) -> list:
    """The times this booking occupies (see the module docstring)."""
    from apps.common.timeparse import parse_iso

    if booking.scheduled_for:
        starts = [booking.scheduled_for]
        if booking.move_request and booking.move_request.get("scheduled_for"):
            starts.append(parse_iso(booking.move_request["scheduled_for"]))
    elif booking.proposal and booking.proposal.get("scheduled_for"):
        starts = [parse_iso(booking.proposal["scheduled_for"])]
    else:
        starts = list(booking.requested_times or [])
    return [s for s in starts if s]


def holding(qs, exclude_id=None):
    """
    Bookings that still hold a time: live, not lapsed even if the sweep is late, and not
    an appointment already a day gone (it can't clash with anything still to come).
    """
    now = timezone.now()
    qs = qs.filter(status__in=HOLD_STATUSES).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=now)
    ).exclude(scheduled_for__lt=now - timedelta(days=1))
    return qs.exclude(pk=exclude_id) if exclude_id else qs


def _ranges(qs, gap=0):
    pad = timedelta(minutes=gap)
    return [
        (start - pad, start + timedelta(minutes=booking.duration_minutes or 120) + pad, booking)
        for booking in qs.values_list(*_HOLD_FIELDS, named=True)
        for start in held_starts(booking)
    ]


def held_ranges(profile, exclude_id=None, gap=0, blocks=True):
    """
    Her diary as (start, end, booking or time block), each widened by the gap she keeps
    between clients.
    """
    ranges = _ranges(holding(Booking.objects.filter(stylist_profile=profile), exclude_id), gap)
    if blocks:
        ranges += block_ranges(profile, gap)
    return ranges


def block_ranges(profile, gap=0):
    """Time she's blocked out, repeating ones laid out as far ahead as she's booked."""
    from apps.common import zones
    from apps.stylists.slots import last_day, today_for

    pad = timedelta(minutes=gap)
    now = timezone.now()
    zone = zones.of(profile)
    today, last = today_for(profile), last_day(profile)
    return [
        (start - pad, end + pad, block)
        for block in TimeBlock.objects.filter(stylist_profile=profile).filter(
            Q(end__gt=now) | ~Q(repeats=[])
        )
        for start, end in block.occurrences(zone, today, last)
        if end > now
    ]


def client_ranges(client_id, exclude_id=None):
    """Where a client already is, with any stylist: she can't be in two chairs at once."""
    if not client_id:
        return []
    return _ranges(holding(Booking.objects.filter(client_id=client_id), exclude_id))


def clashing(start, minutes, ranges):
    """The first booking (or time block) in `ranges` a job of `minutes` from `start` would overlap."""
    end = start + timedelta(minutes=minutes)
    for held_from, held_to, booking in ranges:
        if start < held_to and end > held_from:
            return booking
    return None


def clashes(start, minutes, ranges) -> bool:
    return clashing(start, minutes, ranges) is not None


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


def release(booking, start=None):
    """
    A time came free: anyone waiting on that stylist for that day hears about it,
    except the client whose booking it was.
    """
    start = start or booking.scheduled_for or (booking.requested_times or [None])[0]
    if start and booking.stylist_profile_id:
        open_day(booking.stylist_profile, start, booking.client_id)


def open_day(profile, start, except_client_id=None):
    """Anyone waiting on her for the day `start` falls on hears a slot opened, once."""
    from apps.common import zones

    from .models import SlotInterest

    day = start.astimezone(zones.of(profile)).date()
    if day < timezone.now().astimezone(zones.of(profile)).date():
        return  # A day that's gone can't be booked.
    for interest in SlotInterest.objects.filter(
        stylist_id=profile.account_id,
        from_date__lte=day,
        to_date__gte=day,
        opened_on__isnull=True,
        opens=False,
    ).exclude(client_id=except_client_id):
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


def open_new_days(profiles=None):
    """
    Each morning one more day comes into reach (and many at once when a stylist books
    further ahead): anyone waiting for those days to open hears, once.
    """
    from apps.common.notifications import notify
    from apps.stylists.models import StylistProfile
    from apps.stylists.slots import last_day

    from .models import SlotInterest

    waiting = SlotInterest.objects.filter(opens=True, opened_on__isnull=True)
    if profiles is not None:
        waiting = waiting.filter(stylist_id__in=[p.account_id for p in profiles])
    reach = {}
    for interest in waiting:
        if interest.stylist_id not in reach:
            profile = StylistProfile.objects.filter(account_id=interest.stylist_id).first()
            reach[interest.stylist_id] = last_day(profile) if profile and profile.published else None
        last = reach[interest.stylist_id]
        if last is None or interest.from_date > last:
            continue
        interest.opened_on = interest.from_date
        interest.save(update_fields=["opened_on", "updated_at"])
        month = f"{interest.from_date:%B}"
        notify(
            interest.client_id,
            "waitlist",
            f"opens:{interest.pk}",
            f"{interest.stylist_name} is taking bookings for {month}",
            f"From {interest.from_date:%a} {interest.from_date.day} {interest.from_date:%b}. Ask before the best times go.",
            url=f"/book/{interest.stylist_handle}?date={interest.from_date.isoformat()}",
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
