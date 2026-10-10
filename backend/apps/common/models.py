"""
Base models shared across all apps.
"""

import uuid

from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base with UUID pk and created/updated timestamps."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class SearchLog(models.Model):
    """
    Every search, with its filters and how many results came back: what people want
    that isn't there yet is the case for the next stylists to recruit.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    surface = models.CharField(max_length=20, db_index=True)  # looks, stylists, content
    query = models.CharField(max_length=200, blank=True, default="")
    filters = models.JSONField(default=dict, blank=True)
    result_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


def log_search(request, surface, query="", filters=None, result_count=0):
    """Record a search. Never lets logging break the search itself."""
    try:
        SearchLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            surface=surface,
            query=(query or "")[:200],
            filters={k: v for k, v in (filters or {}).items() if v},
            result_count=result_count,
        )
    except Exception:  # noqa: BLE001 - analytics must never fail a request
        pass


class Media(models.Model):
    """
    Every uploaded photo and its copies. Private unless it's for something public
    (a Look, a portfolio, an avatar): a stylist's proof-of-work photo never is.
    Deleting a Media row deletes its files (see apps.common.signals).
    """

    KIND_CHOICES = [
        ("look", "Look"),
        ("portfolio", "Portfolio"),
        ("avatar", "Avatar"),
        ("proof", "Proof of work"),
        ("other", "Other"),
    ]
    VISIBILITY_CHOICES = [("public", "Public"), ("private", "Private")]
    SOURCE_CHOICES = [("camera_roll", "Camera roll"), ("instagram", "Instagram"), ("manual", "Manual")]
    MODERATION_CHOICES = [("ok", "OK"), ("flagged", "Flagged"), ("removed", "Removed")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="media")
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="other", db_index=True)
    visibility = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default="private")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="camera_roll")
    # Storage paths of the copies: full (long edge 2048), feed (1080 wide), thumb (400 wide).
    full_path = models.CharField(max_length=300)
    feed_path = models.CharField(max_length=300, blank=True, default="")
    thumb_path = models.CharField(max_length=300, blank=True, default="")
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    exif_stripped = models.BooleanField(default=True)
    # 64-bit difference hash, hex: near-identical photos differ in only a few bits.
    phash = models.CharField(max_length=16, blank=True, default="", db_index=True)
    moderation_status = models.CharField(
        max_length=10, choices=MODERATION_CHOICES, default="ok", db_index=True
    )
    duplicate_of = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="duplicates"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def paths(self):
        return [p for p in (self.full_path, self.feed_path, self.thumb_path) if p]


NOTIFICATION_CATEGORIES = [
    ("booking_updates", "Booking requests and replies"),
    ("reminders", "Appointment reminders"),
    ("waitlist", "Slots opening up"),
    ("after_appointment", "After an appointment"),
    ("check_ins", "Style check-ins"),
    ("weekly_digest", "Your weekly numbers"),
    ("account", "Your account, badges and important updates"),
    ("news", "News and offers from Yasante"),
]

# Promotional messages need a yes first (App Store guideline 4.5.4): off until switched on.
OPT_IN_CATEGORIES = {"news"}


class NotificationPreference(models.Model):
    """The categories she's switched off. Everything is on until she says otherwise."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preference"
    )
    muted = models.JSONField(default=list, blank=True)
    # Opt-in categories she's switched on (see OPT_IN_CATEGORIES).
    opted_in = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class NotificationLog(models.Model):
    """
    Every notification, once: the event key is unique, so a retried job or a double
    click can never send the same thing twice. Also the delivery record for debugging.
    """

    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("logged", "Logged only (push delivery is off)"),
        ("sent", "Accepted by Expo"),
        ("delivered", "Delivered to Apple or Google"),
        ("muted", "Muted by preference"),
        ("no_device", "No device"),
        ("emailed", "Emailed (no phone signed in)"),
        ("failed", "Failed"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    category = models.CharField(max_length=30, choices=NOTIFICATION_CATEGORIES, db_index=True)
    event_key = models.CharField(max_length=200, unique=True)
    title = models.CharField(max_length=200)
    body = models.CharField(max_length=500)
    data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="queued", db_index=True)
    error = models.CharField(max_length=300, blank=True, default="")
    # Expo's receipt ids: Apple and Google's verdict arrives later, under these.
    tickets = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class ClientError(models.Model):
    """
    Something that went wrong inside the app on someone's phone: a crash, or a start-up
    that stalled. Read in the admin, so a problem on a phone nobody here can plug in is
    still seen.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    fingerprint = models.CharField(max_length=40, blank=True, default="", db_index=True)
    kind = models.CharField(max_length=20, default="crash")  # crash, stall
    message = models.CharField(max_length=500)
    stack = models.TextField(blank=True, default="")
    platform = models.CharField(max_length=20, blank=True, default="")
    os_version = models.CharField(max_length=40, blank=True, default="")
    app_version = models.CharField(max_length=40, blank=True, default="")
    context = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "common_client_error"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.platform} {self.kind}: {self.message[:60]}"


class ErrorIssue(models.Model):
    fingerprint = models.CharField(max_length=40, unique=True)
    title = models.CharField(max_length=500)
    platform = models.CharField(max_length=20)
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now_add=True, db_index=True)
    count = models.PositiveIntegerField(default=0)
    users_affected = models.PositiveIntegerField(default=0)
    app_version = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=10, default="open", choices=[("open", "Open"), ("resolved", "Resolved"), ("ignored", "Ignored")], db_index=True)
    resolved_in_version = models.CharField(max_length=40, blank=True)
    note = models.TextField(blank=True)
    regressed = models.BooleanField(default=False)

    def __str__(self):
        return self.title
