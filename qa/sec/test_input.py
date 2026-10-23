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
