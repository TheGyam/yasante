# The home page's hero pictures

**Ama** (the girl who turns to follow the cursor) is a painting made with Gemini's image
model, cut out of its flat background and given a depth map; the page bends the painting
with the depth map to turn her head (`src/features/home/turn.ts`, steered by `gaze.ts`).
To paint her again, from the repo root (the key is `GEMINI_API_KEY` in `.env.development`):

```bash
python web/scripts/hero/paint.py /tmp/ama.png "<prompt>"
python web/scripts/hero/ama.py /tmp/ama.png --model depth-anything-v2-small.onnx --ffmpeg ffmpeg
```

Then clean the old background out of the flyaways around her braids, which `ama.py` keeps
where her curls close it in:

```bash
python web/scripts/hero/fringe.py
```

The prompt she was painted from is in `ama-prompt.txt`. Paint her on one flat background
colour, head and braids clear of the edges, so `ama.py` can cut her out. The depth model
is [Depth Anything V2 Small](https://huggingface.co/onnx-community/depth-anything-v2-small)
(`onnx/model.onnx`, Apache-2.0). If she's repainted, check `TURN` in
`components/Hero.tsx`: where her chin and collar fall in the picture.

The three card objects are rendered offline in Blender from code. To change them, edit
the scripts and run, with Blender 4.5:

```bash
blender -b -P web/scripts/hero/props.py -- --out /tmp/hero
python web/scripts/hero/encode.py /tmp/hero
```

`props.py` writes `prop-coil.png`, `prop-pick.png` and `prop-jar.png`; `encode.py` makes
the 480px WebPs.

The film (`media/film/`) is the launch film's music-and-captions cut, made from
`output/yasante-launch` with `audio/mix.py --no-voice`. Swap it for the voiced cut once the
voice is licensed.

Credits for the avatar photos are in [CREDITS.md](CREDITS.md).
