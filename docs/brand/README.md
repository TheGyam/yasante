# Yasante logo

The mark is a lowercase **y** whose tail spirals into a coil: a letter at icon size and
a strand of textured hair when it's large. It replaces the straight geometric "y" on
the current app icon. The assets in `assets/` haven't been swapped yet.

## Construction

- Drawn in Instrument Sans Bold units (1000 UPM): x-height 510, baseline 0.
- Monoline stroke of 114 units, weighted by eye to sit next to Instrument Sans Bold letters.
- Both arms are cut flat at the x-height, matching the typeface's terminals.
- The right arm runs straight into the tail, then curls clockwise through five 45° arcs.
  The radius starts at 118 and tightens about 4% per arc (118 → 99). The only round end
  on the glyph sits inside the curl.
- In the wordmark the coil y replaces the font's y. The letters `asante` are Instrument
  Sans Bold outlines, kerned by HarfBuzz and converted to paths, so no font is needed to
  render them.

## Colour

All values come from `src/shared/theme/themes.ts`.

| Use | Dark | Light |
| --- | --- | --- |
| Ground | Aubergine Night `#0B0709` | Blush Paper `#F7F2F4` |
| The y | Petal `#FF8FB8` (9.4:1) | Berry `#B8336A` (5.1:1) |
| Letters | Shea `#F8F1F4` | Ink `#1B0E14` |
| Mark gradient | `#FFB1CD` → `#FF8FB8` → `#F4B860`, top to the tip of the curl | Not used on light grounds |

## Files

| File | Use |
| --- | --- |
| `yasante-icon.svg` | Rounded tile for the web and docs |
| `yasante-icon-square.svg`, `yasante-icon-1024.png` | Full-bleed square for Expo `icon` and the stores (the OS applies the mask) |
| `yasante-mark.svg` / `yasante-mark-512.png` | Gradient y on transparent, for dark grounds |
| `yasante-mark-mono.svg` | One colour, `currentColor` |
| `yasante-wordmark-on-light.svg` / `.png` | Ink letters with a Berry y |
| `yasante-wordmark-on-dark.svg` / `.png` | Shea letters with a Petal y |
| `yasante-wordmark-mono.svg` | One colour, `currentColor` |

## Usage

- Clear space: one stroke width (the thickness of the y) on every side.
- Smallest size: the icon works down to 29 px; keep the wordmark at least 72 px wide.
- Don't retype the wordmark, recolour the y gold, put the gradient on light grounds, or
  straighten the tail.
