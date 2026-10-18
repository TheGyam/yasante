"""
Stylist models: StylistProfile, MenuItem, PortfolioPhoto, PaymentMethod.
"""

import uuid

from apps.common.models import TimeStampedModel
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.db.models.functions import Upper

# Kept here for callers that import the reserved site names from the model.
from apps.common.identifiers import NOT_HANDLES, POLICY, validate_model_identifier

SERVICE_MODEL_CHOICES = [
    ("salon", "Salon"),
    ("home", "Home"),
    ("mobile", "Mobile"),
]

DEPOSIT_TYPE_CHOICES = [
    ("none", "None"),
    ("fixed", "Fixed"),
    ("percent", "Percent"),
]


class StylistProfile(TimeStampedModel):
    """
    A stylist's public page.  One-to-one with a User who has the stylist role.
    """

    account = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="stylist_profile",
    )
    display_name = models.CharField(max_length=150)
    handle = models.CharField(max_length=50, unique=True, db_index=True)
    bio = models.TextField(max_length=1000, blank=True, default="")
    avatar_uri = models.URLField(max_length=500, blank=True, default="")
    service_models = ArrayField(
        models.CharField(max_length=20, choices=SERVICE_MODEL_CHOICES),
        default=list,
    )
    base_area = models.CharField(max_length=100)
    # Private: copied onto a booking and shown to her client only once confirmed.
    address = models.CharField(max_length=500, blank=True, default="")
    travel_radius_miles = models.FloatField(null=True, blank=True)
    # Where they are on the map, from the address's postcode or else the area: for
    # "stylists near you". Never shown.
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    # Where her working hours are (IANA, e.g. Europe/London), from her phone when she
    # sets up or edits her page. Empty: the default (apps.common.zones).
    time_zone = models.CharField(max_length=64, blank=True, default="")
    instagram_handle = models.CharField(max_length=50, blank=True, default="")
    tiktok_handle = models.CharField(max_length=50, blank=True, default="")

    # Policies
    notice_hours = models.PositiveIntegerField(default=24)
    deposit_type = models.CharField(
        max_length=20, choices=DEPOSIT_TYPE_CHOICES, default="none"
    )
    deposit_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    reschedule_free_once = models.BooleanField(default=True)

    # Availability (JSON: { week: [Sun..Sat], blocked: [dates] })
    availability = models.JSONField(default=dict, blank=True)

    # Verification
    proof_photo_uri = models.URLField(max_length=500, blank=True, default="")
    verification_tier = models.PositiveSmallIntegerField(default=0)

    # Set up by Yasante and not taking bookings yet.
    featured = models.BooleanField(default=False, db_index=True)
    published = models.BooleanField(default=False, db_index=True)

    # Precomputed stats (updated by signals/tasks)
    confirmed_styles_count = models.PositiveIntegerField(default=0)
    rating_average = models.DecimalField(
        max_digits=3, decimal_places=1, null=True, blank=True
    )
    rating_count = models.PositiveIntegerField(default=0)
    response_hours = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = "stylists_profile"
        ordering = ["-created_at"]
        indexes = [models.Index(Upper("handle"), name="stylist_handle_ci_idx")]

    def __str__(self):
        return f"@{self.handle} ({self.display_name})"

    def clean(self):
        super().clean()
        validate_model_identifier(self, "handle", max_length=POLICY["handle_max"])

    def save(self, *args, **kwargs):
        fields = kwargs.get("update_fields")
        previous = None
        if fields is None or "handle" in fields:
            previous = validate_model_identifier(self, "handle", max_length=POLICY["handle_max"])
        result = super().save(*args, **kwargs)
        if previous and previous.lower() != self.handle.lower():
            from apps.accounts.models import ReleasedName

            ReleasedName.hold(previous, self.account_id)
        return result

    @property
    def policies(self) -> dict:
        return {
            "notice_hours": self.notice_hours,
            "deposit_type": self.deposit_type,
            "deposit_amount": (
                float(self.deposit_amount) if self.deposit_amount else None
            ),
            "reschedule_free_once": self.reschedule_free_once,
        }


