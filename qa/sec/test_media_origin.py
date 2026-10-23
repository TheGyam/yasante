"""
Where a photo's address may point. Every photo the app posts goes through
`/api/uploads/` first: re-encoded (no EXIF, no GPS), sized, fingerprinted for the
stolen-portfolio check. A look or an avatar whose address points anywhere else skips
all of that, and its host sees the IP of everyone who scrolls past it and can swap the
picture after it was approved.
"""

import io

import pytest
from PIL import Image

pytestmark = pytest.mark.django_db

OUTSIDE = "https://tracker.example/pixel.jpg"


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


def _upload(api, user, kind="look"):
    buf = io.BytesIO()
    Image.new("RGB", (800, 1000), (180, 90, 120)).save(buf, "JPEG")
    buf.seek(0)
    buf.name = "photo.jpg"
    r = api(user).client.post("/api/uploads/", {"file": buf, "kind": kind}, format="multipart")
    assert r.status_code == 201, r.content
    return r.json()["uri"]


def _post_look(api, user, photo_uri):
    return api(user).client.post(
        "/api/looks/", {"photo_uri": photo_uri, "styles": ["knotless"], "visibility": "public"}, format="json"
    )


def test_a_look_from_her_own_upload_is_accepted(api, make_user, styles):
    """The control: the app's normal path must keep working once the hole is closed."""
    user = make_user()
    assert _post_look(api, user, _upload(api, user)).status_code == 201


def test_a_look_photo_cannot_live_on_someone_elses_server(api, make_user, styles):
    r = _post_look(api, make_user(), OUTSIDE)
    assert r.status_code == 400, f"look with an outside photo -> {r.status_code}"


def test_a_look_photo_must_be_the_posters_own_upload(api, make_user, styles):
    """Reusing another person's upload address is the stolen-portfolio check's blind
    spot: the fingerprint is only compared at upload time."""
    owner, thief = make_user(), make_user()
    r = _post_look(api, thief, _upload(api, owner))
    assert r.status_code == 400, f"look with someone else's upload -> {r.status_code}"


def test_an_avatar_cannot_live_on_someone_elses_server(api, make_user):
    """An avatar is drawn next to every comment, review and look she makes, so an
    outside one is a tracking pixel on most pages."""
    user = make_user()
    r = api(user).client.patch(f"/api/users/{user.pk}/", {"avatar_uri": OUTSIDE}, format="json")
    user.refresh_from_db()
    assert user.avatar_uri != OUTSIDE, f"outside avatar stored ({r.status_code})"
