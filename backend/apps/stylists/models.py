"""
Stylist models: StylistProfile, MenuItem, PortfolioPhoto, PaymentMethod.
"""

import uuid

from apps.common.models import TimeStampedModel
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models

# Reserved handles — website paths that can't be taken
NOT_HANDLES = {
    "admin",
    "api",
    "auth",
    "login",
    "signup",
    "register",
    "about",
    "terms",
    "privacy",
    "help",
    "support",
    "settings",
    "search",
    "explore",
    "discover",
    "feed",
    "home",
    "profile",
    "account",
    "book",
    "booking",
    "bookings",
    "stylist",
    "stylists",
    "looks",
    "learn",
    "library",
    "shop",
    "reset-password",
    "forgot-password",
    "invite",
    "invites",
    "verify",
    "notifications",
    "messages",
    "static",
    "media",
    "assets",
    "css",
    "js",
    "images",
    "fonts",
    ".well-known",
    "favicon.ico",
    "robots.txt",
    "sitemap.xml",
    "waitlist",
    "styles",
    "areas",
    "yasante",
    "hair",
}

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
    instagram_handle = models.CharField(max_length=50, blank=True, default="")

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

    def __str__(self):
        return f"@{self.handle} ({self.display_name})"

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
    sort_order = models.PositiveIntegerField(default=0)

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

    class Meta:
        db_table = "stylists_page_view"
