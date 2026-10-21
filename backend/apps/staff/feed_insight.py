"""
The ranked feed against the plain one, for deciding when to turn it on for everyone
(docs/FEED_PLAN.md, section 14). Aggregates only.

Ranked: people who used the ranked feed in the period (only they have feed activity).
Plain: everyone else who liked, saved, commented or booked in it. Each day's saves,
booking requests and Not for me are given per 100 people in each group.
"""

from datetime import timedelta

from django.db.models import Count, Q


def feed_comparison(events, start, end, zone, buckets):
    from apps.accounts.models import User
    from apps.bookings.models import Booking
    from apps.looks.models import NotForMe
    from apps.planner.models import CollectionItem

    period = events.filter(created_at__gte=start, created_at__lt=end)
    ranked = period.exclude(user=None).values("user_id").distinct()
    within = lambda prefix: {f"{prefix}__gte": start, f"{prefix}__lt": end}
    plain = (
        User.objects.filter(
            Q(**within("look_likes__created_at"))
            | Q(**within("collections__items__created_at"))
            | Q(**within("look_comments__created_at"))
            | Q(**within("bookings_as_client__created_at"))
        )
        .exclude(pk__in=ranked)
        .distinct()
    )
    sizes = {"ranked": period.exclude(user=None).aggregate(n=Count("user", distinct=True))["n"], "plain": plain.count()}
    groups = {"ranked": ranked, "plain": plain.values("pk")}

    def daily(qs, person):
        found = {}
        for group, ids in groups.items():
            for row in buckets(qs.filter(**{f"{person}__in": ids}), "created_at", start, end):
                found[(group, row["day"])] = row["value"]
        return found

    measures = [
        daily(CollectionItem.objects.filter(kind="look"), "collection__user"),
        daily(Booking.objects.all(), "client"),
        daily(NotForMe.objects.all(), "user"),
    ]

    def per_hundred(count, group):
        return round(100 * count / sizes[group], 1) if sizes[group] else None

    rows = []
    day = start.astimezone(zone).date()
    while day < end.astimezone(zone).date():
        rows.append({
            "label": str(day),
            "values": [per_hundred(m.get((g, day), 0), g) for m in measures for g in ("ranked", "plain")],
        })
        day += timedelta(days=1)

    shown = period.filter(kind="impression")
    impressions = shown.count()
    opens = period.filter(kind="open").count()
    meta = {
        "rankedPeople": sizes["ranked"],
        "plainPeople": sizes["plain"],
        "opensPerLookSeen": round(opens / impressions, 3) if impressions else None,
        "postersSeen": shown.values("look__author").distinct().count(),
        "note": "Per 100 people in each group. Ranked: people who used the ranked feed in this period. Plain: everyone else who liked, saved, commented or booked.",
    }
    return rows, meta
