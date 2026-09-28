"""
Background tasks for bookings.

Every reminder is sent through `notify` with an event key, so the windows below can
be generous: a job that runs late or twice still sends each message once.
"""

from datetime import timedelta
from apps.common import zones

from celery import shared_task
from django.db.models import Count, Q
from django.utils import timezone

from apps.common.notifications import notify

from .held import release, sweep
from .models import Booking
from .notify import _when, to_client, to_stylist


@shared_task
def sweep_bookings():
    """Lapse requests and unpaid deposits (telling the waitlist), complete old appointments."""
    sweep()


# Older beat entries in the database still name these; they do the same sweep.
@shared_task
def expire_stale_requests():
    sweep()


@shared_task
def expire_unpaid_deposits():
    sweep()


@shared_task
def auto_complete_bookings():
    sweep()


def _local(dt, booking=None):
    """On the stylist's clock, where the appointment is."""
    return dt.astimezone(zones.of(getattr(booking, "stylist_profile", None)))


@shared_task
def send_reminders(now=None):
    """Every 15 minutes: prep, attendance, the stylist's heads-up, and the morning-of."""
    now = now or timezone.now()
    upcoming = Booking.objects.filter(
        status="confirmed", scheduled_for__gt=now, scheduled_for__lte=now + timedelta(hours=72)
    )
    for b in upcoming:
        until = b.scheduled_for - now
        if until > timedelta(hours=48):
            to_client(
                b,
                "prep",
                f"{_when(b.scheduled_for, b, b.client)} with {b.stylist_name}",
                "Three days to go. Check what to do with your hair before you arrive.",
                category="reminders",
            )
        elif timedelta(hours=12) < until <= timedelta(hours=24) and not b.attendance_confirmed_at:
            to_client(
                b,
                "attendance",
                "Still coming tomorrow?",
                f"{b.service_name} with {b.stylist_name}, {_when(b.scheduled_for, b, b.client)}.",
                category="reminders",
                action_category="attendance",
            )
        elif until <= timedelta(hours=12) and not b.attendance_confirmed_at:
            first = (b.client_name or "Your client").split()[0]
            to_stylist(
                b,
                "unconfirmed",
                f"{first} hasn’t confirmed",
                f"{_when(b.scheduled_for, b)}. You might message them to check.",
                category="reminders",
            )
        local, here = _local(b.scheduled_for, b), _local(now, b)
        if local.date() == here.date() and here.hour >= 7:
            zone = zones.of(b.stylist_profile)
            away = b.client is not None and zones.of(b.client).key != zone.key
            to_client(
                b,
                "today",
                f"Today at {local:%H:%M}" + (f" {zones.label(zone)}" if away else ""),
                f"{b.service_name} with {b.stylist_name}. The address is in your booking.",
                category="reminders",
            )
            to_stylist(
                b,
                "today",
                f"Today at {local:%H:%M}",
                f"{(b.client_name or 'A client').split()[0]}, {b.service_name}.",
                category="reminders",
            )


@shared_task
def open_check_ins(now=None):
    """Week 2 and week 4 after a style: ask how it's holding up."""
    now = now or timezone.now()
    for week in (2, 4):
        due = Booking.objects.filter(
            status="completed",
            completed_at__lte=now - timedelta(days=7 * week),
            completed_at__gt=now - timedelta(days=7 * week + 7),
        ).exclude(check_ins__week=week).exclude(check_ins__still_in=False)
        for b in due:
            notify(
                b.client_id,
                "check_ins",
                f"booking:{b.pk}:checkin:{week}",
                f"Week {week}: how’s your {b.service_name.lower()}?",
                "Three taps. It helps you and others with hair like yours.",
                url=f"/check-in/{b.pk}",
                mode="client",
                bookingId=str(b.pk),
            )


# Kept for the old beat entry; the day-before reminder now lives in send_reminders.
@shared_task
def send_attendance_reminders():
    send_reminders()


@shared_task
def weekly_digest(now=None):
    """Monday morning: each stylist's week ahead, and requests still waiting."""
    now = now or timezone.now()
    week_end = now + timedelta(days=7)
    rows = (
        Booking.objects.filter(
            Q(status="confirmed", scheduled_for__gte=now, scheduled_for__lt=week_end)
            | Q(status="requested")
        )
        .values("stylist_id")
        .annotate(
            booked=Count("id", filter=Q(status="confirmed")),
            waiting=Count("id", filter=Q(status="requested")),
        )
    )
    week = _local(now).date().isocalendar()
    for row in rows:
        parts = []
        if row["booked"]:
            parts.append(f"{row['booked']} appointment{'s' if row['booked'] != 1 else ''} this week")
        if row["waiting"]:
            parts.append(f"{row['waiting']} request{'s' if row['waiting'] != 1 else ''} waiting")
        notify(
            row["stylist_id"],
            "weekly_digest",
            f"digest:{row['stylist_id']}:{week[0]}-{week[1]}",
            "Your week",
            ", ".join(parts).capitalize() + ".",
            url="/requests",
            mode="stylist",
        )


@shared_task
def insurance_reminders(now=None):
    """A month, then a week, before a stylist's insurance runs out."""
    from apps.stylists.models import Verification

    now = now or timezone.now()
    for check in Verification.objects.filter(
        type="insurance", status="verified", expires_at__gt=now, expires_at__lte=now + timedelta(days=30)
    ):
        left = (check.expires_at - now).days
        stage = "week" if left <= 7 else "month"
        notify(
            check.account_id,
            "account",
            f"insurance:{check.pk}:{check.expires_at.date()}:{stage}",
            "Your insurance ends soon",
            f"It runs out on {check.expires_at:%d %b}. Upload the new certificate to keep your badge.",
            url="/stylist-setup",
            mode="stylist",
        )


@shared_task
def release_slots_to_waitlist(booking_id: str):
    """Tell the waitlist when a slot opens from a cancellation or expiry."""
    booking = Booking.objects.filter(pk=booking_id).first()
    if booking:
        release(booking)
