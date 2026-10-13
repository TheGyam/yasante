"""
Clean the old background out of the flyaways around Nana Ama's braids.

  python web/scripts/hero/fringe.py [--ffmpeg ffmpeg]

She was painted on a magenta ground, and ama.py keeps the pockets of it that her curls
close in, so a dark pink edge showed around her hair once the page's colours moved to Ube.
This finds those pockets (magenta-red, reached from outside her through other such pixels,
so the dark red in her lip corners and ears is left alone), makes them see-through, and
un-mixes the colour from the strands that cross them. It rewrites
src/features/home/media/ama/ama.webp in place; run it after ama.py if she's repainted.
"""
import argparse
import os
import subprocess

import numpy as np
from PIL import Image, ImageChops, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
AMA = os.path.join(HERE, '../../src/features/home/media/ama/ama.webp')
BAND = 70  # how far in from where she ends (px, at 1400) the old background can sit

ap = argparse.ArgumentParser()
ap.add_argument('--ffmpeg', default='ffmpeg')
args = ap.parse_args()

# ---------------------------------------------------------------- OKLCH, to judge hue as the eye does
M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566],
               [0.0883024619, 0.2817188376, 0.6299787005]])
M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099],
               [0.0259040371, 0.7827717662, -0.8086757660]])


def oklch(rgb):
    c = rgb / 255
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    lab = np.cbrt(lin @ M1.T) @ M2.T
    return lab[..., 0], np.hypot(lab[..., 1], lab[..., 2]), np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360


def ramp(x, lo, hi):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- find the old background
pixels = np.array(Image.open(AMA).convert('RGBA')).astype(np.float64)
rgb, alpha = pixels[..., :3], pixels[..., 3] / 255
L, C, H = oklch(rgb)
hue = np.where(H < 180, H, H - 360)
clear = Image.fromarray(((alpha < 0.1) * 255).astype(np.uint8))
near = clear.filter(ImageFilter.MaxFilter(9)).resize((350, 350))
near = np.array(near.filter(ImageFilter.MaxFilter(2 * (BAND // 4) + 1)).resize(clear.size, Image.BILINEAR)) / 255
# magenta to red, not the warm skin and rim light; coloured, and not light
old = ramp(hue, -40, -15) * (1 - ramp(hue, 22, 29)) * ramp(C, 0.035, 0.06) * (1 - ramp(L, 0.58, 0.66)) * near

reach, gate = clear, Image.fromarray((((alpha < 0.1) | (old > 0.25)) * 255).astype(np.uint8))
for i in range(400):
    grown = ImageChops.multiply(reach.filter(ImageFilter.MaxFilter(3)), gate)
    if ImageChops.difference(grown, reach).getbbox() is None:
        break
    reach = grown
old = np.clip(old * np.array(reach.filter(ImageFilter.MaxFilter(3))) / 255, 0, 1)

# ---------------------------------------------------------------- take it out
sure = (old > 0.9) & (alpha > 0.9)
if sure.sum() < 100:
    raise SystemExit('no old background left to clean')
ground = np.median(rgb[sure], axis=0)
keep = 1 - old
fg = np.where(keep[..., None] > 0.05, (rgb - old[..., None] * ground) / np.maximum(keep[..., None], 0.05), rgb)
out = np.dstack([np.clip(fg, 0, 255), alpha * keep * 255]).round().astype(np.uint8)
print('old background', ground.round(), f'cleared from {int((old > 0.5).sum())} pixels')

h, w = out.shape[:2]
subprocess.run([args.ffmpeg, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{w}x{h}', '-i', '-',
                '-c:v', 'libwebp', '-quality', '84', '-pix_fmt', 'yuva420p', AMA],
               input=np.ascontiguousarray(out).tobytes(), check=True)
print('wrote', AMA)
