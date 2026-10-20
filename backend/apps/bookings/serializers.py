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
    # Once she's said the style is out, there's nothing left to check on.
    if booking.check_ins.filter(still_in=False).exists():
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
    """What a stylist she books sees of her hair, only while she lets us use it."""
    from apps.profiles.models import has_consent

    hair = getattr(user, "hair_profile", None) if user else None
    if not hair or not has_consent(user, "personalisation"):
        return None
    parts = [
        hair.texture,
        f"{hair.length} length" if hair.length else "",
        f"{hair.porosity} porosity" if hair.porosity else "",
    ]
    return " · ".join(p for p in parts if p) or None


def _money(value):
    return float(value) if value is not None else None


def present_from_look(look):
    """The picture she booked from. Gone if the look has since been hidden or removed."""
    if look is None or look.status != "live":
        return None
    return {
        "id": str(look.pk),
        "photo_uri": look.photo_uri,
        "feed_uri": look.feed_uri or None,
        "thumb_uri": look.thumb_uri or None,
        "photo_aspect": look.photo_aspect or None,
        "caption": look.caption or None,
        "author_name": look.author.name if look.author_id else None,
    }


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
        "styles": booking.styles,
        "from_look": present_from_look(booking.from_look),
        "option_labels": booking.option_labels or None,
        "price": _money(booking.price),
        "currency": booking.currency,
        "from_price": booking.from_price,
        "duration_minutes": booking.duration_minutes,
        "bringing_own_hair": booking.bringing_own_hair,
        "hair_included": booking.hair_included,
        "notes": booking.notes,
        # A signed .ics link for this person: the phone's own "Add to calendar".
        "calendar_url": calendar_url(booking, viewer) if confirmed and viewer is not None and booking.scheduled_for else None,
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
        "at_client": booking.at_client,
        # Her clock, where it happens: times read in it, marked when that isn't yours.
        "time_zone": zones.of(booking.stylist_profile).key,
        # Never sent to the stylist before it's confirmed. A client always sees their
        # own address when the stylist is coming to them.
        "address": booking.address if confirmed or (booking.at_client and not as_stylist) else None,
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
        "opens": interest.opens,
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


# ── Shapes for the schema the app's types are generated from ─────────────────────
from apps.common import zones
from .ics import calendar_url
from rest_framework import serializers  # noqa: E402

from apps.common.schema import optional  # noqa: E402

from .models import BOOKING_STATUS_CHOICES  # noqa: E402
from .state_machine import VALID_TIMING_REASONS  # noqa: E402


class ClientRecordSerializer(serializers.Serializer):
    attended = serializers.IntegerField()
    no_shows = serializers.IntegerField()
    late_cancellations = serializers.IntegerField()


class MoneyMethodSerializer(serializers.Serializer):
    amount = serializers.FloatField()
    method = serializers.CharField()


class DepositSerializer(MoneyMethodSerializer):
    status = serializers.ChoiceField(choices=["awaiting", "received"])


class ProposalSerializer(serializers.Serializer):
    scheduled_for = serializers.DateTimeField()
    deposit = optional(MoneyMethodSerializer())


class MoveRequestSerializer(serializers.Serializer):
    by = serializers.ChoiceField(choices=["client", "stylist"])
    scheduled_for = serializers.DateTimeField()


class BookingPolicySerializer(serializers.Serializer):
    """Her policies as they were when the request was made."""

    notice_hours = serializers.IntegerField()
    deposit_type = serializers.ChoiceField(choices=["none", "fixed", "percent"])
    deposit_amount = optional(serializers.FloatField())
    reschedule_free_once = serializers.BooleanField()


class TimingSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(choices=["early", "on_time", "over"])
    bucket = optional(serializers.ChoiceField(choices=["under_30", "30_60", "1_2h", "2h_plus"]))
    reason = optional(serializers.ChoiceField(choices=sorted(VALID_TIMING_REASONS)))


class ContestedSerializer(serializers.Serializer):
    no_show = optional(serializers.BooleanField())
    timing = optional(serializers.BooleanField())


class ReviewStateSerializer(serializers.Serializer):
    rating = serializers.IntegerField()
    status = serializers.ChoiceField(choices=["pending", "published", "removed"])


class FromLookSerializer(serializers.Serializer):
    id = serializers.CharField()
    photo_uri = serializers.CharField()
    feed_uri = optional(serializers.CharField())
    thumb_uri = optional(serializers.CharField())
    photo_aspect = optional(serializers.FloatField())
    caption = optional(serializers.CharField())
    author_name = optional(serializers.CharField())


