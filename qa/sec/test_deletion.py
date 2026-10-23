"""
Deleting her account leaves nothing that says who she was (privacy policy; PR #88). Each
test makes her leave a trace somewhere, deletes the account through the API, then looks
for her email, phone number, name and the words she wrote in every table at once, so a
table nobody thought of is caught too.
"""

import json

import pytest

from tests.test_staff import staff_client

pytestmark = pytest.mark.django_db

NAME = "Zuwena Qartey"


def _everything():
    from django.apps import apps

    rows = []
    for model in apps.get_models():
        if model._meta.app_label in {"contenttypes", "auth", "sessions"}:
            continue
        for row in model.objects.values():
            rows.append((model._meta.label, json.dumps(row, default=str)))
    return rows


def _traces(*needles):
    return sorted({f"{label}: {needle!r}" for label, row in _everything() for needle in needles if needle in row})


@pytest.fixture
def her(api, make_user):
    user = make_user(name=NAME)

    def delete():
        r = api(user).client.delete(f"/api/users/{user.pk}/")
        assert r.status_code == 204, r.content

    return user, delete


@pytest.mark.xfail(strict=True, reason="F44: her own cancel reason stays on the booking and its history")
def test_her_cancel_reason_goes(api, her, make_stylist, book):
    user, delete = her
    booking = book(user, make_stylist())["id"]
    r = api(user).client.post(f"/api/bookings/{booking}/cancel/", {"reason": "TRACE-cancel moving to Leeds"}, format="json")
    assert r.status_code in {200, 201, 204}, r.content
    delete()
    assert _traces("TRACE-cancel", user.email, user.phone) == []


@pytest.mark.xfail(strict=True, reason="F44: other people's notifications keep her name")
def test_her_name_goes_from_other_peoples_notifications(api, her, make_user, make_look):
    user, delete = her
    look = make_look(make_user())
    r = api(user).client.post(f"/api/looks/{look.pk}/comments/", {"body": "TRACE-comment lovely"}, format="json")
    assert r.status_code == 201, r.content
    delete()
    assert _traces(NAME, "TRACE-comment", user.email) == []


@pytest.mark.xfail(strict=True, reason="F44: the staff trail keeps her name and email")
def test_her_email_goes_from_the_staff_trail(api, her, make_user):
    user, delete = her
    client, _ = staff_client(make_user, superuser=True)
    assert client.get(f"/data/reveal/accounts/user/{user.pk}/phone/").status_code == 200
    delete()
    assert _traces(user.email, user.phone) == []


def test_the_control_a_plain_account_leaves_nothing(her):
    """Guards the search: with no trace planted, her details are found nowhere."""
    user, delete = her
    assert _traces(user.email) != []  # found while she exists
    delete()
    assert _traces(NAME, user.email, user.phone) == []
