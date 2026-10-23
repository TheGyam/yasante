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


def _editor(make_user, *codenames):
    """May view and change these records, but not reveal what's hidden in them."""
    return _viewer(make_user, *codenames)


@pytest.mark.xfail(strict=True, reason="F46: a form sent back with an error shows the hidden values it kept")
def test_a_form_with_an_error_does_not_show_the_hidden_phone(make_user):
    from tests.test_staff_privacy import form_as_shown

    client, staff = _editor(make_user, "view_user", "change_user")
    person = make_user(name="Ama")
    body = form_as_shown(client, person)
    body["email"] = "not an email"
    r = client.post(f"/data/forms/accounts/user/{person.pk}/", body)
    assert r.status_code == 422, r.content
    assert person.phone not in r.content.decode()


@pytest.mark.xfail(strict=True, reason="F46: a form sent back with an error shows the hidden values it kept")
def test_a_form_with_an_error_does_not_show_hidden_hair_details(make_user):
    from apps.profiles.models import HairProfile
    from tests.test_staff_privacy import form_as_shown

    client, staff = _editor(make_user, "view_hairprofile", "change_hairprofile")
    profile = HairProfile.objects.create(user=make_user(), texture="coily", scalp=["flaky"], postcode="SE15 4QJ")
    url = f"/data/forms/profiles/hairprofile/{profile.pk}/"
    body = form_as_shown(client, None, url)
    body["user"] = "00000000-0000-0000-0000-000000000000"
    r = client.post(url, body)
    assert r.status_code == 422, r.content
    page = r.content.decode()
    assert not [word for word in ("coily", "flaky", "SE15 4QJ") if word in page]


def test_the_control_a_typed_value_is_echoed(make_user):
    """Guards the two above: what she typed herself still comes back on an error."""
    from tests.test_staff_privacy import form_as_shown

    client, staff = _editor(make_user, "view_user", "change_user")
    person = make_user(name="Ama")
    body = form_as_shown(client, person)
    body.update(email="not an email", phone="+447700900999")
    r = client.post(f"/data/forms/accounts/user/{person.pk}/", body)
    assert r.status_code == 422 and "+447700900999" in r.content.decode()
