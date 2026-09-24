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
