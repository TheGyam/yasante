"""
Planner models: Collection, CollectionItem, CarePlan, CarePlanStep, CarePlanSession.
"""

import uuid

from apps.common.models import TimeStampedModel
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models


class Collection(TimeStampedModel):
    """A user-created collection of looks or products."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="collections"
    )
    name = models.CharField(max_length=150)
    is_private = models.BooleanField(default=True)

    class Meta:
        db_table = "planner_collection"
        ordering = ["name"]
        unique_together = [("user", "name")]

    def __str__(self):
        return f"{self.name} ({self.user.name})"


class CollectionItem(TimeStampedModel):
    """An item within a collection (Look or Product)."""

    KIND_CHOICES = [("look", "Look"), ("content", "Content")]

    collection = models.ForeignKey(
        Collection, on_delete=models.CASCADE, related_name="items"
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    # A look's id, or a library article's — which may not be a UUID.
    ref_id = models.CharField(max_length=64, db_index=True)

    # Cached fields so we don't need to join when fetching the collection list
    photo_uri = models.URLField(max_length=500, blank=True, default="")
    thumb_uri = models.URLField(max_length=500, blank=True, default="")
    title = models.CharField(max_length=150, blank=True, default="")

    class Meta:
        db_table = "planner_collection_item"
        ordering = ["-created_at"]
        unique_together = [("collection", "kind", "ref_id")]

    def __str__(self):
        return f"{self.kind} in {self.collection.name}"


class CarePlan(TimeStampedModel):
    """A routine created by the user (e.g., Wash Day, Night Routine)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="care_plans"
    )
    name = models.CharField(max_length=150)
    frequency = models.CharField(max_length=50, blank=True, default="")
    specific_days = ArrayField(models.PositiveSmallIntegerField(), default=list, blank=True)
    time_of_day = models.CharField(max_length=20, blank=True, default="")
    reminders_on = models.BooleanField(default=False)
    last_done_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "planner_care_plan"
        ordering = ["name"]
        unique_together = [("user", "name")]

    def __str__(self):
        return f"{self.name} ({self.user.name})"


class CarePlanStep(models.Model):
    """A step within a care plan."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(CarePlan, on_delete=models.CASCADE, related_name="steps")
    text = models.CharField(max_length=255)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "planner_care_plan_step"
        ordering = ["sort_order", "created_at"]


class CarePlanSession(models.Model):
    """A log of when a care plan was completed."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(
        CarePlan, on_delete=models.CASCADE, related_name="sessions"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="care_plan_sessions",
    )
    completed_at = models.DateTimeField(default=models.functions.Now)
    # The phone's own clock, so "you do this on Sundays" is her Sunday.
    local_at = models.CharField(max_length=40, blank=True, default="")
    local_weekday = models.PositiveSmallIntegerField(null=True, blank=True)
    local_hour = models.PositiveSmallIntegerField(null=True, blank=True)
    notes = models.TextField(max_length=1000, blank=True, default="")

    class Meta:
        db_table = "planner_care_plan_session"
        ordering = ["-completed_at"]