class PaymentMethod(models.Model):
    """How she's paid deposits — private, never on a public page."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stylist = models.ForeignKey(
        StylistProfile, on_delete=models.CASCADE, related_name="payment_methods"
    )
    label = models.CharField(max_length=40)
    details = models.CharField(max_length=200)

    class Meta:
        db_table = "stylists_payment_method"

    def __str__(self):
        return f"{self.label} for @{self.stylist.handle}"


class MenuItem(TimeStampedModel):
    """One service on her menu."""

    stylist = models.ForeignKey(
        StylistProfile, on_delete=models.CASCADE, related_name="menu_items"
    )
    name = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    from_price = models.BooleanField(default=False)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    note = models.CharField(max_length=500, blank=True, default="")
    hair_included = models.BooleanField(null=True, blank=True)
    # Options stored as JSON array: [{ id, group, label, add, addMinutes }]
    options = models.JSONField(default=list, blank=True)
    # Style slugs from the taxonomy; guessed from the name when she doesn't pick.
    styles = ArrayField(models.CharField(max_length=100), default=list, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    def save(self, *args, **kwargs):
        if not self.styles:
            from .pricing import guess_styles

            self.styles = guess_styles(self.name)
            if kwargs.get("update_fields") is not None:
                kwargs["update_fields"] = {*kwargs["update_fields"], "styles"}
        super().save(*args, **kwargs)

    class Meta:
        db_table = "stylists_menu_item"
        ordering = ["sort_order", "created_at"]

    def __str__(self):
        return f"{self.name} — £{self.price}"


class PortfolioPhoto(TimeStampedModel):
    """One photo of her work."""

    stylist = models.ForeignKey(
        StylistProfile, on_delete=models.CASCADE, related_name="portfolio_photos"
    )
    uri = models.URLField(max_length=500)
    thumb_uri = models.URLField(max_length=500, blank=True, default="")
    service = models.ForeignKey(
        MenuItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portfolio_photos",
    )
    look_id = models.UUIDField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = "stylists_portfolio_photo"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Photo for @{self.stylist.handle}"


class PageView(models.Model):
    """Track page views for stylist numbers."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stylist = models.ForeignKey(
        StylistProfile, on_delete=models.CASCADE, related_name="page_views"
    )
    viewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    viewed_at = models.DateTimeField(auto_now_add=True, db_index=True)
    # "web" is yasante.com/{handle}, the link in her bio; "app" is inside the app.
    source = models.CharField(max_length=10, default="app", db_index=True)

    class Meta:
        db_table = "stylists_page_view"


class Verification(TimeStampedModel):
    """
    One check on a stylist, recorded separately so every badge can say exactly what
    was checked. Her tier is derived from these (see recompute_tier), never set by hand.
    """

    TYPE_CHOICES = [
        ("phone", "Phone number"),
        ("instagram", "Instagram ownership"),
        ("proof_photo", "Proof-of-work photo"),
        ("met_in_person", "Met in person"),
        ("met_on_video", "Met on video"),
        ("insurance", "Insurance certificate"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
        ("expired", "Expired"),
    ]
    account = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="verifications"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending", db_index=True)
    evidence = models.CharField(max_length=500, blank=True, default="")
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


def held_checks(account_id):
    """The checks she holds right now: verified and not expired."""
    from django.utils import timezone

    now = timezone.now()
    return set(
        Verification.objects.filter(account_id=account_id, status="verified")
        .exclude(expires_at__lt=now)
        .values_list("type", flat=True)
    )


def tier_for(checks):
    """
    Tier 1: phone and a proof-of-work photo. Tier 2: also met (in person or on video).
    Tier 3: also a current insurance certificate. Phase 1 grants up to 1 in practice.
    """
    if not {"phone", "proof_photo"} <= checks:
        return 0
    if not checks & {"met_in_person", "met_on_video"}:
        return 1
    return 3 if "insurance" in checks else 2


def recompute_tier(account_id):
    tier = tier_for(held_checks(account_id))
    StylistProfile.objects.filter(account_id=account_id).update(verification_tier=tier)
    return tier


def record_check(account_id, type, status="verified", evidence="", by=None):
    """Add or update one check, then re-derive her tier."""
    from django.utils import timezone

    check, _ = Verification.objects.update_or_create(
        account_id=account_id,
        type=type,
        defaults={
            "status": status,
            "evidence": evidence,
            "verified_by": by,
            "verified_at": timezone.now() if status == "verified" else None,
        },
    )
    recompute_tier(account_id)
    return check


@receiver(pre_delete, sender=StylistProfile)
def _hold_handle(sender, instance, **kwargs):
    from apps.accounts.models import ReleasedName

    ReleasedName.hold(instance.handle, instance.account_id)


class FeaturedPage(TimeStampedModel):
    profile = models.OneToOneField(StylistProfile, on_delete=models.CASCADE, related_name="featured_page")
    # Where they are and agreed from: Instagram, TikTok, or both (at least one).
    instagram_handle = models.CharField(max_length=50, blank=True, default="")
    tiktok_handle = models.CharField(max_length=50, blank=True, default="")
    agreed_at = models.DateTimeField(null=True, blank=True)
    agreed_note = models.CharField(max_length=300, blank=True)
    agreed_proof = models.ForeignKey("common.Media", null=True, blank=True, on_delete=models.SET_NULL)
    added_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    code_hash = models.CharField(max_length=64, blank=True, db_index=True)
    code_expires_at = models.DateTimeField(null=True, blank=True)
    claimed_at = models.DateTimeField(null=True, blank=True)
    claimed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    tags_checked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "featured stylist"
        verbose_name_plural = "Featured stylists"

    def __str__(self):
        return f"@{self.instagram_handle or self.tiktok_handle}"


class PageWaitlist(models.Model):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="page_waitlists")
    stylist = models.ForeignKey(StylistProfile, on_delete=models.CASCADE, related_name="waitlist")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["stylist", "client"], name="unique_page_waitlist_client")]
        indexes = [models.Index(fields=["stylist", "created_at"])]
