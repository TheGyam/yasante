"""
Files that aren't the photo they claim to be. `/api/uploads/` decodes everything with
Pillow and re-encodes it as JPEG; anything it can't decode must be a
400, never a 500 or a stored file. EXIF stripping is already in tests/test_media.py.
"""

import io

import pytest
from PIL import Image

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


def _post(api, user, data, name):
    buf = io.BytesIO(data)
    buf.name = name
    client = api(user).client
    client.raise_request_exception = False
    return client.post("/api/uploads/", {"file": buf, "kind": "look"}, format="multipart")


def _bomb():
    """A 20000 x 20000 PNG, a few tens of KB on disk, 1.2 GB once decoded to RGB:
    past Pillow's own MAX_IMAGE_PIXELS twice over, so `Image.open` raises."""
    buf = io.BytesIO()
    Image.new("1", (20000, 20000)).save(buf, "PNG", optimize=True)
    return buf.getvalue()


FAKES = {
    "html.jpg": b"<html><script>fetch('//canary.invalid/up')</script></html>",
    "image.svg": b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="9" height="9"/></svg>',
    "empty.jpg": b"",
    "truncated.jpg": b"\xff\xd8\xff\xe0\x00\x10JFIF\x00",
}


@pytest.mark.parametrize("name", sorted(FAKES))
def test_a_file_that_is_not_a_photo_is_refused(api, make_user, media_root, name):
    r = _post(api, make_user(), FAKES[name], name)
    assert r.status_code == 400, f"{name} -> {r.status_code}"
    assert not any(media_root.rglob("*.jpg")), "something was stored"


def test_a_decompression_bomb_is_refused(api, make_user, media_root):
    data = _bomb()
    assert len(data) < 15 * 1024 * 1024  # under the size limit, so only decoding can stop it
    r = _post(api, make_user(), data, "bomb.png")
    assert r.status_code == 400, f"decompression bomb -> {r.status_code}"


PHOTO_FORMATS = {"JPEG": "RGB", "PNG": "RGB", "WEBP": "RGB"}
# Formats no phone sends, each with its own decoder in Pillow's advisories (F41).
OTHER_FORMATS = {"TIFF": "RGB", "BMP": "RGB", "GIF": "P", "MSP": "1", "SPIDER": "F", "XBM": "1", "PCX": "RGB", "TGA": "RGB", "PPM": "RGB"}


def _encoded(fmt, mode):
    buf = io.BytesIO()
    Image.new(mode, (64, 48)).save(buf, fmt)
    return buf.getvalue()


@pytest.mark.parametrize("fmt", sorted(PHOTO_FORMATS))
def test_a_photo_format_is_accepted(api, make_user, fmt):
    """The control: the formats a phone sends get through."""
    r = _post(api, make_user(), _encoded(fmt, PHOTO_FORMATS[fmt]), f"photo.{fmt.lower()}")
    assert r.status_code == 201, f"{fmt} -> {r.status_code}"


@pytest.mark.xfail(strict=True, reason="F41: Image.open(upload) has no formats=, so every Pillow decoder is reachable")
@pytest.mark.parametrize("fmt", sorted(OTHER_FORMATS))
def test_only_photo_formats_are_decoded(api, make_user, media_root, fmt):
    r = _post(api, make_user(), _encoded(fmt, OTHER_FORMATS[fmt]), "photo.jpg")
    assert r.status_code == 400, f"{fmt} -> {r.status_code}"
    assert not any(media_root.rglob("*.jpg")), "something was stored"
