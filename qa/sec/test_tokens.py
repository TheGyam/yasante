"""
Tokens the way the app really sends them: issued by sign-in, carried as a Bearer header
(no force_authenticate), so the server's own checks run.
"""

import pytest
from rest_framework.test import APIClient


def _signed_in(user):
    from django.core.cache import cache

    cache.clear()  # test_limits may have used up the sign-in limit already
    r = APIClient().post("/api/auth/login/", {"email": user.email, "password": "password123"}, format="json")
    assert r.status_code == 200, r.content
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['accessToken']}")
    return client, r.json()["refreshToken"]


def test_a_deactivated_account_is_locked_out_at_once(make_user):
    """Staff switch off `Is active`: the app's existing tokens must stop working
    (djangorestframework-simplejwt CVE-2024-22513 is about exactly this)."""
    user = make_user()
    client, refresh = _signed_in(user)
    assert client.get(f"/api/users/{user.pk}/").status_code == 200
    user.is_active = False
    user.save(update_fields=["is_active"])
    assert client.get(f"/api/users/{user.pk}/").status_code == 401
    r = APIClient().post("/api/auth/refresh-token/", {"refreshToken": refresh}, format="json")
    if r.status_code == 200:  # it should refuse; at the least, what it mints must not work
        again = APIClient()
        again.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['accessToken']}")
        assert again.get(f"/api/users/{user.pk}/").status_code == 401, "a deactivated account got back in"
    assert r.status_code in {400, 401}, f"refresh still issues tokens to a deactivated account: {r.status_code}"