class BookingSerializer(serializers.Serializer):
    id = serializers.CharField()
    status = serializers.ChoiceField(choices=[c for c, _ in BOOKING_STATUS_CHOICES])
    client_id = optional(serializers.CharField())
    client_name = serializers.CharField()
    client_hair = optional(serializers.CharField())
    client_record = optional(ClientRecordSerializer())
    stylist_id = optional(serializers.CharField())
    stylist_name = serializers.CharField()
    stylist_handle = optional(serializers.CharField())
    service_id = serializers.CharField()
    service_name = serializers.CharField()
    styles = serializers.ListField(child=serializers.CharField(), help_text="Style slugs")
    from_look = optional(FromLookSerializer())
    option_labels = optional(serializers.ListField(child=serializers.CharField()))
    price = serializers.FloatField()
    currency = serializers.CharField(help_text="ISO 4217: the stylist's, when it was booked")
    from_price = serializers.BooleanField()
    duration_minutes = optional(serializers.IntegerField())
    bringing_own_hair = serializers.BooleanField()
    hair_included = optional(serializers.BooleanField())
    notes = optional(serializers.CharField())
    calendar_url = optional(serializers.CharField())
    requested_times = serializers.ListField(child=serializers.DateTimeField())
    scheduled_for = optional(serializers.DateTimeField())
    expires_at = optional(serializers.DateTimeField())
    proposal = optional(ProposalSerializer())
    attendance_confirmed_at = optional(serializers.DateTimeField())
    moves = serializers.IntegerField()
    move_request = optional(MoveRequestSerializer())
    deposit = optional(DepositSerializer())
    area = serializers.CharField()
    at_client = serializers.BooleanField(help_text="The stylist travels to the client")
    time_zone = serializers.CharField(help_text="The stylist's zone (IANA); times read in it")
    address = optional(serializers.CharField())
    policy = BookingPolicySerializer()
    policy_version = serializers.CharField()
    reason = optional(serializers.CharField())
    completed_at = optional(serializers.DateTimeField())
    actual_price = optional(serializers.FloatField())
    timing = optional(TimingSerializer())
    started_on_time = optional(serializers.BooleanField())
    contested = optional(ContestedSerializer())
    review = optional(ReviewStateSerializer())
    check_in_due = optional(serializers.ChoiceField(choices=[2, 4]))
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class SlotInterestSerializer(serializers.Serializer):
    id = serializers.CharField()
    stylist_id = serializers.CharField()
    stylist_name = serializers.CharField()
    stylist_handle = optional(serializers.CharField())
    opened_on = optional(serializers.DateField())
    opens = serializers.BooleanField(help_text="Waiting for days she isn't taking bookings for yet")
    created_at = serializers.DateTimeField()

    def get_fields(self):
        # "from" and "to" are Python keywords, so they're added by name.
        fields = super().get_fields()
        fields["from"] = serializers.DateField()
        fields["to"] = serializers.DateField()
        return fields


class ReviewSerializer(serializers.Serializer):
    id = serializers.CharField()
    booking_id = serializers.CharField()
    rating = serializers.IntegerField()
    body = optional(serializers.CharField())
    status = serializers.ChoiceField(choices=["pending", "published", "removed"])
    author_name = serializers.CharField()
    service_name = serializers.CharField()
    created_at = serializers.DateTimeField()


# ── Request shapes ───────────────────────────────────────────────────────────────
class BookingCreateRequestSerializer(serializers.Serializer):
    stylist_id = serializers.CharField()
    service_id = serializers.CharField()
    options = serializers.DictField(
        child=serializers.CharField(), required=False, help_text="Chosen option id by group id"
    )
    bringing_own_hair = serializers.BooleanField()
    requested_times = serializers.ListField(child=serializers.DateTimeField())
    notes = serializers.CharField(required=False)
    policy_version = serializers.CharField()
    look_id = serializers.CharField(required=False, help_text="The look the booking is from")
    at_client = serializers.BooleanField(required=False, help_text="The stylist comes to the client")
    client_address = serializers.CharField(required=False, help_text="When at_client: street and postcode in the UK, else street then area (\"12 Lagos Avenue, East Legon\")")


class AcceptRequestSerializer(serializers.Serializer):
    scheduled_for = serializers.DateTimeField()
    deposit = MoneyMethodSerializer(required=False)


class AnswerRequestSerializer(serializers.Serializer):
    accept = serializers.BooleanField()
    reason = serializers.CharField(required=False)


class ReasonRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False)


class CloseRequestSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(choices=["attended", "no_show"])
    actual_price = serializers.FloatField(required=False)
    timing = TimingSerializer(required=False)


class MoveRequestBodySerializer(serializers.Serializer):
    scheduled_for = serializers.DateTimeField()


class StartedOnTimeRequestSerializer(serializers.Serializer):
    on_time = serializers.BooleanField()


class ContestRequestSerializer(serializers.Serializer):
    what = serializers.ChoiceField(choices=["no_show", "timing"])


class ReviewCreateRequestSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    body = serializers.CharField(required=False)


class CheckInRequestSerializer(serializers.Serializer):
    week = serializers.ChoiceField(choices=[2, 4])
    holding = serializers.ChoiceField(choices=["fresh", "okay", "tired"])
    scalp = serializers.ChoiceField(
        choices=["comfortable", "itchy", "sore"], required=False, help_text="Only with hair details consent"
    )
    again = serializers.ChoiceField(choices=["yes", "maybe", "no"])
    still_in = serializers.BooleanField(required=False, help_text="Is the style still in?")
    came_out = serializers.ChoiceField(
        choices=["time", "hurt", "frizzy", "event", "other"],
        required=False,
        help_text="Why it came out, when it's out. \"hurt\" is kept only with hair details consent",
    )
    local_at = serializers.CharField(required=False, help_text="The phone's own clock")


class ReviewReportRequestSerializer(serializers.Serializer):
    reason = serializers.CharField()
    note = serializers.CharField(required=False)


class SlotInterestRequestSerializer(serializers.Serializer):
    stylist_id = serializers.CharField()

    def get_fields(self):
        fields = super().get_fields()
        fields["from"] = serializers.DateField()
        fields["to"] = serializers.DateField()
        return fields
