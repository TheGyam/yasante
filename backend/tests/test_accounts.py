"""Sign-up, sign-in, token refresh, password reset, phone codes, invites, devices."""

from datetime import timedelta

import pytest
from django.utils import timezone

pytestmark = pytest.mark.django_db

SIGNUP = {
    "email": "new@test.dev",
    "name": "Ama Owusu",
    "password": "a-long-Passw0rd",
    "password_confirm": "a-long-Passw0rd",
    "role": "client",
    "age_confirmed": True,
    "policy_version": "2026-09",
}


def test_signup_returns_a_session_in_the_apps_shape(api):
    response = api().post("/api/auth/signup/", SIGNUP)
    assert response.status_code == 201
    body = response.json()
    assert set(body) >= {"user", "accessToken", "refreshToken", "expiresAt"}
    assert body["user"]["email"] == "new@test.dev"
    assert body["user"]["roles"] == ["client"]
    assert "phoneVerified" not in body["user"]


def test_signup_refuses_under_18_and_a_taken_email(api, make_user):
    under = api().post("/api/auth/signup/", {**SIGNUP, "age_confirmed": False})
    assert under.status_code == 400 and "18" in under.json()["message"]
    user = make_user()
    taken = api().post("/api/auth/signup/", {**SIGNUP, "email": user.email})
    assert taken.status_code == 400 and "already" in taken.json()["message"]


def test_a_valid_invite_makes_a_stylist_once(api):
    from apps.accounts.models import Invite

    Invite.objects.create(
        code="FOUNDING50", invited_by="Akua", expires_at=timezone.now() + timedelta(days=9)
    )
    first = api().post("/api/auth/signup/", {**SIGNUP, "invite_code": "FOUNDING50"})
    assert first.status_code == 201
    assert "stylist" in first.json()["user"]["roles"]
    again = api().post(
        "/api/auth/signup/", {**SIGNUP, "email": "b@test.dev", "invite_code": "FOUNDING50"}
    )
    assert again.status_code == 400


def test_login_and_wrong_password(api, make_user):
    user = make_user()
    ok = api().post("/api/auth/login/", {"email": user.email, "password": "password123"})
    assert ok.status_code == 200 and ok.json()["user"]["id"] == str(user.pk)
    bad = api().post("/api/auth/login/", {"email": user.email, "password": "nope"})
    assert bad.status_code == 400 and bad.json()["message"]


def test_refresh_rotates_and_revokes_the_old_token(api, make_user):
    user = make_user()
    session = api().post("/api/auth/login/", {"email": user.email, "password": "password123"}).json()
    first = api().post("/api/auth/refresh-token/", {"refreshToken": session["refreshToken"]})
    assert first.status_code == 200
    rotated = first.json()
    assert rotated["accessToken"] and rotated["refreshToken"] != session["refreshToken"]
    # The old one is revoked; the new one works — the app must store it.
    assert api().post("/api/auth/refresh-token/", {"refreshToken": session["refreshToken"]}).status_code == 401
    assert api().post("/api/auth/refresh-token/", {"refreshToken": rotated["refreshToken"]}).status_code == 200


def test_access_token_authenticates_requests(api, make_user):
    from rest_framework.test import APIClient

    user = make_user()
    token = api().post("/api/auth/login/", {"email": user.email, "password": "password123"}).json()["accessToken"]
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    assert client.get(f"/api/users/{user.pk}/").status_code == 200
    assert APIClient().get(f"/api/users/{user.pk}/").status_code == 401


def test_forgot_password_answers_the_same_either_way(api, make_user):
    user = make_user()
    known = api().post("/api/auth/forgot-password/", {"email": user.email})
    unknown = api().post("/api/auth/forgot-password/", {"email": "nobody@test.dev"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()


def test_reset_password_with_a_valid_token(api, make_user):
    from django.contrib.auth.tokens import default_token_generator

    user = make_user()
    token = default_token_generator.make_token(user)
    body = {"token": token, "uid": str(user.pk), "password": "Another-Passw0rd"}
    assert api().post("/api/auth/reset-password/", body).status_code == 200
    login = api().post("/api/auth/login/", {"email": user.email, "password": "Another-Passw0rd"})
    assert login.status_code == 200


def test_invites_look_up_and_redeem(api, make_user):
    from apps.accounts.models import Invite

    Invite.objects.create(code="JOIN1", invited_by="Akua", expires_at=timezone.now() + timedelta(days=3))
    info = api().get("/api/invites/JOIN1/")
    assert info.status_code == 200 and info.json()["invitedBy"] == "Akua"
    assert api().get("/api/invites/NOPE/").status_code == 404
    user = make_user()
    redeemed = api(user).post("/api/invites/JOIN1/redeem/")
    assert redeemed.status_code == 200 and "stylist" in redeemed.json()["roles"]
    assert api().get("/api/invites/JOIN1/").status_code == 410


def test_device_tokens_register_and_remove(api, make_user):
    as_user = api(make_user())
    created = as_user.post("/api/devices/", {"token": "ExponentPushToken[x]", "platform": "ios"})
    assert created.status_code == 201
    assert as_user.delete(f"/api/devices/{created.json()['id']}/").status_code == 204
