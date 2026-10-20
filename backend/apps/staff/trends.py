"""
Hair trends, the monthly research report: what styles people ask for, where, and at
what price, from bookings, looks and searches. Built to the research rules: totals never
rows, no group smaller than MIN_GROUP, areas never postcodes, months never times, no free
text, no photos, and anything broken down by hair only from people who said yes to research.
"""

from datetime import timedelta

from django.db.models import Count, F, Q
from django.db.models.functions import Coalesce, TruncMonth

# No group of fewer people than this is ever shown: it's merged into "Other" or left out.
MIN_GROUP = 20


def _month(field, zone):
    return TruncMonth(field, tzinfo=zone)


def _kept(n):
    return n if n and n >= MIN_GROUP else None


def hair_trends(bookings, looks, searches, start, end, zone, median):
    """(rows, meta) for the staff insights table. `median` is the database aggregate."""
    from apps.looks.models import Style
    from apps.profiles.models import research_participants

    styles = list(Style.objects.values_list("slug", "name"))
    names = dict(styles)
    price = Coalesce("actual_price", "price")
    # One count and one median per style, per month, the stylist's area and currency. Her
    # area, not the booking's: a home visit stores the client's postcode district.
    per = (
        bookings.filter(created_at__gte=start, created_at__lt=end)
        .annotate(month=_month("created_at", zone), place=F("stylist_profile__base_area"))
        .values("month", "place", "currency")
        .annotate(
            **{f"n{i}": Count("pk", filter=Q(styles__contains=[slug])) for i, (slug, _) in enumerate(styles)},
            **{f"p{i}": median(price, filter=Q(styles__contains=[slug])) for i, (slug, _) in enumerate(styles)},
        )
    )
    groups = {}
    for row in per:
        for i, (slug, _) in enumerate(styles):
            if row[f"n{i}"]:
                groups[(row["month"].date(), row["place"] or "", slug, row["currency"])] = (row[f"n{i}"], row[f"p{i}"])

    look_counts = {
        (row["month"].date(), row["area"], row["styles__slug"]): row["n"]
        for row in looks.filter(created_at__gte=start, created_at__lt=end, styles__isnull=False)
        .annotate(month=_month("created_at", zone))
        .values("month", "area", "styles__slug")
        .annotate(n=Count("pk"))
    }
    search_counts = {
        (row["month"].date(), row["filters__area"] or "", row["filters__style"]): row["n"]
        for row in searches.filter(created_at__gte=start, created_at__lt=end, surface="looks", filters__style__isnull=False)
        .annotate(month=_month("created_at", zone))
        .values("month", "filters__area", "filters__style")
        .annotate(n=Count("pk"))
    }

    def month_before(day):
        return (day.replace(day=1) - timedelta(days=1)).replace(day=1)

    rows, other = [], {}
    for (month, place, slug, currency), (n, median_price) in sorted(groups.items(), key=lambda kv: (kv[0][0], -kv[1][0])):
        if n < MIN_GROUP:
            other[month] = other.get(month, 0) + n
            continue
        before = _kept(groups.get((month_before(month), place, slug, currency), (0, None))[0])
        rows.append({
            "label": f"{names[slug]} · {place or 'Area not given'} · {month:%b %Y}",
            "values": [
                n,
                _kept(look_counts.get((month, place, slug))),
                _kept(search_counts.get((month, place, slug))),
                float(median_price) if median_price is not None else None,
                round((n - before) / before * 100) if before else None,
            ],
            "currency": currency,
        })
    # Small groups together, only if together they're big enough to show.
    for month, n in sorted(other.items()):
        if n >= MIN_GROUP:
            rows.append({"label": f"Other styles and areas · {month:%b %Y}", "values": [n, None, None, None, None]})

    # Rising: each style's bookings across areas, this month on last, both big enough.
    totals = {}
    for (month, _, slug, _), (n, _) in groups.items():
        totals[(month, slug)] = totals.get((month, slug), 0) + n
    latest = max((month for month, _ in totals), default=None)
    rising = []
    if latest:
        for slug, name in styles:
            now, then = _kept(totals.get((latest, slug))), _kept(totals.get((month_before(latest), slug)))
            if now and then and now > then:
                rising.append({"style": name, "change": round((now - then) / then * 100)})
        rising.sort(key=lambda r: -r["change"])

    # By hair: only people whose latest research answer is yes, and only big enough groups.
    by_hair = (
        bookings.filter(created_at__gte=start, created_at__lt=end, client__in=research_participants())
        .exclude(client__hair_profile__texture="")
        .values("client__hair_profile__texture")
        .annotate(**{f"n{i}": Count("pk", filter=Q(styles__contains=[slug])) for i, (slug, _) in enumerate(styles)})
    )
    hair = [
        {"style": names[slug], "hair": row["client__hair_profile__texture"], "bookings": row[f"n{i}"]}
        for row in by_hair
        for i, (slug, _) in enumerate(styles)
        if row[f"n{i}"] >= MIN_GROUP
    ]
    return rows, {
        "rising": rising[:5],
        "byHair": sorted(hair, key=lambda r: -r["bookings"]),
        "minGroup": MIN_GROUP,
        "note": f"Groups smaller than {MIN_GROUP} are merged into Other or left out. Hair types only count people who said yes to research.",
    }
