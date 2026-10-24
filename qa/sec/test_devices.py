"""
Push tokens. `POST /api/devices/` moves a token that is already registered to whoever
sends it last (`DeviceTokenCreateView`), so the same phone can change accounts. The cost:
anyone who learns someone's Expo push token gets her notifications (booking times,
addresses, messages) from then on, and she gets none. Expo tokens are hard to guess, so
the risk is low; whether to keep the design is TheGyam's call.
"""

import pytest

pytestmark = pytest.mark.django_db

TOKEN = "ExponentPushToken[qa-victim-0000000000]"


@pytest.mark.xfail(strict=True, reason="F36: a known push token can be taken by another account (kept by design, #15; #149)")
def test_another_account_cannot_take_her_push_token(api, make_user):
    from apps.accounts.models import DeviceToken

    victim, other = make_user(), make_user()
    assert api(victim).client.post("/api/devices/", {"token": TOKEN, "platform": "android"}, format="json").status_code == 201
    api(other).client.post("/api/devices/", {"token": TOKEN, "platform": "android"}, format="json")
    assert DeviceToken.objects.filter(token=TOKEN, user=victim).exists(), "her token now belongs to someone else"


def test_she_cannot_delete_someone_elses_push_token(api, make_user):
    from apps.accounts.models import DeviceToken

    victim, other = make_user(), make_user()
    device = DeviceToken.objects.create(user=victim, token=TOKEN, platform="android")
    api(other).client.delete(f"/api/devices/{device.pk}/")
    assert DeviceToken.objects.filter(pk=device.pk).exists()
