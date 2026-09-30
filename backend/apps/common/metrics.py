"""
The section 20 numbers, week by week, for the staff metrics screen.
Computed on each visit: at Phase 1 volumes that's a handful of cheap counts.
Outreach numbers (stylists contacted, calls held) live in Akua's sheet, not here.
"""

from datetime import timedelta
from statistics import median

from django.db.models import Count, Q
from django.utils import timezone

from apps.stylists.numbers import monday_of

WEEKS = 8
PROFILE_FIELDS = ("texture", "length", "density", "porosity", "area", "budget")


def _rate(part, whole):
    return f"{100 * part / whole:.0f}%" if whole else "–"


def _hours(deltas):
    return f"{median(deltas).total_seconds() / 3600:.1f}h" if deltas else "–"


def activated_stylists():
    """All four: live page with 6+ photos, a priced menu, the bio link used, phone + proof."""
    from apps.stylists.models import StylistProfile

    return (
        StylistProfile.objects.filter(published=True, verification_tier__gte=1)
        .annotate(
            photos=Count("portfolio_photos", distinct=True),
            priced=Count("menu_items", filter=Q(menu_items__price__gt=0), distinct=True),
            web_views=Count("page_views", filter=Q(page_views__source="web"), distinct=True),
        )
        .filter(photos__gte=6, priced__gte=1, web_views__gte=1)
        .count()
    )


def week_row(start, end):
    from apps.bookings.models import Booking, ReviewReport
    from apps.looks.models import Look, LookComment, Report
    from apps.profiles.models import AnalyticsEvent
    from apps.stylists.models import PageView
    from apps.web.models import WaitlistEntry

    events = AnalyticsEvent.objects.filter(at__gte=start, at__lt=end)
    activity = events.aggregate(people=Count("user", distinct=True), anonymous=Count("anonymous_id", filter=Q(user=None) & ~Q(anonymous_id=""), distinct=True))
    active = activity["people"] + activity["anonymous"]
    looks = Look.objects.filter(created_at__gte=start, created_at__lt=end, author__is_staff=False)
    comments = LookComment.objects.filter(created_at__gte=start, created_at__lt=end).count()
    requests = Booking.objects.filter(created_at__gte=start, created_at__lt=end)
    request_counts = requests.aggregate(total=Count("pk"), confirmed=Count("pk", filter=Q(scheduled_for__isnull=False) & ~Q(status__in=["requested", "declined", "expired"])), deposit=Count("pk", filter=Q(deposit_amount__gt=0)))
    held = Booking.objects.filter(scheduled_for__gte=start, scheduled_for__lt=end)
    held_counts = held.aggregate(no_shows=Count("pk", filter=Q(status="no_show")), attended=Count("pk", filter=Q(status="completed")))
    no_shows, attended = held_counts["no_shows"], held_counts["attended"]
    reports = list(Report.objects.filter(created_at__gte=start, created_at__lt=end)) + list(
        ReviewReport.objects.filter(created_at__gte=start, created_at__lt=end)
    )
    resolve = [r.handled_at - r.created_at for r in reports if r.handled_at]
    look_count = looks.count()
    return {
        "week": start.date(),
        "wau": active,
        "bio_clicks": PageView.objects.filter(source="web", viewed_at__gte=start, viewed_at__lt=end).count(),
        "waitlist": WaitlistEntry.objects.filter(created_at__gte=start, created_at__lt=end).count(),
        "looks": look_count,
        "comments_per_look": f"{comments / look_count:.1f}" if look_count else "–",
        "requests": request_counts["total"],
        "confirm_rate": _rate(request_counts["confirmed"], request_counts["total"]),
        "deposit_rate": _rate(request_counts["deposit"], request_counts["total"]),
        "no_show_rate": _rate(no_shows, no_shows + attended),
        "reports": len(reports),
        "open_reports": sum(1 for r in reports if r.status == "open"),
        "time_to_resolve": _hours(resolve),
    }


def profile_completion():
    from apps.profiles.models import HairProfile

    complete = Q()
    for field in PROFILE_FIELDS:
        complete &= ~Q(**{field: ""}) & Q(**{f"{field}__isnull": False})
    counts = HairProfile.objects.aggregate(total=Count("pk"), complete=Count("pk", filter=complete))
    return _rate(counts["complete"], counts["total"])


def response_median():
    from apps.stylists.models import StylistProfile

    hours = [
        h
        for h in StylistProfile.objects.filter(published=True).values_list("response_hours", flat=True)
        if h is not None
    ]
    return f"{median(hours):.1f}h" if hours else "–"


def metrics_context():
    from apps.bookings.models import Booking

    now = timezone.now()
    this_week = monday_of(now)
    weeks = [
        week_row(this_week - timedelta(weeks=i), this_week - timedelta(weeks=i - 1)) for i in range(WEEKS)
    ]
    month_start = now - timedelta(days=30)
    context = {
        "title": "Metrics",
        "weeks": weeks,
        "activated": activated_stylists(),
        "completion": profile_completion(),
        "response": response_median(),
        "requests_30d": Booking.objects.filter(created_at__gte=month_start).count(),
    }
    return context
