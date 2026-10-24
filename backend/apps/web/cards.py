"""
Share pictures drawn on the server: a shared collection's link shows its first three
pictures as one card (one large, two stacked, as the app shows it), 1200 by 630, the
size link previews use.
"""

import io
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

from django.core.files.storage import default_storage
from PIL import Image, ImageDraw, ImageFont, ImageOps

from apps.common.uploads import PHOTO_FORMATS

W, H, GAP = 1200, 630, 6
PLUM = (24, 10, 18)
MAX_BYTES = 8 * 1024 * 1024
# The site's own type, Instrument Sans (SIL Open Font License, fonts/OFL.txt).
FONT = Path(__file__).parent / "fonts" / "InstrumentSans_600SemiBold.ttf"


def _open(uri):
    """A picture we stored, read from storage; anyone else's over the web, within limits."""
    path = urlparse(uri).path
    try:
        if "/media/" in path:
            with default_storage.open(path.split("/media/", 1)[1]) as f:
                data = f.read(MAX_BYTES + 1)
        elif urlparse(uri).scheme in ("http", "https"):
            request = urllib.request.Request(uri, headers={"User-Agent": "Yasante link preview"})
            with urllib.request.urlopen(request, timeout=5) as response:  # noqa: S310 (http(s) only)
                data = response.read(MAX_BYTES + 1)
        else:
            return None
        if len(data) > MAX_BYTES:
            return None
        image = Image.open(io.BytesIO(data), formats=PHOTO_FORMATS)
        image.draft("RGB", (W, H))  # JPEGs decode small, which is all a tile needs
        return image.convert("RGB")
    except Exception:  # a missing or broken picture leaves a plain tile
        return None


def collage(uris):
    """JPEG bytes for the card, or None if fewer than three of the pictures could be read."""
    pictures = [p for p in (_open(u) for u in uris[:3]) if p is not None]
    if len(pictures) < 3:
        return None
    big_w = (W - GAP) * 2 // 3
    small_w, small_h = W - big_w - GAP, (H - GAP) // 2
    card = Image.new("RGB", (W, H), PLUM)
    card.paste(ImageOps.fit(pictures[0], (big_w, H)), (0, 0))
    card.paste(ImageOps.fit(pictures[1], (small_w, small_h)), (big_w + GAP, 0))
    card.paste(ImageOps.fit(pictures[2], (small_w, H - small_h - GAP)), (big_w + GAP, small_h + GAP))
    # The mark, small, so the link says where it goes.
    mark = Image.new("RGBA", (W, H))
    ImageDraw.Draw(mark).rounded_rectangle((28, H - 84, 190, H - 28), 28, fill=(24, 10, 18, 200))
    card.paste(mark, (0, 0), mark)
    ImageDraw.Draw(card).text((54, H - 74), "yasante", fill=(250, 244, 247), font=ImageFont.truetype(FONT, 30))
    out = io.BytesIO()
    card.save(out, "JPEG", quality=85, optimize=True)
    return out.getvalue()
