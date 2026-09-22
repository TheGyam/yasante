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
            "email",
            "phone",
            "phone_verified",
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
    policy_version = serializers.CharField(max_length=50)

    def validate_age_confirmed(self, value):
        if not value:
            raise serializers.ValidationError("You must confirm you are 18 or older.")
        return value

    def validate_email(self, value):
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
                raise serializers.ValidationError({"message": "Invalid invite code."})

        return attrs

    def create(self, validated_data):
        invite = validated_data.pop("_invite", None)
        validated_data.pop("password_confirm")
        invite_code = validated_data.pop("invite_code", None)

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
            policy_version=validated_data["policy_version"],
        )

        # Mark invite as used
        if invite:
            invite.redeemed_by = user
            invite.redeemed_at = timezone.now()
            invite.save(update_fields=["redeemed_by", "redeemed_at"])

        return user


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

    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_password(self, value):
        validate_password(value)
        return value


class PhoneStartSerializer(serializers.Serializer):
    """POST /api/auth/phone/start/"""

    phone = serializers.CharField(max_length=20)


class PhoneVerifySerializer(serializers.Serializer):
    """POST /api/auth/phone/verify/"""

    phone = serializers.CharField(max_length=20)
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
