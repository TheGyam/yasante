"""
Rendered card objects -> the WebPs the home page loads.

  python web/scripts/hero/encode.py <render dir> [--ffmpeg path/to/ffmpeg]

prop-X.png -> media/props/X.webp (480px)
"""
import argparse
import glob
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
MEDIA = os.path.join(HERE, '../../src/features/home/media')

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('--ffmpeg', default='ffmpeg')
args = ap.parse_args()


def webp(src, dst, size, quality):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    subprocess.run([args.ffmpeg, '-y', '-loglevel', 'error', '-i', src, '-vf', f'scale={size}:{size}:flags=lanczos',
                    '-c:v', 'libwebp', '-quality', str(quality), '-pix_fmt', 'yuva420p', dst], check=True)


for f in glob.glob(os.path.join(args.src, 'prop-*.png')):
    name = os.path.splitext(os.path.basename(f))[0][5:]
    webp(f, os.path.join(MEDIA, 'props', name + '.webp'), 480, 82)
print('encoded')
