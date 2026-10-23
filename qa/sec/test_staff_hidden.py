"""
Hidden details in the staff workspace (phone, hair details) are shown only through Show,
which needs `reveal_personal_data` and is logged. A record list must not answer questions
about them either: if a filter in the address on a hidden field changes the row count,
the value can be read off one letter at a time, with no permission and no log line.
"""

import pytest
from django.contrib.admin.models import LogEntry
from django.contrib.auth.models import Permission

from tests.test_staff import staff_client

pytestmark = pytest.mark.django_db


def _viewer(make_user, *codenames):
    """A staff member who may view these records but not reveal what's hidden in them."""
    client, staff = staff_client(make_user)
    for codename in codenames:
        staff.user_permissions.add(Permission.objects.get(codename=codename))
    return client, staff


def _count(client, path):
    r = client.get(path)
    return r.status_code, (r.json().get("count") if r.status_code == 200 else None)


def _answers(client, base, field, right, wrong):
    """True when filtering on `field` tells the right value from a wrong one."""
    hit = _count(client, f"{base}?{field}={right}")
    miss = _count(client, f"{base}?{field}={wrong}")
    return hit != miss, hit, miss


@pytest.mark.xfail(strict=True, reason="F42: a URL filter on a hidden field changes the record list's count")
def test_a_phone_number_cant_be_found_by_filtering(make_user):
    client, staff = _viewer(make_user, "view_user")
    person = make_user(name="Ama")
    logged = LogEntry.objects.count()
    leaks, hit, miss = _answers(client, "/data/records/accounts/user/", "phone__startswith", person.phone[:9].replace("+", "%2B"), "%2B1")
    assert not leaks, f"phone__startswith: right prefix {hit}, wrong prefix {miss}"
    assert LogEntry.objects.count() == logged


@pytest.mark.xfail(strict=True, reason="F42: a URL filter on a hidden field changes the record list's count")
def test_hair_details_cant_be_found_by_filtering(make_user):
    from apps.profiles.models import HairProfile

    client, staff = _viewer(make_user, "view_hairprofile")
    HairProfile.objects.create(user=make_user(), texture="coily", scalp=["dry"], goals=["growth"])
    leaks, hit, miss = _answers(client, "/data/records/profiles/hairprofile/", "texture", "coily", "straight")
    assert not leaks, f"texture: right {hit}, wrong {miss}"


def test_the_control_a_visible_field_still_filters(make_user):
    """Guards the test: the list does answer filters on fields that aren't hidden."""
    client, staff = _viewer(make_user, "view_user")
    person = make_user(name="Ama")
    leaks, hit, miss = _answers(client, "/data/records/accounts/user/", "email", person.email, "nobody@test.dev")
    assert leaks, f"email: {hit} vs {miss}"


@pytest.mark.xfail(strict=True, reason="F42: the record search matches on the hidden phone number")
def test_a_phone_number_cant_be_found_by_searching(make_user):
    client, staff = _viewer(make_user, "view_user")
    person = make_user(name="Ama")
    leaks, hit, miss = _answers(client, "/data/records/accounts/user/", "q", person.phone[-6:], "000000")
    assert not leaks, f"q=<last six digits>: right {hit}, wrong {miss}"
