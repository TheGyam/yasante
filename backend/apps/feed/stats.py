"""
The numbers ranking reads, worked out ahead of time: how each look is doing
(LookStats) and which looks the same people engage with (LookNeighbour). Neither says
who did anything.
"""

import math
import uuid
from collections import Counter, defaultdict
from datetime import timedelta

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from .models import FeedEvent, LookNeighbour, LookStats

# What's rising is judged on the last few days.
RECENT = timedelta(days=3)
# Neighbours come from the last two months of what people did.
NEIGHBOUR_WINDOW = timedelta(days=60)
NEIGHBOURS_PER_LOOK = 50
# A save says more than a like; a booking more than anything.
ACTION_WEIGHTS = {"save": 3.0, "comment": 2.0, "like": 2.0, "open": 1.0, "book": 4.0}
# Each person's most recent looks, so one very busy person can't dominate.
LOOKS_PER_PERSON = 100


def _live_look_ids():
    from apps.looks.views import public_looks

    return set(public_looks().filter(visibility="public", status="live").values_list("pk", flat=True))


def _as_uuid(value):
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError):
        return None


def _saved_looks(**filters):
    """(person, look id) for each look saved to a collection, from collection items."""
    from apps.planner.models import CollectionItem

    for person, ref in CollectionItem.objects.filter(kind="look", **filters).values_list(
        "collection__user_id", "ref_id"
    ):
        look = _as_uuid(ref)
        if look:
            yield person, look


def refresh_look_stats(now=None):
    """Every live look's numbers, in one pass."""
    # ponytail: recomputes every look each time; switch to updating only looks with new
    # activity once there are more than about 100,000 live looks.
    from apps.bookings.models import Booking
    from apps.looks.models import Look, LookComment, LookLike, NotForMe, Report

    now = now or timezone.now()
    since = now - RECENT
    live = Look.objects.filter(pk__in=_live_look_ids()).values_list("pk", "like_count", "save_count", "comment_count")

    feed = {
        row["look_id"]: row
        for row in FeedEvent.objects.values("look_id").annotate(
            impressions=Count("pk", filter=Q(kind="impression")),
            opens=Count("pk", filter=Q(kind="open")),
            dwell=Sum("dwell_ms", filter=Q(kind="dwell")),
            recent=Count("pk", filter=Q(kind="impression", created_at__gte=since)),
        )
    }
    recent = Counter(LookLike.objects.filter(created_at__gte=since).values_list("look_id", flat=True))
    recent.update(look for _, look in _saved_looks(created_at__gte=since))
    recent.update(
        LookComment.objects.filter(created_at__gte=since, status="live").values_list("look_id", flat=True)
    )
    bookings = Counter(Booking.objects.exclude(from_look=None).values_list("from_look_id", flat=True))
    recent.update(
        Booking.objects.exclude(from_look=None).filter(created_at__gte=since).values_list("from_look_id", flat=True)
    )
    not_for_me = Counter(NotForMe.objects.exclude(look=None).values_list("look_id", flat=True))
    reports = Counter(
        Report.objects.filter(status="open", content_type=ContentType.objects.get_for_model(Look)).values_list(
            "object_id", flat=True
        )
    )

    rows = []
    for pk, likes, saves, comments in live:
        events = feed.get(pk, {})
        rows.append(
            LookStats(
                look_id=pk,
                impressions=events.get("impressions", 0),
                opens=events.get("opens", 0),
                dwell_ms=events.get("dwell") or 0,
                likes=likes,
                saves=saves,
                comments=comments,
                bookings=bookings[pk],
                not_for_me=not_for_me[pk],
                open_reports=reports[pk],
                recent_impressions=events.get("recent", 0),
                recent_engagements=recent[pk],
                updated_at=now,
            )
        )
    fields = [f.name for f in LookStats._meta.concrete_fields if f.name != "look"]
    LookStats.objects.bulk_create(rows, update_conflicts=True, unique_fields=["look"], update_fields=fields)
    return len(rows)


def _what_people_did(since):
    """{person: {look: weight}}: each person's engagement with each live look."""
    from apps.bookings.models import Booking
    from apps.looks.models import LookComment, LookLike

    live = _live_look_ids()
    did = defaultdict(lambda: defaultdict(float))

    def add(pairs, action):
        for person, look in pairs:
            if person and look in live:
                did[person][look] += ACTION_WEIGHTS[action]

    add(LookLike.objects.filter(created_at__gte=since).values_list("user_id", "look_id"), "like")
    add(_saved_looks(created_at__gte=since), "save")
    add(LookComment.objects.filter(created_at__gte=since).values_list("author_id", "look_id"), "comment")
    add(FeedEvent.objects.filter(kind="open", created_at__gte=since).values_list("user_id", "look_id"), "open")
    add(
        Booking.objects.exclude(from_look=None).filter(created_at__gte=since).values_list("client_id", "from_look_id"),
        "book",
    )
    return did


def refresh_neighbours(now=None):
    """
    Item-to-item similarity, as Pinterest and Amazon do it: two looks are close when the
    same people engage with both. Cosine similarity, with busy people's engagement damped
    and pairs few people share discounted, keeping the 50 closest looks for each.
    """
    # ponytail: pairs within each person's looks in Python; move to SQL or a sparse
    # matrix once that's more than a few million pairs a night.
    now = now or timezone.now()
    did = _what_people_did(now - NEIGHBOUR_WINDOW)
    dot, shared, norm = defaultdict(float), Counter(), defaultdict(float)
    for looks in did.values():
        top = sorted(looks.items(), key=lambda kv: -kv[1])[:LOOKS_PER_PERSON]
        # Someone who engages with everything says less about any two looks.
        damp = 1 / math.log2(2 + len(top))
        weighted = [(look, weight * damp) for look, weight in top]
        for look, weight in weighted:
            norm[look] += weight * weight
        for i, (a, wa) in enumerate(weighted):
            for b, wb in weighted[i + 1 :]:
                pair = (a, b) if str(a) < str(b) else (b, a)
                dot[pair] += wa * wb
                shared[pair] += 1

    close = defaultdict(list)
    for (a, b), value in dot.items():
        n = shared[(a, b)]
        # One person liking both is a hint; ten is a pattern.
        score = value / math.sqrt(norm[a] * norm[b]) * n / (n + 2)
        close[a].append((score, b))
        close[b].append((score, a))

    rows = [
        LookNeighbour(look_id=look, neighbour_id=other, score=score)
        for look, pairs in close.items()
        for score, other in sorted(pairs, key=lambda p: -p[0])[:NEIGHBOURS_PER_LOOK]
    ]
    with transaction.atomic():
        LookNeighbour.objects.all().delete()
        LookNeighbour.objects.bulk_create(rows, batch_size=2000)
    return len(rows)
