"""
Account models: User, Invite, EmailChallenge, DeviceToken.
"""

import uuid

from apps.common.identifiers import POLICY, validate_model_identifier

from django.conf import settings
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.db.models.functions import Upper
from django.utils import timezone


class UserManager(BaseUserManager):
    """Manager for the custom User model."""

    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("roles", ["admin"])
        return self.create_user(email, name, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user for Yasante.

    One account can hold several roles: client, stylist, admin.
    Password hashed with Argon2id (see PASSWORD_HASHERS in settings).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    # Proved by a code sent to it; a new address has to be proved again.
    email_verified = models.BooleanField("email confirmed", default=False)
    name = models.CharField(max_length=150)
    # What her posts and comments show (a stylist's show her brand name instead).
    # Shares one namespace with stylist handles, so nobody can post as a stylist.
    username = models.CharField(max_length=30, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True, default="")
    # Stylists only: staff checked the number by call or video (see the stylist badge).
    phone_verified = models.BooleanField("phone checked by us", default=False)
    roles = ArrayField(
        models.CharField(max_length=20),
        default=list,
        help_text='Account roles: "client", "stylist", "admin".',
    )
    avatar_uri = models.URLField(max_length=500, blank=True, default="")
    # Who Apple and Google say this is ("sub"): signing in with them finds the account
    # by these even when the email changes or Apple hides it.
    apple_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    # Lets us revoke Sign in with Apple when the account is deleted, as Apple requires.
    apple_refresh_token = models.CharField(max_length=500, blank=True, default="")
    # How times are worded to them in notifications: their phone's zone, kept in step.
    time_zone = models.CharField(max_length=64, blank=True, default="")
    age_confirmed = models.BooleanField(default=False)
    # Optional, from sign-up: a band, never a birthday.
    AGE_BAND_CHOICES = [
        ("18_24", "18 to 24"),
        ("25_34", "25 to 34"),
        ("35_44", "35 to 44"),
        ("45_54", "45 to 54"),
        ("55_plus", "55 or over"),
    ]
    age_band = models.CharField(max_length=10, choices=AGE_BAND_CHOICES, blank=True, default="")
    policy_version = models.CharField(max_length=50, blank=True, default="")

    # Django admin fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        db_table = "accounts_user"
        ordering = ["-created_at"]
        indexes = [models.Index(Upper("username"), name="account_username_ci_idx")]

    def __str__(self):
        return f"{self.name} ({self.email})"

    def clean(self):
        super().clean()
        validate_model_identifier(self, "username", max_length=POLICY["username_max"], optional=True)

    def save(self, *args, **kwargs):
        fields = kwargs.get("update_fields")
        previous = None
        if fields is None or "username" in fields:
            previous = validate_model_identifier(
                self, "username", max_length=POLICY["username_max"], optional=True
            )
        result = super().save(*args, **kwargs)
        if previous and previous.lower() != (self.username or "").lower():
            ReleasedName.hold(previous, self.pk)
        return result

    @property
    def is_stylist(self) -> bool:
        return "stylist" in (self.roles or [])

    @property
    def is_admin_user(self) -> bool:
        return "admin" in (self.roles or [])


class Invite(models.Model):
    """
    Stylist invite codes.  Each is single-use, time-limited.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    role = models.CharField(max_length=20, default="stylist")
    invited_by = models.CharField(max_length=150, help_text='e.g. "Akua from Yasante"')
    expires_at = models.DateTimeField()
    redeemed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="redeemed_invites",
    )
    redeemed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "accounts_invite"

    def __str__(self):
        return f"Invite {self.code} ({self.role})"

    @property
    def is_valid(self) -> bool:
        return self.redeemed_by is None and self.expires_at > timezone.now()


class EmailChallenge(models.Model):
    """A short-lived code sent to an email address, stored hashed like a phone code."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="email_challenges")
    email = models.EmailField()
    code_hash = models.CharField(max_length=128)
    attempts = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "accounts_email_challenge"
        ordering = ["-created_at"]

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    @property
    def is_locked(self) -> bool:
        return self.attempts >= settings.VERIFICATION_CODE_MAX_ATTEMPTS


class DeviceToken(models.Model):
    """Push notification device registration."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="devices")
    token = models.CharField(max_length=500, unique=True)
    platform = models.CharField(max_length=20)  # ios, android, web
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "accounts_device_token"

    def __str__(self):
        return f"{self.platform} device for {self.user.email}"


class ReleasedName(models.Model):
    """
    A public name someone gave up (a new username or handle, a deleted account), held
    for a while so nobody else can take it straight away and pass themselves off as
    them. Its last owner can take it back meanwhile. Like Instagram's and X's holds.
    """

    name = models.CharField(max_length=30, db_index=True)  # lower case
    # Not a key: the hold outlives a deleted account, and keeps nothing else about it.
    owner_id = models.UUIDField(null=True, blank=True)
    released_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "accounts_released_name"

    @classmethod
    def hold(cls, name, owner_id):
        if name:
            cls.objects.create(name=name.lower(), owner_id=owner_id)

    @classmethod
    def held(cls, name, user=None):
        """Whether `name` is still held from `user` (anyone, when None)."""
        since = timezone.now() - timezone.timedelta(days=settings.NAME_HOLD_DAYS)
        holds = cls.objects.filter(name=name.lower(), released_at__gt=since)
        if user is not None:
            holds = holds.exclude(owner_id=user.pk)
        return holds.exists()


@receiver(pre_delete, sender=User)
def _hold_username(sender, instance, **kwargs):
    ReleasedName.hold(instance.username, instance.pk)
