"""
Profile models: HairProfile, HairProfileSnapshot, ConsentRecord, AnalyticsEvent.
"""

import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models

# ── Choices ──────────────────────────────────────────
TEXTURE_CHOICES = [
    ("straight", "Straight"),
    ("wavy", "Wavy"),
    ("curly", "Curly"),
    ("coily", "Coily"),
    ("kinky", "Kinky"),
]

LENGTH_CHOICES = [
    # In order, shortest first, so a change is a difference in rank.
    ("cropped", "TWA / cropped"),
    ("ear", "Ear"),
    ("chin", "Chin"),
    ("neck", "Neck"),
    ("shoulder", "Shoulder"),
    ("armpit", "Armpit"),
    ("bra-strap", "Bra strap"),
    ("mid-back", "Mid-back"),
    ("waist", "Waist"),
    ("hip", "Hip"),
    ("tailbone", "Tailbone"),
]

DENSITY_CHOICES = [("fine", "Fine"), ("medium", "Medium"), ("thick", "Thick")]
POROSITY_CHOICES = [("low", "Low"), ("medium", "Medium"), ("high", "High")]

GOAL_CHOICES = [
    ("growth", "Growth"),
    ("health", "Health"),
    ("moisture", "Moisture"),
    ("strength", "Strength"),
    ("color", "Color"),
    ("style", "Style"),
]

SCALP_CHOICES = [
    ("balanced", "Balanced"),
    ("dry", "Dry"),
    ("oily", "Oily"),
    ("flaky", "Flaky"),
    ("sensitive", "Sensitive"),
]

CHEMICAL_CHOICES = [
    ("relaxer", "Relaxer"),
    ("texturiser", "Texturiser"),
    ("colour", "Colour"),
    ("bleach", "Bleach"),
    ("keratin", "Keratin"),
]

BUDGET_CHOICES = [
    ("under_50", "Under £50"),
    ("50_100", "£50–100"),
    ("100_150", "£100–150"),
    ("150_plus", "£150+"),
]


