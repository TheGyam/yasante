from django.db import models

from apps.common.models import TimeStampedModel


class WaitlistEntry(TimeStampedModel):
    """Someone who left an email on yasante.com before the app is in their store."""

    ROLE_CHOICES = [("client", "Getting my hair done"), ("stylist", "I'm a stylist")]

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="client")
    area = models.CharField(max_length=100, blank=True, default="")
    source = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        db_table = "web_waitlist_entry"
        ordering = ["-created_at"]
        verbose_name_plural = "waitlist entries"

    def __str__(self):
        return self.email
