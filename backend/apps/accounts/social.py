"""
Sign in with Apple and Google. The app gets an ID token from the phone's own sign-in
sheet; we check it's genuinely signed by Apple or Google, for this app, and not
expired, then read who it's for. No passwords or secrets are involved.
"""

import json
import logging
import time
import urllib.parse
import urllib.request

import jwt
from django.conf import settings

logger = logging.getLogger(__name__)
APPLE = "https://appleid.apple.com"

PROVIDERS = {
    "apple": {
        "keys": "https://appleid.apple.com/auth/keys",
        "issuers": ["https://appleid.apple.com"],
        "audiences": lambda: settings.APPLE_SIGN_IN_AUDIENCES,
    },
    "google": {
        "keys": "https://www.googleapis.com/oauth2/v3/certs",
        "issuers": ["accounts.google.com", "https://accounts.google.com"],
        "audiences": lambda: settings.GOOGLE_CLIENT_IDS,
    },
}

# Each fetches and caches its provider's public keys.
_keys = {name: jwt.PyJWKClient(p["keys"], cache_keys=True, lifespan=60 * 60) for name, p in PROVIDERS.items()}


class NotVerified(Exception):
    pass


def verify(provider, token):
    """{"sub", "email", "email_verified", "name"} from a genuine token, or NotVerified."""
    spec = PROVIDERS.get(provider)
    audiences = spec and [a for a in spec["audiences"]() if a]
    if not audiences:
        raise NotVerified(f"{provider} sign-in isn't set up")
    try:
        key = _keys[provider].get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token, key, algorithms=["RS256"], audience=audiences, issuer=spec["issuers"],
            options={"require": ["sub", "exp", "iat"]},
        )
    except (jwt.PyJWTError, KeyError) as error:
        raise NotVerified(str(error)) from error
    return {
        "sub": claims["sub"],
        "aud": claims["aud"],
        "email": (claims.get("email") or "").lower(),
        # Apple sends it as a string.
        "email_verified": str(claims.get("email_verified", "")).lower() == "true",
        "name": claims.get("name") or "",
    }


# ── Revoking Sign in with Apple ─────────────────────────────────────────────────
def _apple_secret(client_id):
    """The short-lived signed note that proves these requests come from us."""
    now = int(time.time())
    return jwt.encode(
        {"iss": settings.APPLE_TEAM_ID, "iat": now, "exp": now + 300, "aud": APPLE, "sub": client_id},
        settings.APPLE_SIGN_IN_PRIVATE_KEY,
        algorithm="ES256",
        headers={"kid": settings.APPLE_SIGN_IN_KEY_ID},
    )


def _apple_post(path, fields):
    request = urllib.request.Request(f"{APPLE}{path}", data=urllib.parse.urlencode(fields).encode())
    with urllib.request.urlopen(request, timeout=8) as response:
        return json.loads(response.read().decode() or "{}")


def apple_can_revoke():
    return bool(settings.APPLE_SIGN_IN_KEY_ID and settings.APPLE_SIGN_IN_PRIVATE_KEY and settings.APPLE_TEAM_ID)


def apple_refresh_token(code, client_id):
    """Swap the one-time code from sign-in for the token revoking needs. "" if we can't."""
    if not (code and apple_can_revoke()):
        return ""
    try:
        return _apple_post("/auth/token", {
            "client_id": client_id, "client_secret": _apple_secret(client_id),
            "code": code, "grant_type": "authorization_code",
        }).get("refresh_token", "")
    except Exception:  # noqa: BLE001 — signing in shouldn't fail over this.
        logger.warning("Couldn't get an Apple refresh token", exc_info=True)
        return ""


def revoke_apple(user):
    """Tell Apple this account is gone, so it drops the link. Best effort."""
    if not (user.apple_refresh_token and apple_can_revoke()):
        return
    client_id = settings.APPLE_SIGN_IN_AUDIENCES[0]
    try:
        _apple_post("/auth/revoke", {
            "client_id": client_id, "client_secret": _apple_secret(client_id),
            "token": user.apple_refresh_token, "token_type_hint": "refresh_token",
        })
    except Exception:  # noqa: BLE001
        logger.warning("Couldn't revoke Sign in with Apple for %s", user.pk, exc_info=True)
