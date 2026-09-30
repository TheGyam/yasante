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
