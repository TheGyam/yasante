"""
Builds YasanteMarks, a one-glyph font holding the plait we put between parts of a line
("Ama Mensah <plait> Knotless braids"). As a font character it costs what a letter
costs: no extra views, and it wraps and truncates with the text around it.

    pip install fonttools brotli
    python scripts/marks-font.py

Writes assets/fonts/YasanteMarks.ttf (the app) and web/src/shared/ui/marks.css (the site, with
the font inside it, so pages never wait on a request for it).
"""

import base64
import io
import math
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
MARK = 0xE000  # Private use: no other font draws anything here.
UNIT = 62  # Font units per pixel of the 14 x 8 drawing.
SIDE = 120  # Space either side, on top of the spaces around it in the text.
MIDDLE = 300  # Height of the plait's centre above the baseline: the middle of the lowercase.
STROKE = 1.2


def ring(pen, cx, cy, rx, ry, turn, clockwise):
    """One ellipse outline, as many short straight edges: smooth at text sizes."""
    steps = 48
    a = math.radians(turn)
    points = []
    for i in range(steps):
        t = 2 * math.pi * i / steps * (-1 if clockwise else 1)
        x, y = rx * math.cos(t), ry * math.sin(t)
        px = cx + x * math.cos(a) - y * math.sin(a)
        py = cy + x * math.sin(a) + y * math.cos(a)
        points.append((round(SIDE + px * UNIT), round(MIDDLE + (py - 4) * UNIT)))
    pen.moveTo(points[0])
    for point in points[1:]:
        pen.lineTo(point)
    pen.closePath()


def plait():
    pen = TTGlyphPen(None)
    # Three links of a braid, leaning alternately, like the preview Yaw chose.
    for cx, turn in ((3, 40), (7, -40), (11, 40)):
        ring(pen, cx, 4, 2.4 + STROKE / 2, 1.4 + STROKE / 2, turn, clockwise=True)
        ring(pen, cx, 4, 2.4 - STROKE / 2, 1.4 - STROKE / 2, turn, clockwise=False)
    return pen.glyph()


def build():
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder([".notdef", "plait"])
    fb.setupCharacterMap({MARK: "plait"})
    fb.setupGlyf({".notdef": TTGlyphPen(None).glyph(), "plait": plait()})
    fb.setupHorizontalMetrics({".notdef": (0, 0), "plait": (14 * UNIT + 2 * SIDE, SIDE)})
    # Ascent and descent inside Instrument Sans's, so the mark never makes a line taller.
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({"familyName": "YasanteMarks", "styleName": "Regular"})
    fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    fb.setupPost()
    app = ROOT / "assets" / "fonts" / "YasanteMarks.ttf"
    app.parent.mkdir(exist_ok=True)
    fb.save(app)
    web = TTFont(app)
    web.flavor = "woff2"
    data = io.BytesIO()
    web.save(data)
    font = base64.b64encode(data.getvalue()).decode()
    (ROOT / "web" / "src" / "shared" / "ui" / "marks.css").write_text(CSS.replace("FONT", font))


CSS = """/*
 * The plait (U+E000) is part of Instrument Sans for that one character, so it draws
 * wherever text does. The font is inside this file: no request, no flash.
 * Made by scripts/marks-font.py; don't edit by hand.
 */
@font-face {
  font-family: 'Instrument Sans';
  src: url(data:font/woff2;base64,FONT) format('woff2');
  unicode-range: U+E000;
  font-weight: 100 900;
  font-display: block;
}

.yasante-mark {
  color: var(--accent);
}
"""


if __name__ == "__main__":
    build()
