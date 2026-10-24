"""
Bodies of the wrong shape. The app always sends a JSON object; anyone else can send a
list or a number. Each must get a 4xx, never a crash: a 500 is logged as a server error
and hides real ones.
"""

import pytest
from rest_framework.test import APIClient

# A sample of the 24 operations schemathesis found crashing on a non-object body.
ROUTES = ["/api/collections/", "/api/care-plans/", "/api/shelf/", "/api/blocks/", "/api/slot-interests/"]


@pytest.mark.parametrize("route", ROUTES)
@pytest.mark.parametrize("body", [[], 7])
def test_a_body_that_is_not_an_object_is_refused(make_user, route, body):
    client = APIClient()
    client.force_authenticate(make_user())
    client.raise_request_exception = False
    r = client.post(route, body, format="json")
    assert 400 <= r.status_code < 500, f"{route} {body!r} -> {r.status_code}"


# Found by schemathesis on 24-10 (SEC-claude-20261024c), on routes added in #82-#123.
EVENT = {"session": "qa-session-1", "surface": "home", "lookId": "e3e70682-c209-1cac-a29f-6fbed82c07cd", "kind": "impression"}


@pytest.mark.parametrize("stray", [0, None, "AAA"])
@pytest.mark.xfail(strict=True, reason="F64: a feed event that isn't an object is a 500 (TypeError)")
def test_a_feed_event_that_is_not_an_object_is_refused(stray):
    """Open to signed-out visitors, so anyone can make this 500."""
    client = APIClient()
    client.raise_request_exception = False
    r = client.post("/api/feed/events/", {"events": [EVENT, stray]}, format="json")
    assert 400 <= r.status_code < 500, r.status_code


def test_feed_events_control():
    client = APIClient()
    r = client.post("/api/feed/events/", {"events": [EVENT]}, format="json")
    assert r.status_code < 300, r.status_code


@pytest.mark.xfail(strict=True, reason="F64: a preference category that isn't a string is a 500 (AttributeError)")
def test_a_preference_category_that_is_not_a_string_is_refused(make_user):
    client = APIClient()
    client.force_authenticate(make_user())
    client.raise_request_exception = False
    r = client.put("/api/notifications/preferences/", {"categories": [[None, None]], "muted": []}, format="json")
    assert 400 <= r.status_code < 500, r.status_code


@pytest.mark.xfail(strict=True, reason="F64: a NUL character in a care plan is a 500 (DataError from Postgres)")
def test_a_nul_character_in_a_care_plan_is_refused(make_user):
    client = APIClient()
    client.force_authenticate(make_user())
    client.raise_request_exception = False
    plan = client.post("/api/care-plans/", {"name": "QA plan", "steps": ["Rinse"], "frequency": "daily",
                                            "timeOfDay": "morning"}, format="json")
    assert plan.status_code == 201, (plan.status_code, plan.data)
    r = client.patch(f"/api/care-plans/{plan.data['id']}/", {"steps": ["Rin\x00se"]}, format="json")
    assert 400 <= r.status_code < 500, r.status_code
