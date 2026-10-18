"""
Deciding whether a switch is on for one account. Every switch is read in one query
and cached for 30 seconds, so a change in the admin shows within moments rather than
needing every request to hit the database.
"""

import hashlib

from django.core.cache import cache

CACHE_KEY = "features:switches"
CACHE_TTL = 30


def clear_cache():
    cache.delete(CACHE_KEY)


def _load():
    switches = cache.get(CACHE_KEY)
    if switches is not None:
        return switches

    from .models import Switch

    rows = list(Switch.objects.values("key", "mode", "percent"))
    listed_keys = [row["key"] for row in rows if row["mode"] == "listed"]
    user_ids_by_key = {key: set() for key in listed_keys}
    if listed_keys:
        pairs = Switch.users.through.objects.filter(switch__key__in=listed_keys).values_list(
            "switch__key", "user_id"
        )
        for key, user_id in pairs:
            user_ids_by_key[key].add(user_id)

    switches = {
        row["key"]: {
            "mode": row["mode"],
            "percent": row["percent"],
            "user_ids": user_ids_by_key.get(row["key"], set()),
        }
        for row in rows
    }
    cache.set(CACHE_KEY, switches, CACHE_TTL)
    return switches


def _in_percent(key, user, percent):
    digest = hashlib.sha256(f"{key}:{user.pk}".encode()).hexdigest()
    return int(digest, 16) % 100 < percent


def _decide(switch, key, user):
    if switch is None or switch["mode"] == "off":
        return False
    if switch["mode"] == "everyone":
        return True
    if not getattr(user, "is_authenticated", False):
        return False
    if switch["mode"] == "staff":
        return user.is_staff
    if switch["mode"] == "listed":
        return user.pk in switch["user_ids"]
    if switch["mode"] == "percent":
        return _in_percent(key, user, switch["percent"])
    return False


def is_on(key, user):
    """True when `key` is on for `user` (which may be AnonymousUser). An unknown
    key, or a switch that's off, is always False — a switch fails closed."""
    return _decide(_load().get(key), key, user)


def features_for(user):
    """{key: bool} for every switch, decided for `user` in one pass."""
    switches = _load()
    return {key: _decide(switch, key, user) for key, switch in switches.items()}
