"""
Looks models: Look, LookLike, LookComment, CommentLike, Style, Report, Block.
"""

import uuid

from apps.common.models import TimeStampedModel
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class Style(models.Model):
    """Hair style taxonomy — cached for 1 hour."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "looks_style"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class Look(TimeStampedModel):
    """A look posting — the main feed content."""

    VISIBILITY_CHOICES = [("public", "Public"), ("private", "Private")]
    # One table for every kind of post, so comments, likes, reports and the feed
    # never need a second path when text posts and questions arrive.
    TYPE_CHOICES = [("look", "Look"), ("text", "Text"), ("question", "Question")]
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="look", db_index=True)
    # Moderation: hidden (pending an appeal, still hers to see) or removed (gone).
    STATUS_CHOICES = [("live", "Live"), ("hidden", "Hidden"), ("removed", "Removed")]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="live", db_index=True)

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="looks"
    )
    photo_uri = models.URLField(max_length=500)
    thumb_uri = models.URLField(max_length=500, blank=True, default="")
    # A 1080-wide copy for feeds: full size is for the look's own page.
    feed_uri = models.URLField(max_length=500, blank=True, default="")
    photo_aspect = models.FloatField(default=1)
    caption = models.TextField(max_length=1000, blank=True, default="")
    visibility = models.CharField(
        max_length=10, choices=VISIBILITY_CHOICES, default="public", db_index=True
    )
    hair_texture = models.CharField(max_length=20, blank=True, default="", db_index=True)
    booking_id = models.UUIDField(null=True, blank=True)

    # Style tags
    styles = models.ManyToManyField(Style, related_name="looks", blank=True)

    # Stylist attribution
    stylist_id = models.CharField(max_length=50, blank=True, default="")
    stylist_name = models.CharField(max_length=150, blank=True, default="")
    stylist_handle = models.CharField(max_length=50, blank=True, default="")

    # Service
    service_id = models.CharField(max_length=50, blank=True, default="")
    service_name = models.CharField(max_length=150, blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    from_price = models.BooleanField(default=False)
    area = models.CharField(max_length=100, blank=True, default="")

    # Denormalised counts
    like_count = models.PositiveIntegerField(default=0, db_index=True)
    comment_count = models.PositiveIntegerField(default=0)
    save_count = models.PositiveIntegerField(default=0)

    products = models.ManyToManyField(
        "shelf.Product", related_name="looks", blank=True
    )

    class Meta:
        db_table = "looks_look"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-like_count", "-created_at"]),
            models.Index(fields=["visibility", "-created_at"]),
            models.Index(fields=["hair_texture", "visibility", "-created_at"]),
            models.Index(fields=["area", "visibility", "-created_at"]),
        ]

    def __str__(self):
        return f"Look by {self.author.name}"


class LookPhoto(models.Model):
    look = models.ForeignKey(Look, on_delete=models.CASCADE, related_name="photos")
    position = models.PositiveSmallIntegerField()
    photo_uri = models.URLField(max_length=500)
    thumb_uri = models.URLField(max_length=500, blank=True, default="")
    feed_uri = models.URLField(max_length=500, blank=True, default="")
    aspect = models.FloatField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "looks_look_photo"
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(fields=["look", "position"], name="unique_look_photo_position"),
            models.CheckConstraint(condition=models.Q(position__lte=4), name="look_photo_position_max"),
        ]


class LookLike(models.Model):
    """Unique like per user+look. Idempotent."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="look_likes"
    )
    look = models.ForeignKey(Look, on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "looks_look_like"
        unique_together = [("user", "look")]


class LookComment(TimeStampedModel):
    """
    Comments with threading.
    parent_id → top-level comment (for thread grouping)
    reply_to_id → specific comment being replied to (for @mention)
    """

    # Moderation: hidden (pending an appeal, still hers to see) or removed (gone).
    STATUS_CHOICES = [("live", "Live"), ("hidden", "Hidden"), ("removed", "Removed")]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="live", db_index=True)
    look = models.ForeignKey(Look, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="look_comments"
    )
    body = models.TextField(max_length=500)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies"
    )
    reply_to = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    reply_to_name = models.CharField(max_length=150, blank=True, default="")
    like_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "looks_comment"
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author.name} on look {self.look_id}"


