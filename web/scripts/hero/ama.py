"""
Ama's painting (from paint.py, on a flat background) -> what the home page loads.

  python web/scripts/hero/ama.py <painting.png> [--model path/to/model.onnx] [--ffmpeg ffmpeg]

Writes, into src/features/home/media/ama/:
  ama.webp        the painting cut out of its background (alpha), 1400px
  ama-depth.webp  how near each point is, white nearest (the page turns her head with it), 700px

The cut-out keys out the background colour where it touches the edges of the picture, or
fills a sizeable pocket (so small dark shadows inside her stay solid), and un-mixes the background from soft edges and
flyaways. The depth is Depth Anything V2 Small (Apache-2.0, onnx-community/depth-anything-v2-small).
"""
import argparse
import os
import re
import subprocess

import numpy as np
import onnxruntime as ort
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '../../src/features/home/media/ama')

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('--model', default='model.onnx')
ap.add_argument('--ffmpeg', default='ffmpeg')
args = ap.parse_args()


def read(path, size=None):
    """RGB pixels as uint8 (h, w, 3), resized to size x size if given."""
    probe = subprocess.run([args.ffmpeg, '-i', path], capture_output=True, text=True).stderr
    w, h = (int(v) for v in re.search(r', (\d{2,5})x(\d{2,5})', probe).groups())
    vf = ['-vf', f'scale={size}:{size}:flags=bicubic'] if size else []
    raw = subprocess.run([args.ffmpeg, '-loglevel', 'error', '-i', path, *vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(size or h, size or w, 3)


def write(pixels, fmt, path, size, quality):
    h, w = pixels.shape[:2]
    subprocess.run([args.ffmpeg, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', fmt, '-s', f'{w}x{h}', '-i', '-',
                    '-vf', f'scale={size}:{size}:flags=lanczos', '-c:v', 'libwebp', '-quality', str(quality),
                    '-pix_fmt', 'yuva420p' if fmt == 'rgba' else 'yuv420p', path],
                   input=np.ascontiguousarray(pixels).tobytes(), check=True)
    print('wrote', path)


def smooth(x, lo, hi):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- the cut-out
img = read(args.src).astype(np.float32)
band = max(4, img.shape[0] // 50)
border = np.concatenate([img[:band].reshape(-1, 3), img[-band:].reshape(-1, 3),
                         img[:, :band].reshape(-1, 3), img[:, -band:].reshape(-1, 3)])
bg = np.median(border, axis=0)
dist = np.linalg.norm(img - bg, axis=2)
LO, HI = 12.0, 42.0  # how far from the background colour (0-255) a pixel starts, then stops, being background
near = dist < HI
labels, count = ndimage.label(near)
edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
# ...and the pockets she closes in (between her neck and braids): big, and the background's colour
ids = np.arange(1, count + 1)
size = ndimage.sum(near, labels, ids)
mean = ndimage.mean(dist, labels, ids)
pockets = ids[(size > near.size * 0.0005) & (mean < LO * 1.5)]
outside = np.isin(labels, np.concatenate([edge[edge > 0], pockets]))
alpha = np.where(outside, smooth(dist, LO, HI), 1.0)
alpha[alpha < 0.02] = 0
# un-mix the background from the soft edges: c = a*fg + (1-a)*bg
fg = np.where(alpha[..., None] > 0.02, (img - (1 - alpha[..., None]) * bg) / np.maximum(alpha[..., None], 0.02), 0)
rgba = np.dstack([np.clip(fg, 0, 255), alpha * 255]).round().astype(np.uint8)
print('background', bg.round(), f'{outside.mean():.0%} cut away')

# ---------------------------------------------------------------- the depth
x = (read(args.src, 518).astype(np.float32) / 255 - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
sess = ort.InferenceSession(args.model, providers=['CPUExecutionProvider'])
depth = sess.run(None, {sess.get_inputs()[0].name: x.transpose(2, 0, 1)[None].astype(np.float32)})[0].squeeze()
# Around her (and in her flyaways, which the model reads as background), carry the depth of
# the nearest solid part of her outwards, so her outline turns with her hair instead of
# stretching towards the far-away background.
mask = ndimage.zoom(alpha, depth.shape[0] / alpha.shape[0], order=1) > 0.5
lo, hi = np.percentile(depth[mask], [1, 99.8])
depth = np.clip((depth - lo) / (hi - lo), 0, 1)
solid = mask & (depth > 0.3)
nearest = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
depth = depth[nearest[0], nearest[1]]
# Blurred enough that no point can pass another as she turns (cheek over ear would show
# the ear twice); the nose, cheeks and braids still stand out.
depth = ndimage.gaussian_filter(depth, 6)
outline = solid & ~ndimage.binary_erosion(solid, iterations=2)
outline[int(depth.shape[0] * 0.55):] = False
print(f'her outline is at depth {np.median(depth[outline]):.2f} (TURN.pivot in Hero.tsx)')

os.makedirs(OUT, exist_ok=True)
write(rgba, 'rgba', os.path.join(OUT, 'ama.webp'), 1400, 84)
write((np.clip(depth, 0, 1) * 255).astype(np.uint8), 'gray', os.path.join(OUT, 'ama-depth.webp'), 700, 90)
