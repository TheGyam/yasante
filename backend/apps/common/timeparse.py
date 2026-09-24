from datetime import datetime
from datetime import timezone as dt_timezone

from django.utils import timezone
from django.utils.dateparse import parse_datetime


def parse_iso(value):
    """Parse an ISO 8601 timestamp into an aware UTC datetime."""
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        text = str(value).replace("Z", "+00:00")
        dt = parse_datetime(text)
        if dt is None:
            dt = datetime.fromisoformat(text)
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, dt_timezone.utc)
    return dt


def local_parts(text):
    """The phone's own clock, "2026-09-27T09:15:00" (offset or not) -> (weekday 1-7, hour)."""
    try:
        when = datetime.fromisoformat(str(text).replace("Z", "+00:00"))
        return when.isoweekday(), when.hour
    except (ValueError, AttributeError):
        return None, None
