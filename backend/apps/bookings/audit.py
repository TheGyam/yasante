"""
The booking audit trail (plan, section 9): every change of status, proposal or
move is appended to BookingEvent with who made it. Views mark the actor on the
booking before saving (`booking._actor = request.user`); anything unmarked is the
system, such as a request lapsing or an appointment completing on its own.
"""

from datetime import timedelta

from django.db.models.signals import post_init, post_save
from django.utils import timezone
from django.dispatch import receiver

from .models import Booking, BookingEvent


def _role(booking, actor):
    if actor is None:
        return "system"
    if actor.pk == booking.client_id:
        return "client"
    if actor.pk == booking.stylist_id:
        return "stylist"
    return "staff"


@receiver(post_init, sender=Booking)
def remember(sender, instance, **kwargs):
    instance._audit_was = (
        (instance.status, instance.proposal, instance.move_request) if instance.pk else None
    )


@receiver(post_save, sender=Booking)
def record(sender, instance, created, **kwargs):
    actor = getattr(instance, "_actor", None)
    if created and actor is None:
        actor = instance.client  # a request is made by its client
    role = _role(instance, actor)
    events = []

    def add(action, before="", **data):
        events.append(
            BookingEvent(
                booking=instance,
                action=action,
                from_status=before,
                to_status=instance.status,
                actor=actor,
                actor_role=role,
                data=data,
            )
        )

    was = None if created else getattr(instance, "_audit_was", None)
    if was is None:
        add("created", requested_times=[t.isoformat() for t in instance.requested_times])
    else:
        status, proposal, move = was
        if instance.status != status:
            add("status", before=status, reason=instance.reason or None)
        if instance.proposal and instance.proposal != proposal:
            add("proposed", before=status, proposal=instance.proposal)
        if instance.move_request and instance.move_request != move:
            add("move_requested", before=status, move_request=instance.move_request)
        if move and not instance.move_request and instance.scheduled_for:
            add("move_answered", before=status, scheduled_for=instance.scheduled_for.isoformat())
    if not events:
        instance._audit_was = (instance.status, instance.proposal, instance.move_request)
        return
    # Strictly after the booking's last event, and a microsecond apart within one
    # save, so the trail always reads back in the order things happened, even when
    # the clock is coarse.
    last = BookingEvent.objects.filter(booking=instance).order_by("-at").values_list("at", flat=True).first()
    now = timezone.now()
    if last and now <= last:
        now = last + timedelta(microseconds=1)
    for i, event in enumerate(events):
        event.at = now + timedelta(microseconds=i)
    BookingEvent.objects.bulk_create(events)
    instance._audit_was = (instance.status, instance.proposal, instance.move_request)
