import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from .models import Booking, SlotInterest

"""
Background tasks for bookings.
"""


logger = logging.getLogger(__name__)


@shared_task
def expire_stale_requests():
    """Expire booking requests older than 48 hours."""

    now = timezone.now()
    expired = Booking.objects.filter(
        status="requested",
        expires_at__lte=now,
    ).update(status="expired")

    if expired:
        logger.info("Expired %d stale booking requests", expired)


@shared_task
def expire_unpaid_deposits():
    """Expire bookings awaiting deposit for more than 24 hours."""

    now = timezone.now()
    expired = Booking.objects.filter(
        status="awaiting_deposit",
        expires_at__lte=now,
    ).update(status="expired")

    if expired:
        logger.info("Expired %d unpaid deposits", expired)


@shared_task
def auto_complete_bookings():
    """Auto-complete bookings 24 hours after appointment end if nobody closed them."""

    now = timezone.now()
    cutoff = now - timedelta(hours=settings.BOOKING_AUTO_COMPLETE_HOURS)

    bookings = Booking.objects.filter(
        status="confirmed",
        scheduled_for__lte=cutoff,
    )

    count = 0
    for booking in bookings:
        end_time = booking.scheduled_for + timedelta(
            minutes=booking.duration_minutes or 120
        )
        if end_time + timedelta(hours=settings.BOOKING_AUTO_COMPLETE_HOURS) <= now:
            booking.status = "completed"
            booking.completed_at = now
            booking.save(update_fields=["status", "completed_at"])
            count += 1

    if count:
        logger.info("Auto-completed %d bookings", count)


@shared_task
def send_attendance_reminders():
    """Send day-before attendance reminders."""

    tomorrow = timezone.now().date() + timedelta(days=1)
    bookings = Booking.objects.filter(
        status="confirmed",
        scheduled_for__date=tomorrow,
        attendance_confirmed_at__isnull=True,
    )

    for booking in bookings:
        # TODO: Send push notification
        logger.info(
            "Attendance reminder for booking %s (client: %s)",
            booking.pk,
            booking.client_name,
        )


@shared_task
def open_check_ins():
    """Open check-ins at day 14 and day 28 after completion."""

    now = timezone.now()
    # Week 2: 14 days ago
    day_14 = now - timedelta(days=14)
    bookings_w2 = Booking.objects.filter(
        status="completed",
        completed_at__date=day_14.date(),
    ).exclude(check_ins__week=2)

    for booking in bookings_w2:
        logger.info("Week 2 check-in open for booking %s", booking.pk)
        # TODO: Send push notification

    # Week 4: 28 days ago
    day_28 = now - timedelta(days=28)
    bookings_w4 = Booking.objects.filter(
        status="completed",
        completed_at__date=day_28.date(),
    ).exclude(check_ins__week=4)

    for booking in bookings_w4:
        logger.info("Week 4 check-in open for booking %s", booking.pk)


@shared_task
def release_slots_to_waitlist(booking_id: str):
    """Notify waitlist when a slot opens from cancellation/expiry."""

    try:
        booking = Booking.objects.get(pk=booking_id)
    except Booking.DoesNotExist:
        return

    if not booking.scheduled_for:
        return

    date = booking.scheduled_for.date()
    interests = SlotInterest.objects.filter(
        stylist_id=booking.stylist_id,
        from_date__lte=date,
        to_date__gte=date,
        opened_on__isnull=True,
    ).exclude(client_id=booking.client_id)

    for interest in interests:
        interest.opened_on = date
        interest.save(update_fields=["opened_on"])
        logger.info("Slot opened for waitlist entry %s", interest.pk)
        # TODO: Send push notification
