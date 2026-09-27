"""Sign in with Apple and Google: genuine tokens only, one account per person."""

import time
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

pytestmark = pytest.mark.django_db

KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER = rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture(autouse=True)
def providers(monkeypatch, settings):
    from apps.accounts import social

    settings.GOOGLE_CLIENT_IDS = ["web-client"]
    for name in ("apple", "google"):
        monkeypatch.setattr(social._keys[name], "get_signing_key_from_jwt", lambda token: SimpleNamespace(key=KEY.public_key()))


def token(provider="apple", key=KEY, **claims):
    now = int(time.time())
    body = {
        "iss": "https://appleid.apple.com" if provider == "apple" else "https://accounts.google.com",
        "aud": "com.yasante.app" if provider == "apple" else "web-client",
        "sub": "sub-1", "email": "ama@example.com", "email_verified": "true",
        "iat": now, "exp": now + 600, **claims,
    }
    return jwt.encode(body, key, algorithm="RS256")


def sign_in(api, provider="apple", **fields):
    body = {"provider": provider, "idToken": fields.pop("id_token", None) or token(provider), "ageConfirmed": True, "policyVersion": "2026-09", **fields}
    return api().client.post("/api/auth/social/", body, format="json")


def test_first_time_makes_a_confirmed_account(api):
    response = sign_in(api, name="Ama Mensah")
    assert response.status_code == 201
    body = response.json()
    assert body["created"] and body["accessToken"]
    assert body["user"]["emailVerified"] is True and body["user"]["name"] == "Ama Mensah"


def test_next_time_signs_into_the_same_account(api):
    first = sign_in(api).json()["user"]["id"]
    # Apple leaves the email out after the first time.
    again = sign_in(api, id_token=token(email=None))
    assert again.status_code == 200 and again.json()["user"]["id"] == first and not again.json()["created"]


def test_links_to_an_existing_email_account(api, make_user):
    user = make_user()
    user.email = "ama@example.com"
    user.save()
    response = sign_in(api, "google", id_token=token("google", email_verified=True))
    assert response.status_code == 200 and response.json()["user"]["id"] == str(user.pk)
    user.refresh_from_db()
    assert user.google_id == "sub-1"


def test_a_stylist_can_sign_up_this_way(api):
    body = sign_in(api, role="stylist").json()
    assert "stylist" in body["user"]["roles"]


@pytest.mark.parametrize("bad", [
    {"key": OTHER},                    # not signed by Apple
    {"aud": "com.someone.else"},       # for another app
    {"exp": int(time.time()) - 10},    # expired
])
def test_refuses_tokens_that_arent_genuine(api, bad):
    key = bad.pop("key", KEY)
    response = sign_in(api, id_token=token(key=key, **bad))
    assert response.status_code == 400
    assert "couldn’t sign you in with Apple" in response.json()["message"]


def test_a_new_account_needs_the_terms(api):
    response = sign_in(api, ageConfirmed=False)
    assert response.status_code == 400 and "18" in response.json()["message"]


def test_google_is_off_until_set_up(api, settings):
    settings.GOOGLE_CLIENT_IDS = []
    assert sign_in(api, "google", id_token=token("google")).status_code == 400


def test_deleting_the_account_revokes_apple(api, monkeypatch, settings):
    from apps.accounts import social
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec

    settings.APPLE_TEAM_ID, settings.APPLE_SIGN_IN_KEY_ID = "TEAM123", "KEY123"
    settings.APPLE_SIGN_IN_PRIVATE_KEY = ec.generate_private_key(ec.SECP256R1()).private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    ).decode()
    calls = []
    monkeypatch.setattr(social, "_apple_post", lambda path, fields: calls.append((path, fields)) or {"refresh_token": "r-1"})

    body = sign_in(api, authorizationCode="code-1").json()
    assert calls[0][0] == "/auth/token" and calls[0][1]["code"] == "code-1"
    from apps.accounts.models import User

    user = User.objects.get(pk=body["user"]["id"])
    assert user.apple_refresh_token == "r-1"
    assert api(user).client.delete(f"/api/users/{user.pk}/").status_code == 204
    assert calls[-1][0] == "/auth/revoke" and calls[-1][1]["token"] == "r-1"
