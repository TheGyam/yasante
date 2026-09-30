"""Database aggregates only; Python shapes aggregate buckets, never source rows."""
from datetime import timedelta
from zoneinfo import ZoneInfo
from django.db.models import Avg, Count, Sum, Q, F, FloatField, Aggregate
from django.db.models.functions import Coalesce, TruncDate, TruncWeek, ExtractIsoWeekDay, ExtractHour
from .access import workspace_url

UK = ZoneInfo("Europe/London")
SOURCES = {
    "money": ["bookings.booking"], "funnel": ["bookings.booking"], "growth": ["accounts.user", "stylists.stylistprofile"],
    "booking-times": ["bookings.booking"], "areas": ["profiles.hairprofile", "stylists.stylistprofile"], "empty-searches": ["common.searchlog"],
    "retention": ["accounts.user", "profiles.analyticsevent"], "top-stylists": ["bookings.booking", "stylists.stylistprofile"],
    "community": ["looks.look", "looks.lookcomment", "looks.report"], "app-health": ["common.clienterror", "profiles.analyticsevent"],
}
TITLES = {"money": "Booking value", "funnel": "From request to appointment", "growth": "People joining Yasante", "booking-times": "When people book",
          "areas": "Where to recruit", "empty-searches": "Searches that found nothing", "retention": "People coming back", "top-stylists": "Top stylists",
          "community": "Community health", "app-health": "App health"}


class Median(Aggregate):
    function = "PERCENTILE_CONT"
    template = "%(function)s(0.5) WITHIN GROUP (ORDER BY %(expressions)s)"
    output_field = FloatField()


def buckets(qs, field, start, end, value=None, weekly=False):
    trunc = TruncWeek if weekly else TruncDate
    return list(qs.filter(**{f"{field}__gte": start, f"{field}__lt": end}).annotate(day=trunc(field, tzinfo=UK)).values("day")
                .annotate(value=value if value is not None else Count("pk")).order_by("day"))


