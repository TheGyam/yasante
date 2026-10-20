"""
Account views: signup, login, token refresh, password reset, email verification.
"""

import logging
from datetime import timedelta

from apps.common.permissions import IsOwner
from apps.common.throttling import (
    LoginThrottle,
    PasswordResetThrottle,
    PhoneCodeThrottle,
    SignupThrottle,
)
from apps.common.utils import (
    generate_code,
    hash_code,
    verify_code,
)
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from . import social
from .emails import send_email_code, send_password_reset
from .models import DeviceToken, EmailChallenge, Invite, User
from .serializers import (
    AuthResponseSerializer,
    DeviceTokenSerializer,
    EmailStartSerializer,
    EmailVerifySerializer,
    ForgotPasswordSerializer,
    InviteResponseSerializer,
    InviteSerializer,
    LoginSerializer,
    LogoutRequestSerializer,
    MessageSerializer,
    NotificationPreferencesRequestSerializer,
    NotificationPreferencesSerializer,
    CodeSentSerializer,
    RefreshTokenSerializer,
    ResetPasswordSerializer,
    SignupSerializer,
    SocialAuthResponseSerializer,
    SocialLoginSerializer,
    TokenPairSerializer,
    UserResponseSerializer,
    UserSerializer,
    build_auth_response,
)

logger = logging.getLogger(__name__)


@extend_schema_view(post=extend_schema(request=SignupSerializer, responses={201: AuthResponseSerializer}))
class SignupView(APIView):
    """POST /api/auth/signup/"""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [SignupThrottle]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(build_auth_response(user), status=status.HTTP_201_CREATED)


@extend_schema_view(post=extend_schema(request=LoginSerializer, responses=AuthResponseSerializer))
class LoginView(APIView):
    """POST /api/auth/login/"""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return Response(build_auth_response(user))


@extend_schema_view(post=extend_schema(request=SocialLoginSerializer, responses=SocialAuthResponseSerializer))
class SocialLoginView(APIView):
    """
    POST /api/auth/social/ — Sign in with Apple or Google, which also signs up.

    Finds the account by the provider's id, then by a verified email (linking the
    two), and otherwise makes a new one. Apple and Google have already proved the
    email, so it starts confirmed and never needs a password.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = SocialLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        provider = data["provider"]
        label = "Apple" if provider == "apple" else "Google"
        try:
            who = social.verify(provider, data["id_token"])
        except social.NotVerified:
            logger.info("%s sign-in refused", provider, exc_info=True)
            return Response(
                {"message": f"We couldn’t sign you in with {label}. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (who.get("email") or "").lower().endswith("@yasante.invalid"):
            return Response({"message": "Use your own email address"}, status=400)
        field = f"{provider}_id"
        user = User.objects.filter(**{field: who["sub"]}).first()
        if user is not None and user.email.lower().endswith("@yasante.invalid"):
            return Response({"message": "Use your own email address"}, status=400)
        if user is None and who["email"] and who["email_verified"]:
            user = User.objects.filter(email__iexact=who["email"]).first()
            if user is not None and not getattr(user, field):
                setattr(user, field, who["sub"])
                user.email_verified = True
                user.save(update_fields=[field, "email_verified", "updated_at"])
            elif user is not None:
                # Already linked to a different Apple or Google account.
                return Response(
                    {"message": f"That email is already linked to another {label} account. Sign in with your email and password instead."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        created = False
        if user is None:
            if not who["email"]:
                return Response(
                    {"message": f"{label} didn’t share an email address, so we can’t make your account. Please sign up with your email instead."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not data["age_confirmed"] or not data.get("policy_version"):
                return Response(
                    {"message": "Please confirm you’re 18 or over and agree to the terms first."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            name = (data.get("name") or who["name"] or who["email"].split("@")[0]).strip()[:150]
            user = User.objects.create_user(
                email=who["email"],
                name=name,
                roles=[data["role"]],
                email_verified=True,
                age_confirmed=True,
                policy_version=data["policy_version"],
                **{field: who["sub"]},
            )
            user.set_unusable_password()
            user.save(update_fields=["password"])
            created = True

        if provider == "apple" and not user.apple_refresh_token:
            token = social.apple_refresh_token(data.get("authorization_code"), who["aud"])
            if token:
                user.apple_refresh_token = token
                user.save(update_fields=["apple_refresh_token"])

        if not user.is_active:
            return Response(
                {"message": "This account has been closed. Contact support@yasante.com if you think that’s a mistake."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(
            {**build_auth_response(user), "created": created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


@extend_schema_view(post=extend_schema(request=RefreshTokenSerializer, responses=TokenPairSerializer))
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
            # Switched off: this device's sign-in ends now, and stays ended if it's switched back on.
            if not user.is_active:
                raise TokenError("inactive")
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
                {"message": "Your session has ended. Please sign in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except User.DoesNotExist:
            return Response(
                {"message": "We couldn’t find that account."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


@extend_schema_view(post=extend_schema(request=ForgotPasswordSerializer, responses=MessageSerializer))
class ForgotPasswordView(APIView):
    """
    POST /api/auth/forgot-password/

    Always returns 200 whether the email exists or not.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetThrottle]
    # One email per address per two minutes, whoever asks and from wherever: the
    # per-IP limit alone wouldn't stop an inbox being flooded from many addresses.
    RESEND_SECONDS = 120

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        if email.endswith("@yasante.invalid"):
            return Response({"message": "If that email is registered, you'll receive a reset link."})

        try:
            user = User.objects.get(email__iexact=email)
            if not cache.add(f"password-reset:{user.pk}", 1, self.RESEND_SECONDS):
                raise User.DoesNotExist  # sent one moment ago: same answer, no email
            token = default_token_generator.make_token(user)
            # A yasante.com link: the app's reset screen on a phone with the app, the
            # website's anywhere else. It carries who and the one-time token.
            link = f"https://yasante.com/auth/reset-password?uid={user.pk}&token={token}"
            send_password_reset(user.email, user.name, link)
        except User.DoesNotExist:
            # Don't reveal whether the email exists
            pass

        return Response(
            {"message": "If that email is registered, you'll receive a reset link."}
        )


