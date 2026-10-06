# Typography

One family: **Instrument Sans**, in Regular 400, Medium 500, SemiBold 600 and Bold 700, loaded in the app from `@expo-google-fonts/instrument-sans` and on the web from `@fontsource/instrument-sans`.

## The scale

Use only the named styles (`display` to `overline`, plus `numeric`); never set a size by hand. Large sizes are tracked tight, small caps open: that contrast is the house style.

- `display` once per screen at most. `title1` for large screen titles, `title2` for sheets and cards, `title3` for section headers and empty states.
- `body` for reading and inputs; `bodyStrong` for row titles and emphasis.
- `callout` for chips, section actions and medium buttons; buttons themselves are SemiBold 14–16.
- `subhead` for supporting copy and alerts, `footnote` for fine print, `caption` for badges and tab labels.
- `overline` is always uppercase and `text-tertiary`, above a glass group.
- `numeric` for prices and totals, always with tabular figures so columns line up.

## Rules

- On Android every weight is its own family: name the family per weight, never set `fontWeight` (the app's `fonts` object does this).
- Text grows with the system's accessibility size up to 1.6×; controls use minimum heights so they grow instead of clipping.
- Keep reading lines near 60–70 characters on web and tablet.
- The name in the logo is Instrument Sans Regular, tracked +2%. Use the wordmark files; set it live (style `wordmark`) only on splash and web heroes.

## Pairing for brand moments

Marketing and social may add a display serif for a few words at a time, never inside the app. Use Instrument Serif Italic, from the same type family, at 28px or larger.
