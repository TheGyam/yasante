"""
How a booking is sent to each side.

The address is the one that matters: it is never sent before the booking is
confirmed. The client record and her hair go to the stylist only; a client never
sees her own record, and early cancellations are never counted in it.
"""

from django.utils import timezone

from .models import Booking, Review


def check_in_due(booking, answered_weeks, now=None):
    """Which check-in is open: each gets a fortnight to be answered."""
    if booking.status != "completed" or not booking.completed_at:
        return None
    days = ((now or timezone.now()) - booking.completed_at).total_seconds() / 86400
    if 28 <= days < 42 and 4 not in answered_weeks:
        return 4
    if 14 <= days < 28 and 2 not in answered_weeks:
        return 2
    return None


def client_record(booking):
    """Her record, counted from her history — never typed in by anyone."""
    theirs = Booking.objects.filter(client_id=booking.client_id)
    return {
        "attended": theirs.filter(status="completed").count(),
        "no_shows": theirs.filter(status="no_show").count(),
        # Cancelling in time is free, and never shown.
        "late_cancellations": theirs.filter(status="cancelled_late").count(),
    }


def client_hair(user):
    hair = getattr(user, "hair_profile", None) if user else None
    if not hair:
        return None
    parts = [
        hair.texture,
        f"{hair.length} length" if hair.length else "",
        f"{hair.porosity} porosity" if hair.porosity else "",
    ]
    return " · ".join(p for p in parts if p) or None


def _money(value):
    return float(value) if value is not None else None


def present_booking(booking, viewer):
    as_stylist = viewer is not None and booking.stylist_id == viewer.pk
    confirmed = booking.status in ("confirmed", "completed")
    review = Review.objects.filter(booking=booking).first()
    answered = set(booking.check_ins.values_list("week", flat=True))
    return {
        "id": str(booking.pk),
        "status": booking.status,
        "client_id": str(booking.client_id) if booking.client_id else None,
        "client_name": booking.client_name,
        "client_hair": client_hair(booking.client) if as_stylist else None,
        "client_record": client_record(booking) if as_stylist else None,
        "stylist_id": str(booking.stylist_id) if booking.stylist_id else None,
        "stylist_name": booking.stylist_name,
        "stylist_handle": booking.stylist_handle,
        "service_id": str(booking.service_id),
        "service_name": booking.service_name,
        "option_labels": booking.option_labels or None,
        "price": _money(booking.price),
        "from_price": booking.from_price,
        "duration_minutes": booking.duration_minutes,
        "bringing_own_hair": booking.bringing_own_hair,
        "hair_included": booking.hair_included,
        "notes": booking.notes,
        "calendar_url": booking.calendar_url if confirmed else None,
        "requested_times": booking.requested_times,
        "scheduled_for": booking.scheduled_for,
        "expires_at": booking.expires_at,
        "proposal": booking.proposal,
        "attendance_confirmed_at": booking.attendance_confirmed_at,
        "moves": booking.moves,
        "move_request": booking.move_request,
        "deposit": (
            {
                "amount": _money(booking.deposit_amount),
                "method": booking.deposit_method,
                "status": booking.deposit_status,
            }
            if booking.deposit_amount
            else None
        ),
        "area": booking.area,
        # Never sent before it's confirmed.
        "address": booking.address if confirmed else None,
        "policy": booking.policy,
        "policy_version": booking.policy_version,
        "reason": booking.reason,
        "completed_at": booking.completed_at,
        "actual_price": _money(booking.actual_price),
        "timing": (
            {
                "outcome": booking.timing_outcome,
                "bucket": booking.timing_bucket or None,
                "reason": booking.timing_reason or None,
            }
            if booking.timing_outcome
            else None
        ),
        "started_on_time": booking.started_on_time,
        "contested": (
            {"no_show": booking.contested_no_show or None, "timing": booking.contested_timing or None}
            if booking.contested_no_show or booking.contested_timing
            else None
        ),
        "review": (
            {"rating": review.rating, "status": review.status}
            if review and not as_stylist
            else None
        ),
        "check_in_due": None if as_stylist else check_in_due(booking, answered),
        "created_at": booking.created_at,
        "updated_at": booking.updated_at,
    }


def present_slot_interest(interest):
    return {
        "id": str(interest.pk),
        "stylist_id": str(interest.stylist_id),
        "stylist_name": interest.stylist_name,
        "stylist_handle": interest.stylist_handle,
        "from": interest.from_date.isoformat(),
        "to": interest.to_date.isoformat(),
        "opened_on": interest.opened_on.isoformat() if interest.opened_on else None,
        "created_at": interest.created_at,
    }


def present_review(review):
    return {
        "id": str(review.pk),
        "booking_id": str(review.booking_id),
        "rating": review.rating,
        "body": review.body,
        "status": review.status,
        "author_name": review.author_name,
        "service_name": review.service_name,
        "created_at": review.created_at,
    }
