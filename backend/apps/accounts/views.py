"""
Account views: signup, login, token refresh, password reset, phone verification.
"""

import logging
from datetime import timedelta

from apps.common.permissions import IsOwner
from apps.common.throttling import LoginThrottle, PhoneCodeThrottle, SignupThrottle
from apps.common.utils import (
    generate_code,
    hash_code,
    is_uk_mobile,
    normalise_phone,
    verify_code,
)
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import DeviceToken, Invite, PhoneChallenge, User
from .serializers import (
    DeviceTokenSerializer,
    ForgotPasswordSerializer,
    InviteSerializer,
    LoginSerializer,
    PhoneStartSerializer,
    PhoneVerifySerializer,
    RefreshTokenSerializer,
    ResetPasswordSerializer,
    SignupSerializer,
    UserSerializer,
    build_auth_response,
)

logger = logging.getLogger(__name__)


class SignupView(APIView):
    """POST /api/auth/signup/"""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [SignupThrottle]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(build_auth_response(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/auth/login/"""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return Response(build_auth_response(user))


class RefreshTokenView(APIView):
    """
    POST /api/auth/refresh-token/

    Rotates the refresh token and blacklists the old one.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            old_refresh = RefreshToken(serializer.validated_data["refresh_token"])
            # Blacklist the old token
            old_refresh.blacklist()
            # Create new tokens for the user
            user = User.objects.get(id=old_refresh["user_id"])
            new_refresh = RefreshToken.for_user(user)

            # The old refresh token is now revoked, so the new one goes back with it.
            return Response(
                {
                    "access_token": str(new_refresh.access_token),
                    "refresh_token": str(new_refresh),
                    "expires_at": int(
                        (
                            timezone.now()
                            + settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
                        ).timestamp()
                        * 1000
                    ),
                }
            )
        except TokenError:
            return Response(
                {"message": "Invalid or expired refresh token. Please sign in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except User.DoesNotExist:
            return Response(
                {"message": "Account not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class ForgotPasswordView(APIView):
    """
    POST /api/auth/forgot-password/

    Always returns 200 whether the email exists or not (timing-safe).
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()

        try:
            user = User.objects.get(email__iexact=email)
            token = default_token_generator.make_token(user)
            # In production, send a real email with a reset link
            reset_url = (
                f"https://yasante.com/reset-password?token={token}&uid={user.pk}"
            )
            send_mail(
                "Reset your Yasante password",
                f"Use this link to reset your password: {reset_url}",
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=True,
            )
            logger.info("Password reset email sent to %s", email)
        except User.DoesNotExist:
            # Don't reveal whether the email exists
            pass

        return Response(
            {"message": "If that email is registered, you'll receive a reset link."}
        )


class ResetPasswordView(APIView):
    """POST /api/auth/reset-password/"""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        # Find the user from the token (in production, extract uid from the URL)
        uid = request.data.get("uid")
        if not uid:
            return Response(
                {"message": "Invalid reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=uid)
        except User.DoesNotExist:
            return Response(
                {"message": "Invalid reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"message": "This reset link has expired. Request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(password)
        user.save(update_fields=["password"])
        # A reset is often someone locking a stranger out: every session ends.
        revoke_all_sessions(user)
        return Response({"message": "Your password has been reset."})


def revoke_all_sessions(user):
    """Blacklist every refresh token the account holds, so every device signs out."""
    from rest_framework_simplejwt.token_blacklist.models import (
        BlacklistedToken,
        OutstandingToken,
    )

    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


class LogoutView(APIView):
    """POST /api/auth/logout/ — { refreshToken } ends this device's session."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from rest_framework_simplejwt.exceptions import TokenError
        from rest_framework_simplejwt.tokens import RefreshToken

        raw = request.data.get("refresh_token") or request.data.get("refresh")
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass  # Already invalid: signed out either way.
        return Response(status=status.HTTP_204_NO_CONTENT)


class LogoutEverywhereView(APIView):
    """POST /api/auth/logout-all/ — every device signs out, this one included."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        revoke_all_sessions(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PhoneStartView(APIView):
    """
    POST /api/auth/phone/start/

    Sends a 6-digit verification code via SMS.
    Rate limited: 1/30s per phone.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PhoneCodeThrottle]

    def post(self, request):
        serializer = PhoneStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = normalise_phone(serializer.validated_data["phone"])

        if not is_uk_mobile(phone):
            return Response(
                {"message": "Enter a UK mobile number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check rate limit — no new code within 30s
        recent = PhoneChallenge.objects.filter(
            user=request.user,
            phone=phone,
            created_at__gte=timezone.now()
            - timedelta(seconds=settings.PHONE_CODE_RESEND_SECONDS),
        ).first()

        if recent:
            remaining = (
                settings.PHONE_CODE_RESEND_SECONDS
                - (timezone.now() - recent.created_at).seconds
            )
            return Response(
                {"message": f"Wait {max(remaining, 1)}s before asking again."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Generate and store code
        code = generate_code(settings.PHONE_CODE_LENGTH)
        PhoneChallenge.objects.create(
            user=request.user,
            phone=phone,
            code_hash=hash_code(code),
            expires_at=timezone.now()
            + timedelta(seconds=settings.PHONE_CODE_EXPIRY_SECONDS),
        )

        # Send SMS (console backend in dev)
        logger.info("Phone verification code for %s: %s", phone, code)
        # TODO: Twilio integration for production
        # self._send_sms(phone, code)

        return Response(
            {
                "resend_in_seconds": settings.PHONE_CODE_RESEND_SECONDS,
                "expires_in_seconds": settings.PHONE_CODE_EXPIRY_SECONDS,
            }
        )


class PhoneVerifyView(APIView):
    """
    POST /api/auth/phone/verify/

    Verifies the phone code. 5 attempts per code, then locked.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PhoneVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = normalise_phone(serializer.validated_data["phone"])
        code = serializer.validated_data["code"]

        # Find the latest challenge for this phone
        challenge = (
            PhoneChallenge.objects.filter(
                user=request.user,
                phone=phone,
            )
            .order_by("-created_at")
            .first()
        )

        if not challenge:
            return Response(
                {"message": "Request a verification code first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if challenge.is_expired:
            return Response(
                {"message": "This code has expired. Request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if challenge.is_locked:
            return Response(
                {"message": "Too many attempts. Request a new code."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Increment attempts
        challenge.attempts += 1
        challenge.save(update_fields=["attempts"])

        if not verify_code(code, challenge.code_hash):
            remaining = settings.PHONE_CODE_MAX_ATTEMPTS - challenge.attempts
            if remaining <= 0:
                return Response(
                    {"message": "Too many attempts. Request a new code."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            return Response(
                {"message": f"Wrong code. {remaining} attempts left."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Success — verify the phone
        request.user.phone = phone
        request.user.phone_verified = True
        request.user.save(update_fields=["phone", "phone_verified"])

        # Clean up challenges
        PhoneChallenge.objects.filter(user=request.user, phone=phone).delete()

        return Response(UserSerializer(request.user).data)


class InviteDetailView(APIView):
    """GET /api/invites/:code/"""

    permission_classes = [permissions.AllowAny]

    def get(self, request, code):
        try:
            invite = Invite.objects.get(code=code)
        except Invite.DoesNotExist:
            return Response(
                {"message": "Invite not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not invite.is_valid:
            return Response(
                {"message": "This invite has already been used or has expired."},
                status=status.HTTP_410_GONE,
            )

        return Response(InviteSerializer(invite).data)


class InviteRedeemView(APIView):
    """POST /api/invites/:code/redeem/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, code):
        try:
            invite = Invite.objects.get(code=code)
        except Invite.DoesNotExist:
            return Response(
                {"message": "Invite not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not invite.is_valid:
            return Response(
                {"message": "This invite has already been used or has expired."},
                status=status.HTTP_410_GONE,
            )

        # Add the role
        user = request.user
        if invite.role not in user.roles:
            user.roles = list(user.roles) + [invite.role]
            user.save(update_fields=["roles"])

        # Mark invite used
        invite.redeemed_by = user
        invite.redeemed_at = timezone.now()
        invite.save(update_fields=["redeemed_by", "redeemed_at"])

        return Response(UserSerializer(user).data)


class DeviceTokenCreateView(generics.CreateAPIView):
    """POST /api/devices/"""

    serializer_class = DeviceTokenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Upsert — if the token already exists for another user, move it
        DeviceToken.objects.filter(token=serializer.validated_data["token"]).delete()
        serializer.save(user=self.request.user)


class DeviceTokenDeleteView(generics.DestroyAPIView):
    """DELETE /api/devices/:id/"""

    serializer_class = DeviceTokenSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return DeviceToken.objects.filter(user=self.request.user)
