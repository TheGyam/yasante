"""
Free times: when a client can ask a stylist for an appointment, and the one rule every
request and every move a client asks for has to keep.

Her settings live in `availability`: her week, days away, days she's closed to new
bookings (full enough), the notice she needs, how far ahead she takes bookings and the
gap she keeps between clients.
"""

from datetime import date, datetime, time, timedelta
from datetime import timezone as dt_timezone
from functools import lru_cache

from apps.bookings.held import clashing, client_ranges, held_ranges
from apps.common import zones
from django.conf import settings
from django.utils import timezone

DEFAULT_HOURS = {"start": "09:00", "end": "18:00"}
STEP_MINUTES = 30


def _setting(profile, key):
    return (getattr(profile, "availability", None) or {}).get(key)


def notice_hours(profile):
    """How much notice she needs before an appointment: hers to choose, a day by default."""
    chosen = _setting(profile, "lead_hours")
    if type(chosen) is int and 1 <= chosen <= settings.BOOKING_NOTICE_MAX_HOURS:
        return chosen
    return settings.BOOKING_NOTICE_DEFAULT_HOURS


def ahead_days(profile):
    """How many days ahead, today included, clients can book her."""
    chosen = _setting(profile, "ahead_days")
    return chosen if chosen in settings.BOOKING_AHEAD_CHOICES else settings.BOOKING_AHEAD_DEFAULT_DAYS


def gap_minutes(profile):
    """The time she keeps free between one client and the next."""
    chosen = _setting(profile, "gap_minutes")
    return chosen if chosen in settings.BOOKING_GAP_CHOICES else 0


def today_for(profile):
    return timezone.now().astimezone(zones.of(profile)).date()


def last_day(profile, today=None):
    """The furthest day a client can book. One more comes into reach each morning."""
    return (today or today_for(profile)) + timedelta(days=ahead_days(profile) - 1)


def notice_words(hours):
    """"a day’s notice", "36 hours’ notice", "2 weeks’ notice": as a sentence says it."""
    for size, one, many in ((168, "a week’s", "weeks’"), (24, "a day’s", "days’"), (1, "an hour’s", "hours’")):
        if hours % size == 0:
            count = hours // size
            return f"{one if count == 1 else f'{count} {many}'} notice"


def job_minutes(service, options):
    from apps.stylists.pricing import price_choice

    return price_choice(service, options)["minutes"] or 120


def _minutes(clock):
    hour, minute = clock.split(":")
    return int(hour) * 60 + int(minute)


def day_hours(profile, day: date):
    """Her (opening, closing) minutes on a local day, or why she can't be booked then:
    "away", "closed" (to new bookings) or "off" (not one of her days)."""
    availability = profile.availability or {}
    key = day.isoformat()
    if key in (availability.get("blocked") or []):
        return "away"
    if key in (availability.get("closed") or []):
        return "closed"
    week = availability.get("week")
    # Hours she hasn't set are 9 to 6. Set hours with every day off mean no days at all.
    hours = week[(day.weekday() + 1) % 7] if isinstance(week, list) and len(week) == 7 else DEFAULT_HOURS
    if not hours:
        return "off"
    return _minutes(hours["start"]), _minutes(hours["end"])


def _starts(day, opening, closing, minutes, zone):
    """Every half-hour start on a day that finishes by closing. A job longer than her
    whole day can still start when she opens."""
    midnight = datetime.combine(day, time.min, tzinfo=zone)
    for at in range(opening, max(opening, closing - minutes) + 1, STEP_MINUTES):
        yield midnight + timedelta(minutes=at)


def bookable_problem(profile, start, minutes, client_id=None, exclude_id=None):
    """
    Why a client can't have a job of `minutes` at `start`, as (message, status), or None.
    Checked for every request and every move a client asks for, inside the diary lock,
    so what the picker offered is checked again at the moment it's taken.
    """
    name = profile.display_name
    zone = zones.of(profile)
    local = start.astimezone(zone)
    notice = notice_hours(profile)
    if start < timezone.now() + timedelta(hours=notice):
        return f"{name} needs {notice_words(notice)}. Pick a later time", 400
    last = last_day(profile)
    if local.date() > last:
        return f"{name} takes bookings up to {last:%A} {last.day} {last:%B}. Pick an earlier day", 400
    hours = day_hours(profile, local.date())
    if hours == "closed":
        return f"{name} is fully booked that day. Pick another", 409
    if isinstance(hours, str):
        return f"{name} doesn’t work that day. Pick another", 400
    if start not in set(_starts(local.date(), *hours, minutes, zone)):
        return f"That’s outside {name}’s hours. Pick one of their times", 400
    if clashing(start, minutes, held_ranges(profile, exclude_id, gap_minutes(profile))):
        return "Someone has just asked for that time. Pick another", 409
    mine = clashing(start, minutes, client_ranges(client_id, exclude_id))
    if mine:
        did = "asked" if mine.status == "requested" else "booked"
        return f"You’ve already {did} {mine.stylist_name} for a time that overlaps. Pick another", 409
    return None


