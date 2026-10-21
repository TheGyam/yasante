"""
What one person is drawn to, from what she's done in the service: which styles, which
posters and stylists, and which looks. Worked out when her feed is ranked and cached
for a few minutes; never stored.

What it never contains, by design (docs/DATA_AND_CONSENT_PLAN.md, "No inferring"): a
hair type (a look's hair texture is not read here, so liking looks on a hair type never
makes her feed treat her as that hair type) and price (that would be guessing income).
Her own hair type is used only with her consent, and only by the ranking itself.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import timedelta

from django.core.cache import cache
from django.utils import timezone

from .stats import ACTION_WEIGHTS, _as_uuid, _saved_looks

# What she did two weeks ago counts half as much as today.
HALF_LIFE_DAYS = 14
WINDOW = timedelta(days=90)
# Her most recent actions of each kind are plenty to know her by.
PER_KIND = 200
# Staying on a look this long says she was interested.
LONG_DWELL_MS = 10_000
CACHE_SECONDS = 10 * 60
# Visiting a stylist's page counts a little toward that stylist.
PAGE_VISIT = 1.0


@dataclass
class Affinity:
    # Style slug -> 0..1, her strongest style at 1.
    styles: dict = field(default_factory=dict)
    # Account id (str) of a poster or stylist -> 0..1.
    people: dict = field(default_factory=dict)
    # Look id -> how much she engaged with it (not normalised), for "similar" looks.
    looks: dict = field(default_factory=dict)

    def __bool__(self):
        return bool(self.styles or self.people or self.looks)


def _fade(when, now):
    days = max((now - when).total_seconds() / 86400, 0)
    return 0.5 ** (days / HALF_LIFE_DAYS)


def _normalise(weights):
    top = max(weights.values(), default=0)
    return {key: value / top for key, value in weights.items() if value > 0} if top else {}


def _compute(user, now):
    from apps.bookings.models import Booking
    from apps.looks.models import Look, LookComment, LookLike
    from apps.stylists.models import PageView

    from .models import FeedEvent

    since = now - WINDOW
    looks = defaultdict(float)
    people = defaultdict(float)

    def add(rows, action):
        for look, when in rows:
            looks[look] += ACTION_WEIGHTS[action] * _fade(when, now)

    add(LookLike.objects.filter(user=user, created_at__gte=since).order_by("-created_at").values_list("look_id", "created_at")[:PER_KIND], "like")
    add(LookComment.objects.filter(author=user, created_at__gte=since).order_by("-created_at").values_list("look_id", "created_at")[:PER_KIND], "comment")
    add(FeedEvent.objects.filter(user=user, kind="open", created_at__gte=since).order_by("-created_at").values_list("look_id", "created_at")[:PER_KIND], "open")
    # A long look counts as much again as opening it.
    add(FeedEvent.objects.filter(user=user, kind="dwell", dwell_ms__gte=LONG_DWELL_MS, created_at__gte=since).order_by("-created_at").values_list("look_id", "created_at")[:PER_KIND], "open")

    from apps.planner.models import CollectionItem

    saved = CollectionItem.objects.filter(
        kind="look", collection__user=user, created_at__gte=since
    ).order_by("-created_at").values_list("ref_id", "created_at")[:PER_KIND]
    add(((_as_uuid(ref), when) for ref, when in saved if _as_uuid(ref)), "save")

    for stylist, look, status, when in Booking.objects.filter(client=user, created_at__gte=since).order_by(
        "-created_at"
    ).values_list("stylist_id", "from_look_id", "status", "created_at")[:PER_KIND]:
        # A kept appointment says most of all.
        weight = ACTION_WEIGHTS["book"] * (2 if status == "completed" else 1) * _fade(when, now)
        if stylist:
            people[str(stylist)] += weight
        if look:
            looks[look] += weight
    for stylist, when in PageView.objects.filter(viewer=user, viewed_at__gte=since).order_by(
        "-viewed_at"
    ).values_list("stylist__account_id", "viewed_at")[:PER_KIND]:
        people[str(stylist)] += PAGE_VISIT * _fade(when, now)

    styles = defaultdict(float)
    tags = defaultdict(list)
    who = {}
    # Only what ranking may use: never the look's hair texture, never its price.
    for pk, author, stylist, slug in Look.objects.filter(pk__in=list(looks)).values_list(
        "pk", "author_id", "stylist_id", "styles__slug"
    ):
        if slug:
            tags[pk].append(slug)
        who[pk] = (str(author), stylist)
    for pk, weight in looks.items():
        for slug in tags.get(pk, ()):
            # A look in three styles says a third as much about each.
            styles[slug] += weight / len(tags[pk])
        author, stylist = who.get(pk, (None, None))
        if author and author != str(user.pk):
            people[author] += weight
        if stylist and stylist != str(user.pk):
            people[stylist] += weight
    people.pop(str(user.pk), None)

    return Affinity(styles=_normalise(styles), people=_normalise(people), looks=dict(looks))


def affinity_for(user, now=None):
    """Her affinities, or an empty one when signed out."""
    if user is None or not getattr(user, "is_authenticated", False):
        return Affinity()
    key = f"feed:affinity:{user.pk}"
    cached = None if now else cache.get(key)
    if cached is not None:
        return cached
    found = _compute(user, now or timezone.now())
    if not now:
        cache.set(key, found, CACHE_SECONDS)
    return found