class CommentLike(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comment_likes"
    )
    comment = models.ForeignKey(
        LookComment, on_delete=models.CASCADE, related_name="likes"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "looks_comment_like"
        unique_together = [("user", "comment")]


class Report(TimeStampedModel):
    """
    Generic report for looks, comments, or profiles.
    Anonymous — the target never sees who reported.
    """

    REASON_CHOICES = [
        ("not-their-work", "Not their work"),
        ("not-hair", "Not about hair"),
        ("nudity", "Nudity"),
        ("hate", "Hate"),
        ("scam", "Scam"),
        ("other", "Other"),
    ]

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports_made"
    )
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    note = models.TextField(max_length=500, blank=True, default="")

    # Generic FK so we can report looks, comments, profiles
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey("content_type", "object_id")

    # The queue: every report is answered, and the reporter can see how.
    QUEUE_CHOICES = [("open", "Open"), ("actioned", "Actioned"), ("dismissed", "Dismissed")]
    status = models.CharField(max_length=10, choices=QUEUE_CHOICES, default="open", db_index=True)
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    handled_at = models.DateTimeField(null=True, blank=True)
    resolution = models.CharField(max_length=300, blank=True, default="")

    class Meta:
        db_table = "looks_report"
        ordering = ["-created_at"]


class NotForMe(models.Model):
    """
    "Not for me" on a look or a stylist: her feed shows fewer like it. A look goes from
    her feed, and two of the same style take that style out too; a stylist's looks go.
    Hers alone: nobody is told.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="not_for_me")
    look = models.ForeignKey("Look", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    stylist = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "looks_not_for_me"
        constraints = [
            models.UniqueConstraint(fields=["user", "look"], name="not_for_me_once_per_look"),
            models.UniqueConstraint(fields=["user", "stylist"], name="not_for_me_once_per_stylist"),
        ]


# Two looks of a style marked "not for me" take the style out of her feed.
NOT_FOR_ME_STYLE_AFTER = 2


def not_for_me(user):
    """(look ids, stylist account ids, style slugs) to keep out of her feed."""
    if not user or not user.is_authenticated:
        return set(), set(), set()
    from collections import Counter

    rows = list(
        NotForMe.objects.filter(user=user).values_list("look_id", "stylist_id", "look__styles__slug")
    )
    looks = {look for look, _, _ in rows if look}
    stylists = {stylist for _, stylist, _ in rows if stylist}
    # Each look counts once for each of its styles.
    per_style = Counter(slug for _, slug in {(look, slug) for look, _, slug in rows if look and slug})
    styles = {slug for slug, n in per_style.items() if n >= NOT_FOR_ME_STYLE_AFTER}
    return looks, stylists, styles


class Block(models.Model):
    """
    Symmetric block. One row covers both directions.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="blocks_made"
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="blocks_received",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "looks_block"
        unique_together = [("blocker", "blocked")]


class ModerationAction(TimeStampedModel):
    """Every hide, remove, restore or unpublish, who did it and why: the audit trail."""

    ACTION_CHOICES = [
        ("hide", "Hide"),
        ("remove", "Remove"),
        ("restore", "Restore"),
        ("unpublish", "Unpublish page"),
        ("dismiss", "Dismiss reports"),
    ]
    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    reason = models.CharField(max_length=300, blank=True, default="")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    target = GenericForeignKey("content_type", "object_id")
    # Whose content it was, so they can appeal.
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="moderated"
    )


class Appeal(TimeStampedModel):
    """The author asks for a hide or removal to be looked at again."""

    STATUS_CHOICES = [("open", "Open"), ("upheld", "Upheld"), ("overturned", "Overturned")]
    action = models.ForeignKey(ModerationAction, on_delete=models.CASCADE, related_name="appeals")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="appeals")
    body = models.TextField(max_length=1000)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="open", db_index=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    decided_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Appeal from {self.author.name}: {self.action.get_action_display()}"
