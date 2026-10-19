"""
A client's hair, in numbers: this month (or ever), worked out from what they already
do in the app — appointments, the hair log, their hair profile's history, what they
save and put on their shelf. Nothing here is asked for; it's all already recorded.
"""

from collections import Counter
from statistics import mean

from django.utils import timezone

from .models import LENGTH_CHOICES

LENGTH_RANK = {value: rank for rank, (value, _) in enumerate(LENGTH_CHOICES)}
LENGTH_LABEL = dict(LENGTH_CHOICES)
WEEKDAYS = {1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday", 7: "Sunday"}


def _days(later, earlier):
    return max(0, (later - earlier).days)


def insights(user, period="month", now=None):
    from apps.bookings.models import Booking
    from apps.planner.models import CollectionItem
    from apps.shelf.models import ShelfItem

    now = now or timezone.now()
    since = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0) if period == "month" else None

    def in_period(qs, field):
        return qs.filter(**{f"{field}__gte": since}) if since else qs

    # Appointments
    done = Booking.objects.filter(client=user, status="completed", scheduled_for__isnull=False)
    done_in_period = list(in_period(done, "scheduled_for").order_by("scheduled_for"))
    # Money never mixes currencies: spending is counted in the one she's spent most often
    # in (nearly always her own country's), and other currencies are left out of it.
    from collections import Counter

    currency = Counter(b.currency for b in done_in_period).most_common(1)[0][0] if done_in_period else None
    spent = sum(float(b.actual_price or b.price or 0) for b in done_in_period if b.currency == currency)

    # The hair log, all of it (it's small): trims, washes, take-downs.
    log = list(user.hair_log.all().order_by("at"))
    washes = [e for e in log if e.kind == "wash"]
    trims = [e for e in log if e.kind == "trim"]
    taken_down = {e.booking_id: e for e in log if e.kind == "take_down" and e.booking_id}

    # How long a style lasts: appointment to take-down, for the ones they said.
    lasted = [
        _days(taken_down[b.pk].at, b.scheduled_for)
        for b in done.filter(pk__in=list(taken_down))
    ]
    # The style in now: the latest appointment not yet taken down, unless a
    # take-down came after it.
    last = done.order_by("-scheduled_for").first()
    current = None
    if last and last.pk not in taken_down and not any(e.at > last.scheduled_for for e in taken_down.values()):
        current = {"name": last.service_name, "since": last.scheduled_for, "days": _days(now, last.scheduled_for), "booking_id": str(last.pk)}

    # Wash days: how many, and the day they usually fall on once there's a pattern.
    weekdays = Counter(e.local_weekday for e in washes if e.local_weekday)
    usual, count = weekdays.most_common(1)[0] if weekdays else (None, 0)
    gaps = [_days(b.at, a.at) for a, b in zip(washes, washes[1:])]

    # Length: where it is, and how it's moved (in the period, or since they started).
    profile = getattr(user, "hair_profile", None)
    snapshots = list(user.hair_snapshots.exclude(length="").order_by("recorded_at"))
    before = None
    if since:
        before = next((s for s in reversed(snapshots) if s.recorded_at < since), None)
    elif snapshots:
        before = snapshots[0]
    length = None
    if profile and profile.length:
        length = {
            "now": LENGTH_LABEL.get(profile.length, profile.length),
            "now_cm": profile.length_cm,
            "measured_at": profile.length_measured_at,
            "grew_cm": (
                round(profile.length_cm - before.length_cm, 1)
                if before and before.length_cm is not None and profile.length_cm is not None
                else None
            ),
            # Steps down the length chart (ear, chin, neck…) since then.
            "grew_steps": (
                LENGTH_RANK.get(profile.length, 0) - LENGTH_RANK.get(before.length, 0) if before else None
            ),
        }

    return {
        "period": period,
        "since": since,
        "appointments": len(done_in_period),
        "spent": round(spent, 2),
        "currency": currency,
        "styles": [b.service_name for b in done_in_period],
        "stylists": len({b.stylist_id for b in done_in_period}),
        "current_style": current,
        "style_lasts_days": round(mean(lasted)) if lasted else None,
        "washes": len([e for e in washes if not since or e.at >= since]),
        # Only once it's a habit: three washes on the same day.
        "usual_wash_day": WEEKDAYS[usual] if usual and count >= 3 else None,
        "wash_every_days": round(mean(gaps)) if len(gaps) >= 2 else None,
        "days_since_trim": _days(now, trims[-1].at) if trims else None,
        "length": length,
        "looks_saved": in_period(CollectionItem.objects.filter(collection__user=user, kind="look"), "created_at").count(),
        "products_added": in_period(ShelfItem.objects.filter(user=user), "created_at").count(),
    }
