"""Free time slots for a stylist + service over the next 28 days."""

from datetime import datetime, timedelta
from datetime import timezone as dt_timezone
from zoneinfo import ZoneInfo

from apps.bookings.held import clashes, held_ranges
from django.conf import settings
from django.utils import timezone

DEFAULT_HOURS = {"start": "09:00", "end": "18:00"}


def compute_free_slots(profile, service, option_ids: list[str]) -> dict:
    from apps.stylists.pricing import price_choice

    priced = price_choice(service, option_ids)
    minutes = priced["minutes"] or 120

    availability = profile.availability or {}
    week_hours = availability.get("week")
    blocked_dates = set(availability.get("blocked") or [])
    # Hours she hasn't set are 9 to 6. Set hours with every day off mean no slots.
    hours_set = isinstance(week_hours, list) and len(week_hours) == 7

    # Her hours are wall-clock times where she works; slots go out in UTC.
    zone = ZoneInfo(settings.STYLIST_TIME_ZONE)
    now = timezone.now()
    min_start = now + timedelta(hours=settings.BOOKING_SLOT_MIN_LEAD_HOURS)
    today = now.astimezone(zone).date()
    max_date = today + timedelta(days=settings.BOOKING_SLOT_LOOKAHEAD_DAYS - 1)
    ranges = held_ranges(profile)

    days = []
    current = today
    while current <= max_date:
        date_str = current.strftime("%Y-%m-%d")
        if date_str in blocked_dates:
            current += timedelta(days=1)
            continue

        dow = (current.weekday() + 1) % 7  # Sunday = 0
        if hours_set:
            hours = week_hours[dow] if dow < len(week_hours) else None
        else:
            hours = DEFAULT_HOURS
        if not hours:
            current += timedelta(days=1)
            continue

        open_time = _parse_time(hours["start"])
        close_time = _parse_time(hours["end"])
        open_min = open_time.hour * 60 + open_time.minute
        close_min = close_time.hour * 60 + close_time.minute
        last_start = max(open_min, close_min - minutes)

        times = []
        at = open_min
        while at <= last_start:
            slot_start = datetime.combine(
                current, datetime.min.time(), tzinfo=zone
            ) + timedelta(minutes=at)
            if slot_start >= min_start and not clashes(slot_start, minutes, ranges):
                times.append(_iso(slot_start))
            at += 30

        if times:
            days.append({"date": date_str, "times": times})
        current += timedelta(days=1)

    return {"minutes": minutes, "days": days}


def _parse_time(time_str: str):
    return datetime.strptime(time_str, "%H:%M").time()


def _iso(dt):
    return dt.astimezone(dt_timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def start_fits(profile, start, minutes) -> bool:
    """Whether a job of `minutes` can start at `start`: a day she works, in her hours."""
    zone = ZoneInfo(settings.STYLIST_TIME_ZONE)
    local = start.astimezone(zone)
    availability = profile.availability or {}
    if local.strftime("%Y-%m-%d") in set(availability.get("blocked") or []):
        return False
    week = availability.get("week")
    if not (isinstance(week, list) and len(week) == 7):
        hours = DEFAULT_HOURS
    else:
        hours = week[(local.weekday() + 1) % 7]
    if not hours:
        return False
    open_t, close_t = _parse_time(hours["start"]), _parse_time(hours["end"])
    open_min = open_t.hour * 60 + open_t.minute
    close_min = close_t.hour * 60 + close_t.minute
    at = local.hour * 60 + local.minute
    last_start = max(open_min, close_min - minutes)
    return open_min <= at <= last_start and (at - open_min) % 30 == 0


def is_open_on(profile, start) -> bool:
    """Whether she works at all on the (local) day `start` falls on."""
    zone = ZoneInfo(settings.STYLIST_TIME_ZONE)
    local = start.astimezone(zone)
    availability = profile.availability or {}
    if local.strftime("%Y-%m-%d") in set(availability.get("blocked") or []):
        return False
    week = availability.get("week")
    if not (isinstance(week, list) and len(week) == 7):
        return True
    return bool(week[(local.weekday() + 1) % 7])