def _iso(dt):
    return dt.astimezone(dt_timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def free_times(profile, minutes, first=None, last=None, viewer_id=None, exclude_id=None):
    """
    Her free start times for a job of `minutes`, day by day, from `first` to `last`
    (local dates, kept inside today and how far ahead she books). Times inside her notice,
    on her diary or on the viewer's own are never offered. Days without a time say why:
    `full` (booked up, or she's closed it) or `away`. `soonest` and `weekend` are the
    first times anywhere in reach, whatever days were asked for.
    """
    zone = zones.of(profile)
    now = timezone.now()
    today = now.astimezone(zone).date()
    horizon = last_day(profile, today)
    earliest = now + timedelta(hours=notice_hours(profile))
    gap = timedelta(minutes=gap_minutes(profile))
    hers = held_ranges(profile, exclude_id, gap_minutes(profile))
    own = client_ranges(viewer_id, exclude_id) if viewer_id else []

    # Each hold filed under the local days it touches, so a start only checks its own
    # day's: the work stays the same however full the diary is further out.
    def by_day(ranges):
        index = {}
        for held in ranges:
            day, last = held[0].astimezone(zone).date(), held[1].astimezone(zone).date()
            while day <= last:
                index.setdefault(day, []).append(held)
                day += timedelta(days=1)
        return index

    hers_on, own_on = by_day(hers), by_day(own)

    @lru_cache(maxsize=None)
    def times_on(day):
        hours = day_hours(profile, day)
        if isinstance(hours, str):
            return hours, (), 0
        # The next day's too: a job longer than her day can run past midnight.
        after = day + timedelta(days=1)
        held = hers_on.get(day, []) + own_on.get(day, []) + hers_on.get(after, []) + own_on.get(after, [])
        found, reachable = [], 0
        for start in _starts(day, *hours, minutes, zone):
            if start < earliest:
                continue
            reachable += 1
            if not clashing(start, minutes, held):
                found.append(start)
        return ("open" if found else "full" if reachable else "notice"), tuple(found), reachable

    def room(found, reachable):
        """How much of her day is left for a job like this: plenty while at least half
        the times it could start are free, a few once fewer (or only one or two) are."""
        return "few" if len(found) <= 2 or len(found) * 2 < reachable else "plenty"

    def busy_on(day):
        """Her diary for the day's timeline: appointments and blocks as they are (no gap),
        plus the viewer's own elsewhere, which is why some times aren't offered to them.
        A block reads as booked: what it's for is hers."""
        blocks = [(s + gap, e - gap, b) for s, e, b in hers_on.get(day, [])]
        blocks += [r for r in own_on.get(day, []) if r[2].stylist_profile_id != profile.pk]
        return [
            {
                "start": _iso(s),
                "end": _iso(e),
                **({"mine": True} if viewer_id and getattr(b, "client_id", None) == viewer_id else {}),
            }
            for s, e, b in sorted(blocks, key=lambda r: r[0])
        ]

    first = max(first or today, today)
    last = min(
        last or first + timedelta(days=settings.BOOKING_SLOT_LOOKAHEAD_DAYS - 1),
        horizon,
        first + timedelta(days=settings.BOOKING_SLOT_WINDOW_MAX_DAYS - 1),
    )
    days, full, away = [], [], []
    day = first
    while day <= last:
        state, times, reachable = times_on(day)
        if times:
            days.append({
                "date": day.isoformat(),
                "times": [_iso(t) for t in times],
                "room": room(times, reachable),
                "busy": busy_on(day),
            })
        elif state in ("full", "closed"):
            full.append(day.isoformat())
        elif state == "away":
            away.append(day.isoformat())
        day += timedelta(days=1)

    def first_time(wanted):
        day = max(today, earliest.astimezone(zone).date())
        while day <= horizon:
            if wanted(day) and times_on(day)[1]:
                return _iso(times_on(day)[1][0])
            day += timedelta(days=1)
        return None

    return {
        "minutes": minutes,
        "time_zone": zone.key,
        "notice_hours": notice_hours(profile),
        "last_date": horizon.isoformat(),
        "days": days,
        "full": full,
        "away": away,
        "soonest": first_time(lambda d: True),
        "weekend": first_time(lambda d: d.weekday() >= 5),
    }
