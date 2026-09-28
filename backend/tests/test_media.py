"""Uploads: three sizes, private proofs, files deleted with their owners, duplicates flagged."""

import io
import os

import pytest
from PIL import Image, ImageDraw

pytestmark = pytest.mark.django_db


def _photo(seed=0, size=(1200, 1500)):
    img = Image.new("RGB", size, (200, 120 + seed, 150))
    draw = ImageDraw.Draw(img)
    for i in range(12):  # enough structure for the hash to mean something
        draw.rectangle([i * 90, (i * 70 + seed * 13) % 1300, i * 90 + 60, (i * 70 + seed * 13) % 1300 + 180], fill=(i * 20, 40, 90))
    buf = io.BytesIO()
    img.save(buf, "JPEG")
    buf.seek(0)
    buf.name = "photo.jpg"
    return buf


def _upload(api, user, **fields):
    return api(user).client.post("/api/uploads/", {"file": _photo(fields.pop("seed", 0)), **fields}, format="multipart")


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


def test_three_sizes_and_a_fingerprint(api, make_user, media_root):
    from apps.common.models import Media

    body = _upload(api, make_user(), kind="look").json()
    assert body["uri"] and body["feedUri"] and body["thumbUri"] and body["photoAspect"] == 0.8
    media = Media.objects.get(pk=body["id"])
    assert len(media.phash) == 16 and media.visibility == "public"
    widths = [Image.open(media_root / p).width for p in media.paths()]
    assert widths == [1200, 1080, 400]
    # Re-encoded: no EXIF survives.
    assert not Image.open(media_root / media.full_path).getexif()


def test_a_proof_photo_is_private_to_its_owner(api, make_user, media_root):
    owner, stranger = make_user(), make_user()
    body = _upload(api, owner, kind="proof").json()
    assert "/api/media/" in body["uri"] and "feedUri" not in body
    assert not os.path.exists(media_root / "uploads")  # never in the public folder
    path = body["uri"].split("testserver")[-1]
    assert api(owner).client.get(path).status_code == 200
    assert api(stranger).client.get(path).status_code == 404
    assert api().client.get(path).status_code == 401


def test_files_go_when_the_look_or_account_goes(api, make_user, styles, media_root):
    from apps.common.models import Media

    user = make_user()
    body = _upload(api, user, kind="look").json()
    look = api(user).post("/api/looks/", {"photoUri": body["uri"], "styles": ["twists"]}).json()
    paths = Media.objects.get(pk=body["id"]).paths()
    assert all(os.path.exists(media_root / p) for p in paths)
    api(user).delete(f"/api/looks/{look['id']}/")
    assert not Media.objects.filter(pk=body["id"]).exists()
    assert not any(os.path.exists(media_root / p) for p in paths)
    # Account deletion takes every file she uploaded with it.
    kept = _upload(api, user, kind="avatar").json()
    kept_paths = Media.objects.get(pk=kept["id"]).paths()
    api(user).delete(f"/api/users/{user.pk}/")
    assert not any(os.path.exists(media_root / p) for p in kept_paths)


def test_near_duplicate_portfolios_are_flagged_across_accounts(api, make_user):
    from apps.common.models import Media

    original = _upload(api, make_user(), kind="portfolio", seed=3).json()
    own_again = _upload(api, Media.objects.get(pk=original["id"]).owner, kind="portfolio", seed=3).json()
    copied = _upload(api, make_user(), kind="portfolio", seed=3).json()
    different = _upload(api, make_user(), kind="portfolio", seed=40).json()
    assert Media.objects.get(pk=own_again["id"]).moderation_status == "ok"
    stolen = Media.objects.get(pk=copied["id"])
    assert stolen.moderation_status == "flagged" and stolen.duplicate_of_id is not None
    assert Media.objects.get(pk=different["id"]).moderation_status == "ok"


def test_a_new_profile_photo_is_saved(api, make_user, media_root, settings):
    settings.PUBLIC_BASE_URL = "https://api.yasante.com"
    user = make_user()
    uri = _upload(api, user, kind="avatar").json()["uri"]
    response = api(user).client.patch(f"/api/users/{user.pk}/", {"avatar_uri": uri}, format="json")
    assert response.status_code == 200, response.json()
    assert response.json()["avatarUri"] == uri


def test_a_stylists_page_wears_the_same_photo(api, make_stylist, settings):
    settings.PUBLIC_BASE_URL = "https://api.yasante.com"
    stylist = make_stylist()
    user = stylist.account
    uri = _upload(api, user, kind="avatar").json()["uri"]
    api(user).client.patch(f"/api/users/{user.pk}/", {"avatarUri": uri}, format="json")
    stylist.refresh_from_db()
    assert stylist.avatar_uri == uri


def test_the_app_can_report_a_crash(api):
    from apps.common.models import ClientError

    response = api().client.post(
        "/api/client-errors/",
        {"kind": "stall", "message": "Start-up stalled", "platform": "ios", "context": {"auth": False}},
        format="json",
    )
    assert response.status_code == 204
    error = ClientError.objects.get()
    assert error.kind == "stall" and error.platform == "ios" and error.context == {"auth": False}


def test_start_up_checkpoints_can_be_read_back(api):
    client = api().client
    client.post("/api/client-errors/", {"kind": "boot", "message": "js started", "platform": "ios", "context": {"launch": "ab12", "ms": 40}}, format="json")
    client.post("/api/client-errors/", {"kind": "crash", "message": "private detail"}, format="json")
    rows = client.get("/api/client-errors/").json()
    assert [r["checkpoint"] for r in rows] == ["js started"]  # crashes aren't listed
    assert rows[0]["platform"] == "ios" and rows[0]["launch"] == "ab12"
