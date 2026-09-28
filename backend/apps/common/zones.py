"""
Time zones. Every time is stored in UTC; a zone decides how it reads. A stylist's
zone is where her working hours are (set from her phone when she sets up or edits
her page); a person's zone is how times are worded to them (kept in step with their
phone). Unknown or invalid falls back to STYLIST_TIME_ZONE, where Yasante started.
"""

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings


def is_zone(name):
    try:
        ZoneInfo(name)
        return bool(name)
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        return False


def zone(name=""):
    return ZoneInfo(name) if name and is_zone(name) else ZoneInfo(settings.STYLIST_TIME_ZONE)


def of(obj):
    """The zone of a stylist profile or a user; the default for None."""
    return zone(getattr(obj, "time_zone", "") if obj is not None else "")


# Names people use, where the city in the zone's id isn't it.
NAMES = {"Europe/London": "UK time", "Europe/Dublin": "Irish time", "Africa/Accra": "Ghana time", "Africa/Lagos": "Nigeria time"}


def label(z):
    """"UK time", "New York time": how to mark a time that isn't the reader's own."""
    key = getattr(z, "key", str(z))
    return NAMES.get(key) or f"{key.rsplit('/', 1)[-1].replace('_', ' ')} time"
