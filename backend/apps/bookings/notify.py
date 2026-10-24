"""
Booking notifications, the table in the Phase 1 plan (section 10), driven by the
booking itself: whenever a booking is saved with a new status, proposal or move,
the right person hears about it. Scheduled reminders live in tasks.py.

Every message says which mode it opens in and where, and has a unique event key,
so nothing is sent twice.
"""

from apps.common import zones

from django.db.models.signals import post_init, post_save
from django.dispatch import receiver

from apps.common.notifications import notify
from apps.common.timeparse import parse_iso

from .models import Booking

TRACKED = ("status", "proposal", "move_request")


def _when(dt, booking=None, reader=None):
    """
    Sat 26 Sep, 13:00 on the stylist's clock, since that's where it happens, marked
    "(UK time)" when the reader's phone is somewhere else.
    """
    if not dt:
        return "the time you asked for"
    zone = zones.of(getattr(booking, "stylist_profile", None))
    local = dt.astimezone(zone)
    mark = f" ({zones.label(zone)})" if reader is not None and zones.of(reader).key != zone.key else ""
    return f"{local:%a} {local.day} {local:%b}, {local:%H:%M}{mark}"


def _start(booking):
    return booking.scheduled_for or (booking.requested_times or [None])[0]


def _money(amount, currency="GBP"):
    from apps.common.countries import money

    return money(amount, currency)


def to_client(booking, event, title, body, category="booking_updates", **kw):
    notify(
        booking.client_id,
        category,
        f"booking:{booking.pk}:{event}",
        title,
        body,
        url=f"/bookings/{booking.pk}",
        mode="client",
        bookingId=str(booking.pk),
        **kw,
    )


def to_stylist(booking, event, title, body, category="booking_updates", **kw):
    notify(
        booking.stylist_id,
        category,
        f"booking:{booking.pk}:{event}",
        title,
        body,
        url=f"/requests/{booking.pk}",
        mode="stylist",
        bookingId=str(booking.pk),
        **kw,
    )


def on_status(booking, before):
    status, start = booking.status, _start(booking)
    first = (booking.client_name or "A client").split()[0]
    if status == "requested" and before is None:
        to_stylist(
            booking,
            "requested",
            f"New request from {first}",
            f"{booking.service_name} · {_when(start, booking)}. Accept, suggest a time, or decline.",
        )
    elif status == "awaiting_deposit":
        to_client(
            booking,
            "accepted",
            f"{booking.stylist_name} accepted",
            f"Send {_money(booking.deposit_amount, booking.currency)} to confirm {_when(start, booking, booking.client)}. The details are inside.",
        )
    elif status == "confirmed" and before in ("requested", "awaiting_deposit"):
        to_client(
            booking,
            "confirmed",
            f"Confirmed with {booking.stylist_name}",
            f"{_when(start, booking, booking.client)}. "
            + ("They’re coming to you. " if booking.at_client else "The address and ")
            + ("What to bring is in your booking." if booking.at_client else "what to bring are in your booking."),
        )
    elif status == "declined":
        to_client(
            booking,
            "declined",
            f"{booking.stylist_name} can’t take this one",
            "Other stylists nearby do the same style. Tap to look.",
        )
    elif status == "expired" and before == "requested":
        to_client(
            booking,
            "expired",
            "Your request lapsed",
            f"{booking.stylist_name} didn’t answer in time. Try another time or stylist.",
        )
    elif status == "expired" and before == "awaiting_deposit":
        to_client(
            booking,
            "deposit_expired",
            "The slot was released",
            f"The deposit for {booking.stylist_name} didn’t arrive in time.",
        )
    elif status in ("cancelled_in_time", "cancelled_late"):
        to_stylist(booking, "cancelled", f"{first} cancelled", f"{booking.service_name} · {_when(start, booking)}.")
    elif status == "cancelled_by_stylist":
        to_client(
            booking,
            "cancelled",
            f"{booking.stylist_name} cancelled",
            f"Your {_when(start, booking, booking.client)} appointment is off. Any deposit comes back to you.",
        )
    elif status == "no_show":
        to_client(
            booking,
            "no_show",
            "Marked as a no-show",
            "If you were there, tap to contest it.",
        )
    elif status == "completed":
        to_client(
            booking,
            "completed",
            f"How did {booking.stylist_name} do?",
            "Post your look and leave a review. Both take a minute.",
            category="after_appointment",
        )
        to_stylist(
            booking,
            "completed",
            "Share the result",
            f"Post {first}’s {booking.service_name.lower()} as a look for your page.",
            category="after_appointment",
        )


@receiver(post_init, sender=Booking)
def remember(sender, instance, **kwargs):
    instance._was = {f: getattr(instance, f) for f in TRACKED} if instance.pk else {}


@receiver(post_save, sender=Booking)
def announce(sender, instance, created, **kwargs):
    was = {} if created else getattr(instance, "_was", {})
    before = was.get("status")
    if created or instance.status != before:
        on_status(instance, None if created else before)
    if instance.proposal and instance.proposal != was.get("proposal"):
        proposed = instance.proposal.get("scheduled_for")
        to_client(
            instance,
            f"proposal:{proposed}",
            f"{instance.stylist_name} suggested another time",
            "Does it work for you? Tap to answer.",
        )
    if instance.move_request and instance.move_request != was.get("move_request"):
        asked_by = instance.move_request.get("by")
        target = to_stylist if asked_by == "client" else to_client
        target(
            instance,
            f"move:{instance.move_request.get('scheduled_for')}",
            "A request to move the appointment",
            "Tap to see the new time and answer.",
        )
    asked = was.get("move_request")
    if asked and not instance.move_request and instance.status == before:
        # Answered: whoever asked hears yes or no (a cancel says so itself).
        moved = instance.scheduled_for == parse_iso(asked.get("scheduled_for"))
        for_client = asked.get("by") == "client"
        other = instance.stylist_name if for_client else (instance.client_name or "Your client").split()[0]
        reader = instance.client if for_client else None
        (to_client if for_client else to_stylist)(
            instance,
            f"move-answer:{asked.get('scheduled_for')}",
            f"{other} said yes to the new time" if moved else f"{other} kept the original time",
            f"It’s now {_when(instance.scheduled_for, instance, reader)}." if moved else f"It stays {_when(instance.scheduled_for, instance, reader)}.",
        )
    instance._was = {f: getattr(instance, f) for f in TRACKED}
