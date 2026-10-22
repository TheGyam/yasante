"""
Planner models: Collection, CollectionItem, CarePlan, CarePlanStep, CarePlanSession.
"""

import secrets
import uuid

from apps.common.models import TimeStampedModel
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Q
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.utils import timezone


def new_share_code():
    """128 random bits, so a link can't be guessed or counted through."""
    return secrets.token_urlsafe(16)


class Shareable(models.Model):
    """
    What collections and care plans share (docs/SHARING_PLAN.md). Hers by default; a
    random code while it's shared by link. A row can instead tag along with someone
    else's (`follows`: it reads the source, kept up to date, and isn't hers to change),
    or be her own version of someone else's (`based_on`).
    """

    share_code = models.CharField(max_length=32, unique=True, null=True, blank=True)
    shared_at = models.DateTimeField(null=True, blank=True)
    # Staff stopped it being shared for breaking the guidelines.
    share_blocked = models.BooleanField(default=False)
    # Tagging along. Goes when the source goes or stops being shared.
    follows = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="followers"
    )
    # When she last heard that the source changed, so she's told at most once a day.
    told_at = models.DateTimeField(null=True, blank=True)
    # Made hers. The name and author are kept for "Based on Winter braids by Ama"; the
    # author's name goes when her account does.
    based_on = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="copies"
    )
    based_on_name = models.CharField(max_length=150, blank=True, default="")
    based_on_author = models.CharField(max_length=150, blank=True, default="")
    # When what others see last changed: its name, items or steps. Not her schedule.
    changed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        abstract = True

    def share(self):
        if not self.share_code:
            self.share_code = new_share_code()
            self.shared_at = timezone.now()
            self.save(update_fields=["share_code", "shared_at", "updated_at"])

    def stop_sharing(self):
        """The link stops working at once, and everyone tagging along loses it, and is told."""
        from apps.common.notifications import notify

        followers = type(self).objects.filter(follows=self)
        for user_id in followers.values_list("user_id", flat=True):
            notify(
                user_id,
                "tagging_along",
                f"unshared:{self.pk}:{user_id}:{self.shared_at:%Y%m%d%H%M%S}" if self.shared_at else f"unshared:{self.pk}:{user_id}",
                f"{self.name} isn’t shared any more",
                "It’s left your Planner.",
                url="/planner",
                mode="client",
            )
        followers.delete()
        self.share_code = None
        self.shared_at = None
        self.save(update_fields=["share_code", "shared_at", "updated_at"])

    def touch(self):
        type(self).objects.filter(pk=self.pk).update(changed_at=timezone.now())


def _own_names_unique(table):
    # Only her own need different names: the ones she tags along with have the author's.
    return [
        models.UniqueConstraint(
            fields=["user", "name"], condition=Q(follows__isnull=True), name=f"{table}_own_name"
        ),
        models.UniqueConstraint(
            fields=["user", "follows"], condition=Q(follows__isnull=False), name=f"{table}_tag_along_once"
        ),
    ]


class Collection(Shareable, TimeStampedModel):
    """A user-created collection of looks or products."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="collections"
    )
    # Empty on one she tags along with: it shows its source's.
    name = models.CharField(max_length=150, blank=True)

    class Meta:
        db_table = "planner_collection"
        ordering = ["name"]
        constraints = _own_names_unique("planner_collection")

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


class CarePlan(Shareable, TimeStampedModel):
    """
    A routine created by the user (e.g., Wash Day, Night Routine). One she tags along
    with has the author's name and steps, and her own schedule.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="care_plans"
    )
    name = models.CharField(max_length=150, blank=True)
    frequency = models.CharField(max_length=50, blank=True, default="")
    specific_days = ArrayField(models.PositiveSmallIntegerField(), default=list, blank=True)
    time_of_day = models.CharField(max_length=20, blank=True, default="")
    reminders_on = models.BooleanField(default=False)
    last_done_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "planner_care_plan"
        ordering = ["name"]
        constraints = _own_names_unique("planner_care_plan")

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


@receiver(pre_delete, sender="accounts.User")
def _forget_author(sender, instance, **kwargs):
    """Versions others made theirs stay theirs, without her name."""
    for model in (Collection, CarePlan):
        model.objects.filter(based_on__user=instance).update(based_on_author="")
