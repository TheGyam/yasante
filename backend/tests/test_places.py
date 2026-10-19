"""Area suggestions outside the UK come from Mapbox and are never kept."""

import io
import json

import pytest

pytestmark = pytest.mark.django_db


def test_suggestions_are_names_only_and_never_cached(api, make_user, settings, monkeypatch):
    settings.MAPBOX_TOKEN = "test-token"
    asked = []

    def fake(url, timeout):
        asked.append(url)
        body = {"features": [{"geometry": {"coordinates": [-0.2, 5.6]}, "properties": {"name": "Osu", "place_formatted": "Accra, Greater Accra, Ghana"}}]}
        return io.BytesIO(json.dumps(body).encode())

    monkeypatch.setattr("urllib.request.urlopen", fake)
    response = api(make_user()).get("/api/places/suggest/", q="Os", country="gh")
    assert response.status_code == 200 and response["Cache-Control"] == "no-store"
    # Only the name and where it is: no coordinates leave the server.
    assert response.json() == [{"name": "Osu", "context": "Accra, Greater Accra, Ghana"}]
    assert "country=gh" in asked[0] and "autocomplete=true" in asked[0]


def test_no_token_or_bad_input_means_no_suggestions(api, make_user, settings, monkeypatch):
    monkeypatch.setattr("urllib.request.urlopen", lambda *a, **k: pytest.fail("must not call out"))
    me = api(make_user())
    settings.MAPBOX_TOKEN = ""
    assert me.get("/api/places/suggest/", q="Osu", country="GH").json() == []
    settings.MAPBOX_TOKEN = "test-token"
    assert me.get("/api/places/suggest/", q="O", country="GH").json() == []
    assert me.get("/api/places/suggest/", q="Osu", country="ZZ").json() == []


def test_signed_out_people_cannot_use_our_quota(api):
    assert api().get("/api/places/suggest/", q="Osu", country="GH").status_code == 401
