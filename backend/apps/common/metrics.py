"""
The section 20 numbers, week by week, at /admin/metrics/ for staff.
Computed on each visit: at Phase 1 volumes that's a handful of cheap counts.
Outreach numbers (stylists contacted, calls held) live in Akua's sheet, not here.
"""

from datetime import timedelta
from statistics import median

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count, Q
from django.shortcuts import render
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
    active = events.exclude(user=None).values("user").distinct().count() + (
        events.filter(user=None).exclude(anonymous_id="").values("anonymous_id").distinct().count()
    )
    looks = Look.objects.filter(created_at__gte=start, created_at__lt=end, author__is_staff=False)
    comments = LookComment.objects.filter(created_at__gte=start, created_at__lt=end).count()
    requests = Booking.objects.filter(created_at__gte=start, created_at__lt=end)
    confirmed = requests.filter(
        Q(scheduled_for__isnull=False) & ~Q(status__in=["requested", "declined", "expired"])
    ).count()
    with_deposit = requests.filter(deposit_amount__gt=0).count()
    held = Booking.objects.filter(scheduled_for__gte=start, scheduled_for__lt=end)
    no_shows = held.filter(status="no_show").count()
    attended = held.filter(status="completed").count()
    reports = list(Report.objects.filter(created_at__gte=start, created_at__lt=end)) + list(
        ReviewReport.objects.filter(created_at__gte=start, created_at__lt=end)
    )
    resolve = [r.handled_at - r.created_at for r in reports if r.handled_at]
    return {
        "week": start.date(),
        "wau": active,
        "bio_clicks": PageView.objects.filter(source="web", viewed_at__gte=start, viewed_at__lt=end).count(),
        "waitlist": WaitlistEntry.objects.filter(created_at__gte=start, created_at__lt=end).count(),
        "looks": looks.count(),
        "comments_per_look": f"{comments / looks.count():.1f}" if looks.count() else "–",
        "requests": requests.count(),
        "confirm_rate": _rate(confirmed, requests.count()),
        "deposit_rate": _rate(with_deposit, requests.count()),
        "no_show_rate": _rate(no_shows, no_shows + attended),
        "reports": len(reports),
        "open_reports": sum(1 for r in reports if r.status == "open"),
        "time_to_resolve": _hours(resolve),
    }


def profile_completion():
    from apps.profiles.models import HairProfile

    rows = HairProfile.objects.values_list(*PROFILE_FIELDS)
    total = len(rows)
    complete = sum(1 for row in rows if all(row))
    return _rate(complete, total)


def response_median():
    from apps.stylists.models import StylistProfile

    hours = [
        h
        for h in StylistProfile.objects.filter(published=True).values_list("response_hours", flat=True)
        if h is not None
    ]
    return f"{median(hours):.1f}h" if hours else "–"


@staff_member_required
def metrics_view(request):
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
    return render(request, "admin/metrics.html", context)