def calculate(name, sources, start, end):
    source = sources[SOURCES[name][0]]
    field = "updated_at" if name == "areas" else "created_at"
    qs = source.filter(**{f"{field}__gte": start, f"{field}__lt": end})
    rows, labels, kind, meta = [], ["Total"], "line", {}
    if name == "money":
        paid = qs.filter(status="completed")
        totals = paid.aggregate(total=Sum(Coalesce("actual_price", "price")), average=Avg(Coalesce("actual_price", "price")), deposits=Sum("deposit_amount", filter=Q(deposit_status="paid")))
        meta = {key: float(value or 0) for key, value in totals.items()}
        rows = list(paid.annotate(day=TruncWeek("created_at", tzinfo=UK)).values("day").annotate(value=Sum(Coalesce("actual_price", "price")), deposit=Sum("deposit_amount", filter=Q(deposit_status="paid"))).order_by("day"))
        rows = [{"label": str(row["day"].date()), "values": [float(row["value"] or 0)-float(row["deposit"] or 0), float(row["deposit"] or 0)], "url": f"{workspace_url('bookings.booking')}?status__exact=completed&created_at__gte={row['day'].date()}&created_at__lt={(row['day']+timedelta(days=7)).date()}"} for row in rows]
        labels, kind = ["Booking value excluding deposit", "Deposits collected"], "stacked-bar"
    elif name == "funnel":
        counts = qs.aggregate(requested=Count("pk"), confirmed=Count("pk", filter=Q(scheduled_for__isnull=False) & ~Q(status__in=["requested", "declined", "expired"])), deposit=Count("pk", filter=Q(deposit_status="paid")), completed=Count("pk", filter=Q(status="completed")), no_show=Count("pk", filter=Q(status="no_show")), declined=Count("pk", filter=Q(status="declined")))
        meta = counts
        # A deposit is optional, so it isn't a step everyone passes; it's reported beside.
        steps = [("Requested", "requested", ""), ("Confirmed", "confirmed", "scheduled_for__isnull=False"), ("Completed", "completed", "status__exact=completed")]
        rows = [{"label": label, "values": [counts[key]], "url": f"/records/bookings/booking?created_at__gte={start.date()}&created_at__lt={end.date()}&{filters}"} for label, key, filters in steps]
        kind = "bar"
    elif name == "growth":
        clients = buckets(source.filter(roles__contains=["client"]), "created_at", start, end)
        stylists = buckets(sources["stylists.stylistprofile"], "created_at", start, end)
        days = sorted({row["day"] for row in clients+stylists})
        lookup = [{row["day"]: row["value"] for row in group} for group in (clients, stylists)]
        rows = [{"label": str(day), "values": [group.get(day, 0) for group in lookup], "url": f"/records/accounts/user?created_at__date={day}"} for day in days]
        labels, kind = ["Clients", "Stylists"], "area"
    elif name == "booking-times":
        values = source.filter(scheduled_for__gte=start, scheduled_for__lt=end).annotate(weekday=ExtractIsoWeekDay("scheduled_for", tzinfo=UK), hour=ExtractHour("scheduled_for", tzinfo=UK)).values("weekday", "hour").annotate(value=Count("pk")).order_by("weekday", "hour")
        rows = [{"label": f"{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][row['weekday']-1]} {row['hour']:02}:00", "values": [row["value"]], "x": row["hour"], "y": row["weekday"]-1} for row in values]
        kind = "heatmap"
    elif name == "areas":
        demand = list(source.exclude(area="").values("area").annotate(value=Count("pk")).order_by("-value")[:12])
        supply = {row["base_area"]: row["value"] for row in sources["stylists.stylistprofile"].filter(published=True).values("base_area").annotate(value=Count("pk"))}
        rows = [{"label": row["area"], "values": [row["value"], supply.get(row["area"], 0)], "url": "/records/stylists/stylistprofile?" + __import__('urllib.parse', fromlist=['urlencode']).urlencode({"base_area__exact": row["area"]})} for row in demand]
        labels, kind = ["People in area", "Active stylists"], "bar"
        meta["note"] = "Current hair-profile areas and published stylists; these are current totals, not historical snapshots."
    elif name == "empty-searches":
        rows = [{"label": row["query"], "values": [row["value"]], "url": "/records/common/searchlog?" + __import__('urllib.parse', fromlist=['urlencode']).urlencode({"q": row["query"], "result_count__exact": 0})} for row in qs.filter(result_count=0).exclude(query="").values("query").annotate(value=Count("pk")).order_by("-value")[:12]]
        kind = "bar"
    elif name == "retention":
        cohorts = {row["week"].date(): row["value"] for row in source.annotate(week=TruncWeek("created_at", tzinfo=UK)).filter(created_at__gte=start, created_at__lt=end).values("week").annotate(value=Count("pk"))}
        active = sources["profiles.analyticsevent"].filter(user__created_at__gte=start, user__created_at__lt=end, at__gte=start, at__lt=end).annotate(cohort=TruncWeek("user__created_at", tzinfo=UK), week=TruncWeek("at", tzinfo=UK)).values("cohort", "week").annotate(value=Count("user", distinct=True))
        rows = [{"label": f"{row['cohort'].date()} · week {(row['week'].date()-row['cohort'].date()).days//7}", "values": [round(100*row["value"]/cohorts[row["cohort"].date()], 1)], "x": (row["week"].date()-row["cohort"].date()).days//7, "y": sorted(cohorts).index(row["cohort"].date()), "active": row["value"], "cohort": cohorts[row["cohort"].date()]} for row in active if row["week"] >= row["cohort"]]
        labels, kind = ["Active %"], "heatmap"
    elif name == "top-stylists":
        top = qs.filter(status="completed", stylist_profile__isnull=False).values("stylist_profile_id", "stylist_name", "stylist_profile__rating_average", "stylist_profile__response_hours").annotate(value=Count("pk"), total=Sum(Coalesce("actual_price", "price"))).order_by("-value")[:10]
        rows = [{"label": row["stylist_name"], "values": [row["value"], float(row["total"] or 0), float(row["stylist_profile__rating_average"] or 0), row["stylist_profile__response_hours"]], "url": f"/records/stylists/stylistprofile/{row['stylist_profile_id']}"} for row in top]
        labels, kind = ["Bookings", "Value (£)", "Rating", "Response (h)"], "table"
    elif name == "community":
        looks = buckets(source, "created_at", start, end)
        comments = buckets(sources["looks.lookcomment"], "created_at", start, end)
        opened = buckets(sources["looks.report"], "created_at", start, end)
        closed = buckets(sources["looks.report"], "handled_at", start, end)
        days = sorted({row["day"] for row in looks+comments+opened+closed})
        maps = [{row["day"]: row["value"] for row in group} for group in (looks, comments, opened, closed)]
        rows = [{"label": str(day), "values": [maps[0].get(day, 0), round(maps[1].get(day, 0)/maps[0][day], 2) if maps[0].get(day) else 0, maps[2].get(day, 0), maps[3].get(day, 0)], "url": f"/records/looks/look?created_at__date={day}"} for day in days]
        labels = ["Looks", "Comments per look", "Reports opened", "Reports resolved"]
        from django.db.models.functions import Extract
        meta["medianResolutionHours"] = sources["looks.report"].filter(handled_at__gte=start, handled_at__lt=end).aggregate(value=Median(Extract(F("handled_at")-F("created_at"), "epoch")/3600.0))["value"]
    elif name == "app-health":
        # Errors per 1,000 active people a day, by platform. Active people come from
        # analytics (signed-in users plus anonymous ids); boot reports only arrive on
        # trouble, so they can't be the denominator.
        platforms = [("ios", "App (iPhone)"), ("android", "App (Android)"), ("web", "Website"), ("staff", "Staff"), ("server", "Server")]
        errors = {(row["day"], row["platform"]): row["value"] for row in qs.exclude(kind="boot").annotate(day=TruncDate("created_at", tzinfo=UK)).values("day", "platform").annotate(value=Count("pk"))}
        events = sources["profiles.analyticsevent"].filter(at__gte=start, at__lt=end).annotate(day=TruncDate("at", tzinfo=UK)).values("day")
        active = {row["day"]: row["people"] + row["anonymous"] for row in events.annotate(
            people=Count("user", distinct=True), anonymous=Count("anonymous_id", filter=Q(user=None) & ~Q(anonymous_id=""), distinct=True))}
        days = sorted({day for day, _ in errors} | set(active))
        rows = [{"label": str(day), "values": [errors.get((day, key), 0) for key, _ in platforms],
                 "rate": round(1000 * sum(errors.get((day, key), 0) for key, _ in platforms if key != "server") / active[day], 1) if active.get(day) else None,
                 "url": f"/errors?since={day}"} for day in days]
        labels, kind = [label for _, label in platforms], "line"
        meta["note"] = "Rate = app and website errors per 1,000 people active that day."
    return {"name": name, "title": TITLES[name], "kind": kind, "labels": labels, "rows": rows, "meta": meta}
