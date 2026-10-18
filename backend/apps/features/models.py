"""
Feature switches: Yaw turns a feature on or off from the admin, without an app
update. See switches.py for how a switch decides yes or no for one account.
"""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.signals import m2m_changed, post_delete, post_save
from django.dispatch import receiver


class Switch(models.Model):
    MODE_CHOICES = [
        ("off", "Off"),
        ("staff", "Staff only"),
        ("listed", "Listed accounts"),
        ("percent", "A percentage of accounts"),
        ("everyone", "Everyone"),
    ]

    key = models.SlugField(max_length=50, unique=True)
    description = models.CharField(max_length=200, blank=True, default="")
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default="off")
    percent = models.PositiveSmallIntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="+")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        db_table = "features_switch"
        ordering = ["key"]

    def __str__(self):
        return self.key


@receiver(post_save, sender=Switch)
@receiver(post_delete, sender=Switch)
@receiver(m2m_changed, sender=Switch.users.through)
def _clear_switch_cache(sender, **kwargs):
    from .switches import clear_cache

    clear_cache()
