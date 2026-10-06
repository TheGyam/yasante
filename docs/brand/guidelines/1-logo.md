# Logo

## The mark

A single ribbon turns from a petal into a stem, and a second petal opens beside it: a Y that is also a flower and a fold of silk. The left stroke carries the light, the right petal sits in shadow (`petal-smoke`), and the twist in the stem is where the light catches brightest (`silk-highlight`).

| File | Use it for |
| --- | --- |
| `yasante-app-icon-master.jpg` | THE reference. The rendered icon with its frosted grain and glow. App stores, splash, social, presentations. |
| `yasante-app-icon-flat.svg` | The icon as a vector, rounded tile with the glow edge. Web, docs, anywhere a raster would blur. |
| `yasante-app-icon-flat-square.svg` | Full-bleed square for Expo `icon` and the stores, which apply their own mask. |
| `yasante-mark-silk.svg` | The mark alone, shaded, on `bg` dark or any dark photo. |
| `yasante-mark-rose.svg` | Two flat pinks, for small sizes on dark and for embroidery, foil and print. |
| `yasante-mark-ink.svg` | One ink (`text-primary` light, `#1b0e14`), for light grounds, stamps and single-colour print. |
| `yasante-wordmark-silk.svg` / `-ink.svg` | The name alone: silk on dark, ink on light. |
| `yasante-lockup-horizontal-dark.svg` / `-light.svg` | Mark beside name: headers, email, documents. |
| `yasante-lockup-stacked-dark.svg` | Mark above name: splash, social profile, signage, the end card of the reveal. |

## Clear space and size

- Keep clear space equal to the width of the stem on every side of the mark (about a fifth of the mark's width). Nothing enters it: no text, no edge of a photo, no other logo.
- In a lockup, the gap between mark and name is the stem's width as well; the name's cap height is a third of the mark's height (horizontal) or a quarter (stacked).
- Smallest sizes: the app icon at 29px; the mark alone at 16px (use `yasante-mark-rose.svg` below 32px, the silk shading muddies); the horizontal lockup at 120px wide.

## Colourways

- On `bg` dark and dark photography: the silk mark, or rose below 32px.
- On `bg` light: the ink mark, with the name in `text-primary`.
- On `accent` or any saturated colour: the ink mark only.
- Never place the silk mark on light grounds: its pinks wash out.

## Don't

- Don't redraw, re-trace or straighten the ribbon. Use the files.
- Don't recolour the mark in `accent`, `gold` or status colours; its pinks are the `silk-*` tokens.
- Don't add outlines, drop shadows or bevels. The only light around the mark is `shadow-icon-glow`, on dark grounds, at the sizes in Imagery.
- Don't rotate, flip, stretch, or crop the petals.
- Don't put the mark inside another shape other than the app-icon tile.
- Don't set the name in another typeface, all caps, or with the old lowercase "yasante" wordmark.

## The app icon

A dark tile (`bg`), corner radius `radius-icon` (22.5%), the mark centred and filling about three quarters of the tile's width, a soft `glow` at the centre and a hairline glow edge. On iOS and Android supply the full-bleed square; the OS rounds it.

The app still ships the previous icon: `assets/icon.png` and the `AppIcon` / `BrandMark` components in `src/shared/ui/BrandMark.tsx` draw the old straight "y". Replace them with these files when the new identity launches.
