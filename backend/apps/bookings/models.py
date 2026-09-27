"""
Booking models: Booking, Review, CheckIn, SlotInterest.
"""

import uuid

from apps.common.models import TimeStampedModel
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from apps.common.domains import domain_field
from django.db import models
from django.utils import timezone

BOOKING_STATUS_CHOICES = [
    ("requested", "Requested"),
    ("awaiting_deposit", "Awaiting Deposit"),
    ("confirmed", "Confirmed"),
    ("completed", "Completed"),
    ("declined", "Declined"),
    ("expired", "Expired"),
    ("cancelled_in_time", "Cancelled In Time"),
    ("cancelled_late", "Cancelled Late"),
    ("cancelled_by_stylist", "Cancelled By Stylist"),
    ("no_show", "No Show"),
]

TIMING_OUTCOME_CHOICES = [
    ("early", "Early"),
    ("on_time", "On Time"),
    ("over", "Over"),
]

TIMING_BUCKET_CHOICES = [
    ("under_30", "Under 30 min"),
    ("30_60", "30–60 min"),
    ("1_2h", "1–2 hrs"),
    ("2h_plus", "2 hrs or more"),
]


class Booking(TimeStampedModel):
    """
    The core booking record. The server owns every state transition.
    """

    status = models.CharField(
        max_length=30,
        choices=BOOKING_STATUS_CHOICES,
        default="requested",
        db_index=True,
    )

    # Parties
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="bookings_as_client",
    )
    client_name = models.CharField(max_length=150)
    client_hair = models.CharField(max_length=200, blank=True, default="")

    stylist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="bookings_as_stylist",
    )
    stylist_profile = models.ForeignKey(
        "stylists.StylistProfile",
        on_delete=models.SET_NULL,
        null=True,
        related_name="bookings",
    )
    stylist_name = models.CharField(max_length=150)
    stylist_handle = models.CharField(max_length=50, blank=True, default="")

    # Service snapshot (frozen at booking time)
    service_id = models.UUIDField()
    service_name = models.CharField(max_length=150)
    # The look she booked from, if she did: the stylist sees the exact picture.
    from_look = models.ForeignKey(
        "looks.Look", on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings"
    )
    # Style slugs, copied from her menu at booking time: "braids six times this year".
    styles = ArrayField(models.CharField(max_length=100), default=list, blank=True)
    option_labels = ArrayField(
        models.CharField(max_length=100), default=list, blank=True
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    from_price = models.BooleanField(default=False)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    bringing_own_hair = models.BooleanField(default=False)
    hair_included = models.BooleanField(null=True, blank=True)
    notes = models.TextField(max_length=1000, blank=True, default="")

    # Scheduling
    requested_times = ArrayField(models.DateTimeField(), default=list)
    scheduled_for = models.DateTimeField(null=True, blank=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    proposal = models.JSONField(null=True, blank=True)  # { scheduledFor, deposit? }
    attendance_confirmed_at = models.DateTimeField(null=True, blank=True)
    moves = models.PositiveSmallIntegerField(default=0)
    move_request = models.JSONField(null=True, blank=True)  # { by, scheduledFor }

    # Deposit
    deposit_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    deposit_method = models.CharField(max_length=200, blank=True, default="")
    deposit_status = models.CharField(max_length=20, blank=True, default="")

    # Location
    area = models.CharField(max_length=100)
    address = models.CharField(max_length=500, blank=True, default="")

    # Policies snapshot
    policy = models.JSONField(default=dict)
    policy_version = models.CharField(max_length=50)

    # Outcome
    reason = models.TextField(max_length=500, blank=True, default="")
    completed_at = models.DateTimeField(null=True, blank=True)
    actual_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    timing_outcome = models.CharField(
        max_length=20, choices=TIMING_OUTCOME_CHOICES, blank=True, default=""
    )
    timing_bucket = models.CharField(
        max_length=20, choices=TIMING_BUCKET_CHOICES, blank=True, default=""
    )
    timing_reason = models.CharField(max_length=30, blank=True, default="")
    started_on_time = models.BooleanField(null=True, blank=True)
    contested_no_show = models.BooleanField(default=False)
    contested_timing = models.BooleanField(default=False)

    # Calendar
    calendar_url = models.URLField(max_length=500, blank=True, default="")

    # Response tracking
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "bookings_booking"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["client", "status"]),
            models.Index(fields=["stylist_profile", "status"]),
            models.Index(fields=["stylist_profile", "scheduled_for"]),
        ]

    def __str__(self):
        return f"Booking {self.pk} ({self.status})"


class Review(TimeStampedModel):
    """
    One review per completed booking. Starts pending, published after moderation.
    """

    REVIEW_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("published", "Published"),
        ("removed", "Removed"),
    ]

    booking = models.OneToOneField(
        Booking, on_delete=models.CASCADE, related_name="review_record"
    )
    rating = models.PositiveSmallIntegerField()  # 1–5
    body = models.TextField(max_length=1000, blank=True, default="")
    status = models.CharField(
        max_length=20, choices=REVIEW_STATUS_CHOICES, default="pending", db_index=True
    )
    author_name = models.CharField(max_length=150)  # First name only
    service_name = models.CharField(max_length=150)

    class Meta:
        db_table = "bookings_review"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review for booking {self.booking_id} — {self.rating}★"


class ReviewReport(models.Model):
    """A report against a review."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="reports")
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reason = models.CharField(max_length=30)
    note = models.TextField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=10,
        choices=[("open", "Open"), ("actioned", "Actioned"), ("dismissed", "Dismissed")],
        default="open",
        db_index=True,
    )
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    handled_at = models.DateTimeField(null=True, blank=True)
    resolution = models.CharField(max_length=300, blank=True, default="")

    class Meta:
        db_table = "bookings_review_report"


class BookingEvent(models.Model):
    """
    The audit trail: every change of status, proposal or move, who made it and when.
    Appended, never edited, so lead times, no-show hours and repeat rates can be
    worked out for any booking, ever.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="events")
    action = models.CharField(max_length=30, db_index=True)  # created, status, proposed, move_requested
    from_status = models.CharField(max_length=30, blank=True, default="")
    to_status = models.CharField(max_length=30, blank=True, default="")
    # Who did it; null is the system (a lapse, an auto-complete) or a deleted account.
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    actor_role = models.CharField(max_length=10, blank=True, default="")  # client, stylist, system
    data = models.JSONField(default=dict, blank=True)
    at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "bookings_event"
        ordering = ["at"]

    def __str__(self):
        return f"{self.booking_id} {self.action} {self.from_status}->{self.to_status}"


class CheckIn(models.Model):
    """Week 2 and week 4 check-ins after completion."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name="check_ins"
    )
    week = models.PositiveSmallIntegerField()  # 2 or 4
    domain = domain_field()
    holding = models.CharField(max_length=20)  # fresh, okay, tired
    scalp = models.CharField(max_length=20)  # comfortable, itchy, sore
    again = models.CharField(max_length=10)  # yes, maybe, no
    # Is the style still in? No means it came out around now: how long styles last.
    still_in = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bookings_check_in"
        unique_together = [("booking", "week")]


class SlotInterest(TimeStampedModel):
    """Waitlist: a client watching for a slot with a stylist."""

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="slot_interests",
    )
    stylist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="watched_by",
    )
    stylist_name = models.CharField(max_length=150)
    stylist_handle = models.CharField(max_length=50, blank=True, default="")
    from_date = models.DateField()
    to_date = models.DateField()
    opened_on = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "bookings_slot_interest"
        ordering = ["-created_at"]
