"""
Sign-in sessions and the phones they get notifications on. A session is a chain of
refresh tokens (each refresh swaps the token for a new one); a push token belongs to
the session that registered it and follows the chain, so whenever a session ends,
however it ends, that phone stops getting her notifications.
"""

import base64
import json
from datetime import datetime, timezone as tz

from rest_framework_simplejwt.tokens import RefreshToken

SESSION_CLAIM = "sid"


def issue(user):
    """A new refresh token, with an access token that says which session it's from."""
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token
    access[SESSION_CLAIM] = refresh["jti"]
    return refresh, access


def _ends(refresh):
    return datetime.fromtimestamp(refresh["exp"], tz=tz.utc)


def rotated(old_jti, refresh):
    """The session's refresh token was swapped: its phones follow, until the new one ends."""
    from .models import DeviceToken

    DeviceToken.objects.filter(session=old_jti).update(session=refresh["jti"], expires_at=_ends(refresh))


def register(user, auth, token, platform):
    """This phone's notifications go to whoever signed in on it, for as long as that sign-in lasts."""
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

    from .models import DeviceToken

    session = (auth.get(SESSION_CLAIM) if auth is not None else None) or ""
    ends = OutstandingToken.objects.filter(jti=session).values_list("expires_at", flat=True).first()
    if ends is None:  # an access token from before sessions were named: no longer than a sign-in lasts
        from django.conf import settings
        from django.utils import timezone

        ends = timezone.now() + settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
    # The same phone moves to the account signing in on it (shared phones, switching accounts).
    DeviceToken.objects.filter(token=token).delete()
    return DeviceToken.objects.create(user=user, token=token, platform=platform, session=session, expires_at=ends)


def jti_of(raw):
    """The refresh token's id, read without checking it: an expired one still names its session."""
    try:
        payload = raw.split(".")[1]
        return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))).get("jti")
    except (AttributeError, IndexError, ValueError):
        return None


def end(jtis):
    """These sessions ended: their phones stop getting notifications."""
    from .models import DeviceToken

    DeviceToken.objects.filter(session__in=[j for j in jtis if j]).delete()


def end_all(user):
    from .models import DeviceToken

    DeviceToken.objects.filter(user=user).delete()
