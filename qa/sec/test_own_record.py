"""
What a person may change about herself. `test_access.py` covers other people's records;
this covers the fields of her own that only staff or the server may set. Each request
is sent as the app would, and the database is read back: a 200 that quietly ignores a
field is fine, a field that changes is not.
"""

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

PROTECTED = {
    "is_staff": True,
    "is_superuser": True,
    "is_active": False,
    "roles": ["client", "stylist", "staff"],
    "email_verified": True,
    "phone": "+447700900999",
    "phone_verified": True,
    "id": "00000000-0000-0000-0000-000000000001",
}


def _snapshot(user):
    user.refresh_from_db()
    return {f: getattr(user, f) for f in PROTECTED}


@pytest.mark.parametrize("field", sorted(PROTECTED))
def test_her_own_profile_update_cannot_set_protected_fields(api, make_user, field):
    user = make_user(verified=False)
    user.email_verified = False
    user.save(update_fields=["email_verified"])
    before = _snapshot(user)
    api(user).client.patch(f"/api/users/{user.pk}/", {field: PROTECTED[field], "name": "Still Her"}, format="json")
    after = _snapshot(user)
    assert after == before, f"PATCH {field} changed {set(k for k in before if before[k] != after[k])}"


def test_a_new_email_must_be_proved_again(api, make_user):
    user = make_user()
    user.email_verified = True
    user.save(update_fields=["email_verified"])
    api(user).client.patch(f"/api/users/{user.pk}/", {"email": "new.address@test.dev"}, format="json")
    user.refresh_from_db()
    assert user.email == "new.address@test.dev" and not user.email_verified


def test_an_email_cannot_be_taken_from_someone_else(api, make_user):
    """Case and spaces must not get round the uniqueness check: two accounts on one
    address would split password resets between them."""
    victim, user = make_user(), make_user()
    for spelling in (victim.email, victim.email.upper(), f"  {victim.email}  "):
        r = api(user).client.patch(f"/api/users/{user.pk}/", {"email": spelling}, format="json")
        assert r.status_code == 400, f"{spelling!r} -> {r.status_code}"


def test_sign_up_cannot_set_protected_fields():
    """One request with every extra field (sign-up allows three a minute)."""
    from apps.accounts.models import User

    body = {
        "email": "fresh@test.dev",
        "name": "Fresh",
        "password": "a-Long-pass-123",
        "password_confirm": "a-Long-pass-123",
        "role": "client",
        "age_confirmed": True,
        "policy_version": "2026-09",
        "roles": ["client", "staff"],
        "is_staff": True,
        "is_superuser": True,
        "email_verified": True,
    }
    r = APIClient().post("/api/auth/signup/", body, format="json")
    assert r.status_code in {200, 201}, r.content
    user = User.objects.get(email="fresh@test.dev")
    assert user.roles == ["client"] and not user.is_staff and not user.is_superuser and not user.email_verified
