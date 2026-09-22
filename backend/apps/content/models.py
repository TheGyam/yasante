"""
Content models: Education library articles/videos.
"""

from apps.common.models import TimeStampedModel
from django.contrib.postgres.fields import ArrayField
from django.db import models


class ContentItem(TimeStampedModel):
    """An educational article or video."""

    KIND_CHOICES = [("article", "Article"), ("video", "Video")]

    title = models.CharField(max_length=150)
    slug = models.SlugField(max_length=150, unique=True)
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)

    cover_uri = models.URLField(max_length=500, blank=True, default="")
    video_uri = models.URLField(max_length=500, blank=True, default="")
    description = models.CharField(max_length=300, blank=True, default="")
    body = models.TextField(blank=True, default="")
    author = models.CharField(max_length=150, blank=True, default="")

    # Matching metadata for "For You"
    texture_tags = ArrayField(models.CharField(max_length=50), default=list, blank=True)
    porosity_tags = ArrayField(
        models.CharField(max_length=50), default=list, blank=True
    )
    topic_tags = ArrayField(models.CharField(max_length=50), default=list, blank=True)

    published = models.BooleanField(default=False)
    read_time_minutes = models.PositiveSmallIntegerField(default=5)

    class Meta:
        db_table = "content_item"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.kind})"


class Favorite(models.Model):
    """Education favourite — keeps the existing /api/favorites/favorites/ contract."""

    id = models.UUIDField(primary_key=True, default=__import__("uuid").uuid4, editable=False)
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="favorites"
    )
    content = models.ForeignKey(
        ContentItem, on_delete=models.CASCADE, related_name="favorited_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "content_favorite"
        unique_together = [("user", "content")]
        ordering = ["-created_at"]
