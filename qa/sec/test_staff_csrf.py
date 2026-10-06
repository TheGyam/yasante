"""
The staff workspace signs in with a session cookie, so every write under `/data/` has to
carry the CSRF token: otherwise any page a staff member opens could post to it in her
name. Django's test client skips CSRF unless told not to, so these tests turn it on and
post with a signed-in, verified superuser, without the token and then with it.
"""

import uuid

import pytest
from django.test import Client

from tests.test_staff import staff_client

pytestmark = pytest.mark.django_db

ANY = str(uuid.uuid4())

# Every route in apps/staff/urls.py that changes something, with placeholder ids: CSRF
# is checked before the view runs, so the object doesn't need to exist.
WRITES = [
    "errors/1/action/",
    f"review/reports/{ANY}/decide/",
    "undo/",
    f"reveal/accounts/user/{ANY}/phone/",
    "broadcasts/audience/",
    "broadcasts/receipts/",
    "broadcasts/test/",
    "broadcasts/send/",
    "session/",
    "two-factor/",
    "two-factor/codes/",
    f"two-factor/reset/{ANY}/",
    "forms/looks/style/",
    f"forms/looks/style/{ANY}/",
    f"delete/looks/style/{ANY}/",
    "actions/looks/look/",
    "quick-edit/looks/look/",
    "password/",
    f"password/accounts/user/{ANY}/",
]


def _is_csrf_refusal(r):
    return r.status_code == 403 and b"CSRF" in r.content


@pytest.fixture
def staff(make_user):
    client, user = staff_client(make_user, superuser=True)
    client.handler.enforce_csrf_checks = True
    return client


@pytest.mark.parametrize("path", WRITES)
def test_staff_writes_need_the_csrf_token(staff, path):
    r = staff.post("/data/" + path, {"intent": "logout"})
    assert _is_csrf_refusal(r), f"POST /data/{path} without a token -> {r.status_code}"


def test_the_token_lets_a_write_through(staff):
    """The control: with the token from the overview, the same kind of request is
    no longer refused for CSRF, so the test above is really about the token."""
    token = staff.get("/data/overview/").json()["csrfToken"]
    r = staff.post("/data/undo/", {}, HTTP_X_CSRFTOKEN=token)
    assert not _is_csrf_refusal(r), r.content[:200]


def test_signing_in_needs_the_csrf_token():
    """Login CSRF: a hostile page must not sign a staff member's browser into an
    account it controls."""
    client = Client(HTTP_HOST="admin.localhost", enforce_csrf_checks=True)
    r = client.post("/data/session/", {"username": "someone@test.dev", "password": "password123"})
    assert _is_csrf_refusal(r), r.status_code
