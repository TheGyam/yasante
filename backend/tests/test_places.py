"""Area suggestions outside the UK come from Photon (OpenStreetMap), in her country only."""

import io
import json

import pytest

pytestmark = pytest.mark.django_db


def place(name, country, city=None, state=None):
    return {"properties": {"name": name, "countrycode": country, "city": city, "state": state}, "geometry": {"coordinates": [-0.2, 5.6]}}


@pytest.fixture
def photon(monkeypatch):
    asked = []

    def fake(request, timeout):
        asked.append(request.full_url)
        if "layer=country" in request.full_url:
            centre = {"properties": {"name": "Ghana", "countrycode": "GH"}, "geometry": {"coordinates": [-1.08, 8.03]}}
            return io.BytesIO(json.dumps({"features": [centre]}).encode())
        features = [place("Osu", "GH", "Accra", "Greater Accra Region"), place("Osu", "NG", state="Enugu"), place("Osu", "GH", "Accra", "Greater Accra Region")]
        return io.BytesIO(json.dumps({"features": features}).encode())

    monkeypatch.setattr("urllib.request.urlopen", fake)
    return asked


def test_suggestions_are_in_her_country_and_named_only(api, make_user, photon):
    response = api(make_user()).get("/api/places/suggest/", q="Os", country="gh")
    assert response.status_code == 200
    # Hers only, once each, and no coordinates leave the server.
    assert response.json() == [{"name": "Osu", "context": "Accra, Greater Accra Region"}]
    # Leaning towards the middle of Ghana, so its places come before the world's.
    search = photon[-1]
    assert "layer=locality" in search and "q=Os" in search and "lat=8.03" in search


def test_the_same_letters_are_asked_about_once_a_day(api, make_user, photon):
    me = api(make_user())
    me.get("/api/places/suggest/", q="Osu", country="GH")
    me.get("/api/places/suggest/", q="osu", country="GH")
    me.get("/api/places/suggest/", q="Osu Ba", country="GH")
    # Ghana's middle once, then one search for each new set of letters.
    assert len(photon) == 3


def test_bad_input_means_no_suggestions(api, make_user, monkeypatch):
    monkeypatch.setattr("urllib.request.urlopen", lambda *a, **k: pytest.fail("must not call out"))
    me = api(make_user())
    assert me.get("/api/places/suggest/", q="O", country="GH").json() == []
    assert me.get("/api/places/suggest/", q="Osu", country="ZZ").json() == []


def test_signed_out_people_cannot_use_it(api):
    assert api().get("/api/places/suggest/", q="Osu", country="GH").status_code == 401
