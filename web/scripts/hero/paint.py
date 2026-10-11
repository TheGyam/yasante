"""
Paint Ama with Gemini's image model (the key is GEMINI_API_KEY in .env.development).

  python web/scripts/hero/paint.py <out.png> [--edit <source.png>] [--model gemini-3-pro-image] "<prompt>"

Without --edit it paints from the prompt; with --edit it changes the given image as told.
"""
import argparse, base64, json, os, sys, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('out')
ap.add_argument('prompt')
ap.add_argument('--edit')
ap.add_argument('--model', default='gemini-3-pro-image')
ap.add_argument('--size', default='2K')
args = ap.parse_args()

env = os.path.join(ROOT, '../../../.env.development')
key = next(l.split('=', 1)[1].strip().strip('"') for l in open(env) if l.startswith('GEMINI_API_KEY='))
parts = [{'text': args.prompt}]
if args.edit:
    parts.insert(0, {'inline_data': {'mime_type': 'image/png', 'data': base64.b64encode(open(args.edit, 'rb').read()).decode()}})
body = {
    'contents': [{'parts': parts}],
    'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': '1:1', 'imageSize': args.size}},
}
req = urllib.request.Request(
    f'https://generativelanguage.googleapis.com/v1beta/models/{args.model}:generateContent',
    data=json.dumps(body).encode(), headers={'x-goog-api-key': key, 'Content-Type': 'application/json'})
try:
    res = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    sys.exit(f'{e.code}: {e.read().decode()[:600]}')
for cand in res.get('candidates', []):
    for part in cand.get('content', {}).get('parts', []):
        data = part.get('inlineData') or part.get('inline_data')
        if data:
            open(args.out, 'wb').write(base64.b64decode(data['data']))
            print('wrote', args.out)
            sys.exit()
sys.exit('no image: ' + json.dumps(res)[:600])
