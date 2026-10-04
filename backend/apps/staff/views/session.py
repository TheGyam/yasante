import hashlib
import hmac
import secrets
import time
from urllib.parse import quote, urlencode

from django.contrib import admin
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.hashers import check_password
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.debug import sensitive_post_parameters
from django.views.decorators.http import require_http_methods, require_POST

from ..access import staff_data
from ..audit import security_event
from ..models import StaffSecondFactor
from ..notifications import notify_factor_change
from ..throttles import code_limited, sign_in_failed, sign_in_limited, release_sign_in
from ..totp import matching_step, new_secret


def verified(request):
    stamp = request.session.get("staff_2fa_verified")
    return bool(stamp and StaffSecondFactor.objects.filter(
        user=request.user, confirmed_at=stamp).exists())


def session_data(request):
    # Password-pending sessions need the base staff check to complete enrolment.
    allowed = AdminSite.has_permission(admin.site, request)
    ready = allowed and verified(request)
    phase = "password"
    if allowed and request.session.get("staff_2fa_pending"):
        factor = StaffSecondFactor.objects.filter(user=request.user).first()
        phase = "verify" if factor and factor.confirmed_at else "enroll"
    return {"authenticated": bool(ready), "phase": phase, "csrfToken": get_token(request)}


@sensitive_post_parameters("password")
@csrf_protect
@require_http_methods(["GET", "POST"])
def session(request):
    if request.method == "POST":
        if request.POST.get("intent") == "logout":
            security_event(request, "Staff sign-out", request.user if request.user.is_authenticated else None)
            logout(request)
        else:
            email = request.POST.get("username", "").strip().lower()[:254]
            if sign_in_limited(request, email):
                security_event(request, "Staff sign-in throttled", email=email)
                return JsonResponse({"message": "Too many attempts. Try again later."}, status=429)
            try:
                user = authenticate(request, username=email, password=request.POST.get("password", ""))
                if not user or not user.is_active or not user.is_staff:
                    sign_in_failed(email)
                    security_event(request, "Staff sign-in failed", email=email)
                    return JsonResponse({"message": "Check your staff email and password."}, status=403)
            finally:
                release_sign_in(email)
            login(request, user)
            request.session.set_expiry(60 * 60 * 8)
            request.session.pop("staff_2fa_verified", None)
            request.session["staff_2fa_pending"] = True
            security_event(request, "Staff password accepted; 2FA pending", user)
    return JsonResponse(session_data(request))


@sensitive_post_parameters("code")
@csrf_protect
@require_http_methods(["GET", "POST"])
def two_factor(request):
    if not AdminSite.has_permission(admin.site, request) or not request.session.get("staff_2fa_pending"):
        return JsonResponse({"message": "Sign in before verifying your second factor."}, status=403)
    if request.method == "POST" and code_limited(request):
        security_event(request, "2FA throttled", request.user)
        return JsonResponse({"message": "Too many codes. Try again in a minute."}, status=429)
    with transaction.atomic():
        factor, created = StaffSecondFactor.objects.get_or_create(user=request.user)
        factor = StaffSecondFactor.objects.select_for_update().get(pk=factor.pk)
        if created or not factor.secret:
            factor.set_secret(new_secret())
            factor.save(update_fields=["secret"])
            security_event(request, "2FA enrolment started", request.user)
        enrolling = factor.confirmed_at is None
        if request.method == "GET":
            if not enrolling:
                return JsonResponse({"phase": "verify"})
            secret = factor.get_secret()
            uri = "otpauth://totp/" + quote("Yasante:" + request.user.email, safe="") + "?" + urlencode(
                {"secret": secret, "issuer": "Yasante", "algorithm": "SHA1", "digits": 6, "period": 30})
            return JsonResponse({"phase": "enroll", "secret": " ".join(secret[i:i+4] for i in range(0, len(secret), 4)), "uri": uri})
        submitted = request.POST.get("code", "").strip().replace(" ", "").replace("-", "")[:64]
        step = matching_step(factor.get_secret(), submitted, time.time(), factor.last_used_step)
        recovery = None
        if step is None and not enrolling:
            digest = hashlib.sha256(submitted.encode()).hexdigest()
            recovery = next((value for value in factor.recovery_codes if (
                check_password(submitted, value) if "$" in value else hmac.compare_digest(digest, value)
            )), None)
        if step is None and not recovery:
            security_event(request, "2FA failed", request.user)
            return JsonResponse({"message": "That code is invalid or has already been used."}, status=403)
        plain_codes = []
        if enrolling:
            factor.confirmed_at = timezone.now()
            codes = [secrets.token_hex(8) for _ in range(10)]
            factor.recovery_codes = [hashlib.sha256(value.encode()).hexdigest() for value in codes]
            plain_codes = ["-".join(value[i:i+4] for i in range(0, 16, 4)) for value in codes]
        if recovery:
            factor.recovery_codes.remove(recovery)
        if step is not None:
            factor.last_used_step = step
        factor.save()
        if enrolling or recovery:
            notify_factor_change(request, request.user, "2FA enrolled" if enrolling else "a recovery code was used")
        request.session["staff_2fa_verified"] = factor.confirmed_at.isoformat()
        request.session.pop("staff_2fa_pending", None)
        security_event(request, "2FA enrolled" if enrolling else "2FA recovery verified" if recovery else "2FA verified", request.user)
        security_event(request, "Staff sign-in", request.user)
        return JsonResponse({"verified": True, "recoveryCodes": plain_codes})


@staff_data
@csrf_protect
@require_POST
def reset_factor(request, user_id):
    if not request.user.is_superuser:
        raise PermissionDenied
    target = get_object_or_404(get_user_model(), pk=user_id, is_staff=True)
    StaffSecondFactor.objects.filter(user=target).delete()
    security_event(request, f"2FA reset for {target.email}", request.user)
    notify_factor_change(request, target, "2FA was reset by a superuser")
    return {"reset": True}


@staff_data
@csrf_protect
@sensitive_post_parameters("code")
@require_http_methods(["GET", "POST"])
def recovery_codes(request):
    """How many recovery codes are left; a current authenticator code makes a fresh set."""
    factor = get_object_or_404(StaffSecondFactor, user=request.user, confirmed_at__isnull=False)
    if request.method == "GET":
        return {"remaining": len(factor.recovery_codes), "since": factor.confirmed_at.isoformat()}
    if code_limited(request):
        return JsonResponse({"message": "Too many codes. Try again in a minute."}, status=429)
    with transaction.atomic():
        factor = StaffSecondFactor.objects.select_for_update().get(pk=factor.pk)
        submitted = request.POST.get("code", "").strip().replace(" ", "")[:6]
        step = matching_step(factor.get_secret(), submitted, time.time(), factor.last_used_step)
        if step is None:
            security_event(request, "Recovery code refresh refused", request.user)
            return JsonResponse({"message": "That code didn’t match. Use the current code from your authenticator."}, status=403)
        codes = [secrets.token_hex(8) for _ in range(10)]
        factor.recovery_codes = [hashlib.sha256(value.encode()).hexdigest() for value in codes]
        factor.last_used_step = step
        factor.save(update_fields=["recovery_codes", "last_used_step"])
    security_event(request, "Recovery codes replaced", request.user)
    notify_factor_change(request, request.user, "new recovery codes were made; the old ones no longer work")
    return {"recoveryCodes": codes}
