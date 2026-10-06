# Colour

Two palettes work together. The **app palette** (every token from `bg` to `scrim`) is the product's, taken exactly from `src/shared/theme/themes.ts`. The **silk palette** (`silk-highlight`, `silk-rose`, `silk-mauve`, `silk-shadow`, `petal-smoke`, `glow`) is sampled from the logo and belongs to brand artwork only.

## How the colours relate

- Aubergine night (`bg` dark, #0b0709) is the ground the logo was born on. It carries a plum bias: never replace it with pure black.
- Petal (`accent` dark, #ff8fb8) is the light in the interface; Silk Rose (`silk-rose`, #efa6af) is the same light in the logo, dustier and softer. They are cousins on purpose: the app's pink is brighter so it reads as something to tap.
- In light mode the accent deepens to Berry (#b8336a) so it holds contrast on paper (`bg` light, #f7f2f4).
- Amber (`gold`) is the warm second light: money, stars, deposits. It doubles as `warning` by design.

## Proportions

On any screen: about 80% `bg` and glass, 15% text, no more than 5% `accent`. One primary action per screen. Brand moments (splash, social, the reveal) may let the silk pinks take a third of the frame; the interface never does.

## Contrast

Ratios are WCAG 2 on `bg`, with glass composited. Pairs that miss are kept exactly as the app has them and flagged here with a proposed fix.

| Pair | Dark | Light | Verdict |
| --- | --- | --- | --- |
| `text-primary` on `bg` | 18.0 | 16.9 | Pass |
| `text-secondary` on `bg` | 7.9 | 5.1 | Pass |
| `text-tertiary` on `bg` | 3.7 | 2.7 | Fails. Placeholders and overlines only. Fix: light alpha 0.56 |
| `accent` on `bg` | 9.4 | 5.1 | Pass |
| `text-on-accent` on `accent` | 9.0 | 5.7 | Pass |
| `accent` on `accent-soft` | 7.4 | 4.4 | Light fails by a hair: keep text 15px medium+ |
| `gold` on `bg` | 11.3 | 3.9 | Light: large text and icons only |
| `success` on `bg` | 11.1 | 3.7 | Light fails. Fix: #187550 (5.0:1) |
| `success` on `success-soft` | 8.9 | 3.3 | Light fails. Fix as above |
| `danger` on `bg` | 7.3 | 4.8 | Pass |
| `danger` on `danger-soft` | 6.2 | 4.3 | Light: keep text 15px+ |

Status is never colour alone: every badge and alert carries its word, and alerts carry an icon. Success (green) and danger (red-pink) also differ in lightness in both themes.

## Focus

Keyboard and switch focus is a 2px `accent` ring with a 2px `bg` gap, on every interactive element, in both themes (3:1 or better on every surface).
