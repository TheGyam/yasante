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


def usual_wash(washes):
    """(weekday, hour) she usually washes, by her phone's clock, once it's a habit:
    three washes on the same weekday. Otherwise None."""
    weekdays = Counter(e.local_weekday for e in washes if e.local_weekday)
    day, count = weekdays.most_common(1)[0] if weekdays else (None, 0)
    if count < 3:
        return None
    hours = Counter(e.local_hour for e in washes if e.local_weekday == day and e.local_hour is not None)
    return day, (hours.most_common(1)[0][0] if hours else None)


REMOVAL_WORDS = ("take down", "takedown", "take-down", "take out", "removal")
# Appointments that leave no style in: looking after hair rather than styling it.
NOT_A_STYLE = (*REMOVAL_WORDS, "wash", "treatment", "consultation", "trim", "condition", "steam")


def _is_removal(service_name):
    name = (service_name or "").lower()
    return any(word in name for word in REMOVAL_WORDS)


def _is_style(service_name):
    """An appointment that puts a style in: anything but a wash, a treatment or taking one out."""
    # A wash and go is a style, whatever the word "wash" says.
    name = (service_name or "").lower().replace("wash and go", "").replace("wash n go", "")
    return not any(word in name for word in NOT_A_STYLE)


def style_timing(user, now=None):
    """
    The style in now (or None) and how many days her styles have lasted, appointment
    to take-down, from what she logged herself. Nobody else's history comes into it.
    """
    from apps.bookings.models import Booking

    now = now or timezone.now()
    done = Booking.objects.filter(client=user, status="completed", scheduled_for__isnull=False)
    taken_down = {
        e.booking_id: e for e in user.hair_log.filter(kind="take_down", booking_id__isnull=False)
    }
    lasted = [_days(taken_down[b.pk].at, b.scheduled_for) for b in done.filter(pk__in=list(taken_down))]
    # The style in now: the latest appointment for a style (not a wash, a treatment or
    # taking one out) that hasn't been taken down since.
    recent = list(done.order_by("-scheduled_for")[:20])
    last = next((b for b in recent if _is_style(b.service_name)), None)
    removed_since = last is not None and any(
        b.scheduled_for > last.scheduled_for and _is_removal(b.service_name) for b in recent
    )
    current = None
    if (
        last
        and not removed_since
        and last.pk not in taken_down
        and not any(e.at > last.scheduled_for for e in taken_down.values())
    ):
        current = {"name": last.service_name, "since": last.scheduled_for, "days": _days(now, last.scheduled_for), "booking_id": str(last.pk)}
    return current, lasted


def insights(user, period="month", now=None):
    from apps.bookings.models import Booking
    from apps.planner.models import CarePlanSession, CollectionItem
    from apps.shelf.models import ShelfItem

    now = now or timezone.now()
    since = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0) if period == "month" else None

    def in_period(qs, field):
        return qs.filter(**{f"{field}__gte": since}) if since else qs

    # Appointments
    done = Booking.objects.filter(client=user, status="completed", scheduled_for__isnull=False)
    done_in_period = list(in_period(done, "scheduled_for").order_by("scheduled_for"))
    # Money is never added across currencies: what she spent in each, kept apart.
    from apps.common.countries import totals

    spending = totals((b.currency, b.actual_price or b.price or 0) for b in done_in_period)
    visits = Counter((b.stylist_name, b.stylist_handle) for b in done_in_period)
    favourite = None
    if visits:
        (fav_name, fav_handle), fav_times = visits.most_common(1)[0]
        if fav_times >= 2:
            favourite = {"name": fav_name, "handle": fav_handle or None, "times": fav_times}

    # The hair log, all of it (it's small): trims, washes, take-downs.
    log = list(user.hair_log.all().order_by("at"))
    washes = [e for e in log if e.kind == "wash"]
    trims = [e for e in log if e.kind == "trim"]
    current, lasted = style_timing(user, now)

    # Wash days: how many, and the day they usually fall on once there's a pattern.
    usual = (usual_wash(washes) or (None,))[0]
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
        "spending": spending,
        "styles": [b.service_name for b in done_in_period],
        "stylists": len({b.stylist_id for b in done_in_period}),
        "current_style": current,
        "style_lasts_days": round(mean(lasted)) if lasted else None,
        "washes": len([e for e in washes if not since or e.at >= since]),
        # Only once it's a habit: three washes on the same day.
        "usual_wash_day": WEEKDAYS[usual] if usual else None,
        "wash_every_days": round(mean(gaps)) if len(gaps) >= 2 else None,
        "days_since_trim": _days(now, trims[-1].at) if trims else None,
        "length": length,
        # What she had done, most often first: "Knotless braids, 3 times".
        "style_counts": [
            {"name": name, "times": times} for name, times in Counter(b.service_name for b in done_in_period).most_common()
        ],
        # The stylist she goes back to, once she's been more than once.
        "favourite_stylist": favourite,
        "hours_in_chair": round(sum(b.duration_minutes or 0 for b in done_in_period) / 60, 1),
        "trims": len([e for e in trims if not since or e.at >= since]),
        "care_plan_days": len(
            {s.completed_at.date() for s in in_period(CarePlanSession.objects.filter(user=user), "completed_at")}
        ),
        "looks_saved": in_period(CollectionItem.objects.filter(collection__user=user, kind="look"), "created_at").count(),
        "products_added": in_period(ShelfItem.objects.filter(user=user), "created_at").count(),
    }