class HairProfile(models.Model):
    """
    Progressive hair profile — every field optional, fills in over time.
    One-to-one with User.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="hair_profile"
    )
    texture = models.CharField(
        max_length=20, choices=TEXTURE_CHOICES, blank=True, default=""
    )
    length = models.CharField(
        max_length=20, choices=LENGTH_CHOICES, blank=True, default=""
    )
    shrunk_length = models.CharField(
        max_length=20, choices=LENGTH_CHOICES, blank=True, default=""
    )
    density = models.CharField(
        max_length=20, choices=DENSITY_CHOICES, blank=True, default=""
    )
    porosity = models.CharField(
        max_length=20, choices=POROSITY_CHOICES, blank=True, default=""
    )
    goals = ArrayField(
        models.CharField(max_length=20, choices=GOAL_CHOICES),
        default=list,
        blank=True,
    )
    scalp = ArrayField(
        models.CharField(max_length=20, choices=SCALP_CHOICES),
        default=list,
        blank=True,
    )
    chemicals = ArrayField(
        models.CharField(max_length=20, choices=CHEMICAL_CHOICES),
        default=list,
        blank=True,
    )
    area = models.CharField(max_length=100, blank=True, default="")
    budget = models.CharField(
        max_length=20, choices=BUDGET_CHOICES, blank=True, default=""
    )
    photo_uri = models.URLField(max_length=500, blank=True, default="")
    length_measured_at = models.DateTimeField(null=True, blank=True)
    # For people who measure: never required, always in centimetres.
    length_cm = models.FloatField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profiles_hair_profile"

    def __str__(self):
        return f"Hair profile for {self.user.name}"


class HairProfileSnapshot(models.Model):
    """
    Append-only history of hair profile changes.
    Every PATCH creates a snapshot so the length curve is never lost.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hair_snapshots",
    )
    # Mirror all hair profile fields
    texture = models.CharField(max_length=20, blank=True, default="")
    length = models.CharField(max_length=20, blank=True, default="")
    shrunk_length = models.CharField(max_length=20, blank=True, default="")
    density = models.CharField(max_length=20, blank=True, default="")
    porosity = models.CharField(max_length=20, blank=True, default="")
    goals = ArrayField(models.CharField(max_length=20), default=list, blank=True)
    scalp = ArrayField(models.CharField(max_length=20), default=list, blank=True)
    chemicals = ArrayField(models.CharField(max_length=20), default=list, blank=True)
    area = models.CharField(max_length=100, blank=True, default="")
    budget = models.CharField(max_length=20, blank=True, default="")
    photo_uri = models.URLField(max_length=500, blank=True, default="")
    length_measured_at = models.DateTimeField(null=True, blank=True)
    # For people who measure: never required, always in centimetres.
    length_cm = models.FloatField(null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "profiles_hair_snapshot"
        ordering = ["-recorded_at"]


class ConsentRecord(models.Model):
    """
    Append-only consent history.  Never toggled — each change is a new record.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="consent_records",
    )
    purpose = models.CharField(max_length=50, db_index=True)
    granted = models.BooleanField()
    policy_version = models.CharField(max_length=50)
    recorded_at = models.DateTimeField(db_index=True)
    source = models.CharField(max_length=50, blank=True, default="app")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "profiles_consent_record"
        ordering = ["-recorded_at"]


class AnalyticsEvent(models.Model):
    """
    Batched analytics events.  Dropped when analytics consent is withdrawn.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="analytics_events",
    )
    anonymous_id = models.CharField(max_length=100, blank=True, default="")
    name = models.CharField(max_length=100, db_index=True)
    at = models.DateTimeField()
    # The phone's own wall-clock time as it sent it, never converted: a DateTimeField
    # would turn "Sunday 9am in London" into UTC and lose the very thing it's for.
    local_at = models.CharField(max_length=40, blank=True, default="")
    local_weekday = models.PositiveSmallIntegerField(null=True, blank=True, db_index=True)
    local_hour = models.PositiveSmallIntegerField(null=True, blank=True, db_index=True)
    properties = models.JSONField(default=dict, blank=True)
    app_version = models.CharField(max_length=30, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "profiles_analytics_event"
        ordering = ["-at"]


class PolicyDocument(models.Model):
    """A published policy, one row per version. Consent records name the version."""

    TYPE_CHOICES = [
        ("terms", "Client terms"),
        ("stylist_terms", "Stylist terms"),
        ("privacy", "Privacy policy"),
        ("guidelines", "Community guidelines"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, db_index=True)
    version = models.CharField(max_length=50)
    effective_at = models.DateTimeField()
    title = models.CharField(max_length=200)
    body = models.TextField(help_text="Plain text or Markdown.")
    published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-effective_at"]
        constraints = [
            models.UniqueConstraint(fields=["type", "version"], name="one_row_per_policy_version")
        ]

    @classmethod
    def current(cls, type):
        from django.utils import timezone

        return (
            cls.objects.filter(type=type, published=True, effective_at__lte=timezone.now())
            .order_by("-effective_at")
            .first()
        )


class HairLog(models.Model):
    """
    Things that happen to her hair between appointments: a trim, a wash day, a
    style taken out. Appended with the phone's local time, never edited, so
    "time since your last trim", "you wash on Sundays" and "your braids lasted
    38 days" can be worked out later.
    """

    KIND_CHOICES = [("trim", "Trim"), ("wash", "Wash day"), ("take_down", "Style taken out")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="hair_log")
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, db_index=True)
    at = models.DateTimeField(db_index=True)
    local_at = models.CharField(max_length=40, blank=True, default="")
    local_weekday = models.PositiveSmallIntegerField(null=True, blank=True)
    local_hour = models.PositiveSmallIntegerField(null=True, blank=True)
    # The appointment whose style came out, for take-downs.
    booking_id = models.UUIDField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "profiles_hair_log"
        ordering = ["-at"]

    def __str__(self):
        return f"{self.user_id} {self.kind} {self.at:%Y-%m-%d}"


def log_hair(user, kind, local_at=None, at=None, booking_id=None):
    """Append one hair event with the phone's own time; once per kind per booking for take-downs."""
    from django.utils import timezone

    from apps.common.timeparse import local_parts

    if kind == "take_down" and booking_id and HairLog.objects.filter(
        user=user, kind=kind, booking_id=booking_id
    ).exists():
        return None
    weekday, hour = local_parts(local_at or "")
    return HairLog.objects.create(
        user=user,
        kind=kind,
        at=at or timezone.now(),
        local_at=str(local_at or "")[:40],
        local_weekday=weekday,
        local_hour=hour,
        booking_id=booking_id,
    )
