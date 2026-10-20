"""
Account serializers: signup, login, token refresh, phone verification, invites.
"""

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import DeviceToken, Invite, User


class UserSerializer(serializers.ModelSerializer):
    """Public user representation matching the frontend's User type."""

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "username",
            "email",
            "email_verified",
            "phone",
            "roles",
            "avatar_uri",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class SignupSerializer(serializers.Serializer):
    """
    POST /api/auth/signup/

    Validates email uniqueness, password strength, age confirmation,
    and optional invite code.
    """

    email = serializers.EmailField()
    name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=["client", "stylist"])
    invite_code = serializers.CharField(required=False, allow_blank=True)
    age_confirmed = serializers.BooleanField()
    age_band = serializers.ChoiceField(
        choices=["18_24", "25_34", "35_44", "45_54", "55_plus"],
        required=False,
        allow_blank=True,
        help_text="Optional: an age band, never a birthday",
    )
    policy_version = serializers.CharField(max_length=50)

    def validate_age_confirmed(self, value):
        if not value:
            raise serializers.ValidationError("You must confirm you are 18 or older.")
        return value

    def validate_email(self, value):
        if value.lower().endswith("@yasante.invalid"):
            raise serializers.ValidationError("Use your own email address")
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"message": "Passwords don't match."})

        # Django password validators (min length, common, numeric, similarity)
        validate_password(attrs["password"])

        # Validate invite code if provided
        invite_code = attrs.get("invite_code", "").strip()
        if invite_code:
            try:
                invite = Invite.objects.get(code=invite_code)
                if not invite.is_valid:
                    raise serializers.ValidationError(
                        {"message": "This invite has already been used or has expired."}
                    )
                attrs["_invite"] = invite
            except Invite.DoesNotExist:
                raise serializers.ValidationError({"message": "That invite code doesn’t work. Check it and try again."})

        return attrs

    def create(self, validated_data):
        invite = validated_data.pop("_invite", None)
        validated_data.pop("password_confirm")
        validated_data.pop("invite_code", None)

        roles = [validated_data.pop("role")]

        # Invite gives stylist role
        if invite and invite.role == "stylist" and "stylist" not in roles:
            roles.append("stylist")

        user = User.objects.create_user(
            email=validated_data["email"],
            name=validated_data["name"],
            password=validated_data["password"],
            roles=roles,
            age_confirmed=validated_data["age_confirmed"],
            age_band=validated_data.get("age_band", ""),
            policy_version=validated_data["policy_version"],
        )

        # Mark invite as used
        if invite:
            invite.redeemed_by = user
            invite.redeemed_at = timezone.now()
            invite.save(update_fields=["redeemed_by", "redeemed_at"])

        return user


class SocialLoginSerializer(serializers.Serializer):
    """POST /api/auth/social/"""

    provider = serializers.ChoiceField(choices=["apple", "google"])
    id_token = serializers.CharField()
    # Apple's one-time code, swapped for what revoking the link on deletion needs.
    authorization_code = serializers.CharField(required=False, allow_blank=True)
    # Apple only tells the app someone's name, and only the first time.
    name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    # Needed only when this creates the account.
    role = serializers.ChoiceField(choices=["client", "stylist"], required=False, default="client")
    age_confirmed = serializers.BooleanField(required=False, default=False)
    policy_version = serializers.CharField(max_length=50, required=False, allow_blank=True)


class LoginSerializer(serializers.Serializer):
    """POST /api/auth/login/"""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            email=attrs["email"].lower(),
            password=attrs["password"],
        )
        if not user:
            raise serializers.ValidationError(
                {"message": "Incorrect email or password."}
            )
        if not user.is_active:
            raise serializers.ValidationError(
                {"message": "This account has been deactivated."}
            )
        attrs["user"] = user
        return attrs


class RefreshTokenSerializer(serializers.Serializer):
    """POST /api/auth/refresh-token/"""

    refresh_token = serializers.CharField()


class ForgotPasswordSerializer(serializers.Serializer):
    """POST /api/auth/forgot-password/"""

    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    """POST /api/auth/reset-password/"""

    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_password(self, value):
        validate_password(value)
        return value


class EmailStartSerializer(serializers.Serializer):
    """POST /api/auth/email/start/ — optionally to a corrected address."""

    email = serializers.EmailField(required=False)
    # Asked for a new code. Without it, a code that still works is kept, so opening
    # the screen again doesn't send another email.
    resend = serializers.BooleanField(required=False, default=False)


class EmailVerifySerializer(serializers.Serializer):
    """POST /api/auth/email/verify/"""

    code = serializers.CharField(max_length=10)


class InviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invite
        fields = ["code", "role", "invited_by", "expires_at"]
        read_only_fields = fields


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ["id", "token", "platform"]
        read_only_fields = ["id"]
        # The view moves an existing token to whoever registers it, so no uniqueness check here.
        extra_kwargs = {"token": {"validators": []}}


def build_auth_response(user: User) -> dict:
    """Build the auth response with JWT tokens."""
    refresh = RefreshToken.for_user(user)
    return {
        "user": UserSerializer(user).data,
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
        "expires_at": int(
            (timezone.now() + settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]).timestamp()
            * 1000
        ),
    }


# ── Shapes for the schema the app's types are generated from ─────────────────────
from apps.common.schema import BlankIsOptional  # noqa: E402


class UserResponseSerializer(BlankIsOptional, UserSerializer):
    """The user as sent: empty phone or avatar left out."""

    roles = serializers.ListField(
        child=serializers.ChoiceField(choices=["client", "stylist", "admin"]), read_only=True
    )


class AuthResponseSerializer(serializers.Serializer):
    user = UserResponseSerializer()
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    expires_at = serializers.IntegerField(help_text="Milliseconds since the epoch")


class SocialAuthResponseSerializer(AuthResponseSerializer):
    created = serializers.BooleanField(help_text="A new account was made just now")


class TokenPairSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    expires_at = serializers.IntegerField(help_text="Milliseconds since the epoch")


class MessageSerializer(serializers.Serializer):
    message = serializers.CharField()


class CodeSentSerializer(serializers.Serializer):
    resend_in_seconds = serializers.IntegerField()
    expires_in_seconds = serializers.IntegerField()


class LogoutRequestSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(required=False)


class InviteResponseSerializer(BlankIsOptional, InviteSerializer):
    pass


class NotificationCategorySerializer(serializers.Serializer):
    id = serializers.CharField()
    label = serializers.CharField()
    on = serializers.BooleanField()


class NotificationPreferencesSerializer(serializers.Serializer):
    categories = NotificationCategorySerializer(many=True)


class NotificationPreferencesRequestSerializer(serializers.Serializer):
    categories = serializers.ListField(
        child=serializers.DictField(), required=False, help_text="[{id, on}]"
    )
    muted = serializers.ListField(child=serializers.CharField(), required=False)
