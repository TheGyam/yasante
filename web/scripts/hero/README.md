# The home page's hero pictures

Bobbi (the bust in the bob that follows the cursor) and the three card objects are
rendered offline in Blender from code; the page only scrubs the frames
(`src/features/home/gaze.ts`). To change them, edit the scripts and run, from the repo root,
with Blender 4.5:

```bash
blender -b -P web/scripts/hero/scene.py -- --out /tmp/hero --size 1200 --samples 96
blender -b -P web/scripts/hero/props.py -- --out /tmp/hero
```

`scene.py` writes `bob-00.png` … `bob-60.png` (60° left to 60° right, 2° apart, about a
minute each on a small NVIDIA GPU); `props.py` writes `prop-coil.png`, `prop-pick.png` and
`prop-jar.png`. Then encode them into the feature (WebP with alpha, 1200px and 640px
frames, 480px props):

```bash
python web/scripts/hero/encode.py /tmp/hero
```

The film (`media/film/`) is the launch film's music-and-captions cut, made from
`output/yasante-launch` with `audio/mix.py --no-voice`. Swap it for the voiced cut once the
voice is licensed.

Credits for the avatar photos are in [CREDITS.md](CREDITS.md).
