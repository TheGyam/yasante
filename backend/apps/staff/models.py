import base64
import hashlib

from cryptography.fernet import Fernet, MultiFernet
from django.conf import settings
from django.db import models


class StaffSecondFactor(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    secret = models.TextField()
    confirmed_at = models.DateTimeField(null=True, blank=True)
    recovery_codes = models.JSONField(default=list)
    last_used_step = models.BigIntegerField(default=-1)

    class Meta:
        # Granted to a staff member or group in the workspace's Groups and permissions.
        permissions = [("reveal_personal_data", "Can show hidden addresses, postcodes and phone numbers")]

    @staticmethod
    def cipher():
        # cryptography is already supplied by the existing PyJWT[crypto] dependency.
        keys = [settings.SECRET_KEY, *settings.SECRET_KEY_FALLBACKS]
        return MultiFernet([Fernet(base64.urlsafe_b64encode(hashlib.sha256(
            ("yasante.staff.totp:" + key).encode()).digest())) for key in keys])

    def set_secret(self, value):
        self.secret = self.cipher().encrypt(value.encode()).decode()

    def get_secret(self):
        return self.cipher().decrypt(self.secret.encode()).decode()


class Broadcast(models.Model):
    """A push notification sent from the workspace to many people at once."""

    KINDS = [("update", "Important update"), ("news", "News or offer")]

    kind = models.CharField(max_length=10, choices=KINDS)
    title = models.CharField(max_length=65)
    body = models.CharField(max_length=180)
    url = models.CharField(max_length=200, blank=True, default="")
    audience = models.JSONField(default=dict)
    audience_summary = models.CharField(max_length=300)
    recipients = models.PositiveIntegerField(default=0)
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    @property
    def event_prefix(self):
        return f"broadcast:{self.pk}:"