@extend_schema_view(post=extend_schema(request=ResetPasswordSerializer, responses=MessageSerializer))
class ResetPasswordView(APIView):
    """POST /api/auth/reset-password/"""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        # Find the user from the token (in production, extract uid from the URL)
        uid = request.data.get("uid")
        if not uid:
            return Response(
                {"message": "This reset link doesn’t work. Request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=uid)
        except User.DoesNotExist:
            return Response(
                {"message": "This reset link doesn’t work. Request a new one."},
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


@extend_schema_view(post=extend_schema(request=LogoutRequestSerializer, responses={204: None}))
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


@extend_schema_view(post=extend_schema(request=None, responses={204: None}))
class LogoutEverywhereView(APIView):
    """POST /api/auth/logout-all/ — every device signs out, this one included."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        revoke_all_sessions(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(post=extend_schema(request=EmailStartSerializer, responses=CodeSentSerializer))
class EmailStartView(APIView):
    """
    POST /api/auth/email/start/

    Emails a six-digit code to her address, or to a corrected one she sends (which
    becomes her address, unverified, if nobody else has it). One code every 30s.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PhoneCodeThrottle]

    def post(self, request):
        serializer = EmailStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        email = (serializer.validated_data.get("email") or user.email).strip().lower()
        if email.endswith("@yasante.invalid") or user.email.lower().endswith("@yasante.invalid"):
            return Response({"message": "Use your own email address"}, status=400)
        changed = email != user.email.lower()

        if email != user.email.lower():
            if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                return Response(
                    {"message": "Another account already uses that email."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.email, user.email_verified = email, False
            user.save(update_fields=["email", "email_verified", "updated_at"])

        if user.email_verified:
            return Response(
                {"message": "Your email is already confirmed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Opening the screen again (not asking for a new code): the code already sent
        # still works, so say how long it has left instead of emailing another.
        if not serializer.validated_data["resend"] and not changed:
            live = (
                EmailChallenge.objects.filter(user=user, email=email, expires_at__gt=timezone.now())
                .order_by("-created_at")
                .first()
            )
            if live and not live.is_locked:
                age = (timezone.now() - live.created_at).total_seconds()
                return Response(
                    {
                        "resend_in_seconds": max(0, int(settings.VERIFICATION_CODE_RESEND_SECONDS - age)),
                        "expires_in_seconds": int((live.expires_at - timezone.now()).total_seconds()),
                    }
                )

        recent = EmailChallenge.objects.filter(
            user=user,
            email=email,
            created_at__gte=timezone.now() - timedelta(seconds=settings.VERIFICATION_CODE_RESEND_SECONDS),
        ).first()
        if recent:
            remaining = settings.VERIFICATION_CODE_RESEND_SECONDS - (timezone.now() - recent.created_at).seconds
            return Response(
                {"message": f"Wait {max(remaining, 1)} seconds before asking for another code."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        code = generate_code(settings.VERIFICATION_CODE_LENGTH)
        challenge = EmailChallenge.objects.create(
            user=user,
            email=email,
            code_hash=hash_code(code),
            expires_at=timezone.now() + timedelta(seconds=settings.VERIFICATION_CODE_EXPIRY_SECONDS),
        )
        if not send_email_code(email, user.name, code):
            # Not sent, so it mustn't block asking again straight away.
            challenge.delete()
            return Response(
                {"message": "We couldn’t send the email just now. Please try again in a moment."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "resend_in_seconds": settings.VERIFICATION_CODE_RESEND_SECONDS,
                "expires_in_seconds": settings.VERIFICATION_CODE_EXPIRY_SECONDS,
            }
        )


@extend_schema_view(post=extend_schema(request=EmailVerifySerializer, responses=UserResponseSerializer))
class EmailVerifyView(APIView):
    """POST /api/auth/email/verify/ — five tries per code."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = EmailVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        challenge = EmailChallenge.objects.filter(user=user, email=user.email.lower()).first()

        if not challenge:
            return Response(
                {"message": "Ask for a code first."}, status=status.HTTP_400_BAD_REQUEST
            )
        if challenge.is_expired:
            return Response(
                {"message": "This code has expired. Ask for a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if challenge.is_locked:
            return Response(
                {"message": "Too many tries. Ask for a new code."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        challenge.attempts += 1
        challenge.save(update_fields=["attempts"])
        if not verify_code(serializer.validated_data["code"].strip(), challenge.code_hash):
            remaining = settings.VERIFICATION_CODE_MAX_ATTEMPTS - challenge.attempts
            if remaining <= 0:
                return Response(
                    {"message": "Too many tries. Ask for a new code."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            return Response(
                {"message": f"That code isn’t right. {remaining} tries left."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.email_verified = True
        user.save(update_fields=["email_verified", "updated_at"])
        EmailChallenge.objects.filter(user=user).delete()
        return Response(UserSerializer(user).data)


@extend_schema_view(get=extend_schema(responses=InviteResponseSerializer))
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


@extend_schema_view(post=extend_schema(request=None, responses=UserResponseSerializer))
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


@extend_schema_view(get=extend_schema(responses=NotificationPreferencesSerializer), put=extend_schema(request=NotificationPreferencesRequestSerializer, responses=NotificationPreferencesSerializer))
class NotificationPreferencesView(APIView):
    """GET/PUT /api/notifications/preferences/ — which kinds of notification she gets."""

    permission_classes = [permissions.IsAuthenticated]

    def _present(self, muted):
        from apps.common.models import NOTIFICATION_CATEGORIES

        return {
            "categories": [
                {"id": key, "label": label, "on": key not in muted}
                for key, label in NOTIFICATION_CATEGORIES
            ]
        }

    def get(self, request):
        from apps.common.notifications import muted_categories

        return Response(self._present(muted_categories(request.user.pk)))

    def put(self, request):
        from apps.common.models import NOTIFICATION_CATEGORIES, OPT_IN_CATEGORIES, NotificationPreference
        from apps.common.notifications import muted_categories

        known = {key for key, _ in NOTIFICATION_CATEGORIES}
        # { categories: [{id, on}] } or { muted: [ids] }; "account" can't be muted.
        if "categories" in request.data:
            off = {c.get("id") for c in request.data["categories"] if not c.get("on", True)}
            on = {c.get("id") for c in request.data["categories"] if c.get("on", True)}
        else:
            off, on = set(request.data.get("muted") or []), set()
        muted = sorted({m for m in off if m in known and m != "account" and m not in OPT_IN_CATEGORIES})
        opted_in = sorted(OPT_IN_CATEGORIES & on)
        NotificationPreference.objects.update_or_create(user=request.user, defaults={"muted": muted, "opted_in": opted_in})
        return Response(self._present(muted_categories(request.user.pk)))
