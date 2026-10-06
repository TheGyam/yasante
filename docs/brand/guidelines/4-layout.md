# Layout

## The grid

- 4-point spacing (`space-xxs` to `space-giant`). The page gutter is `space-xl` (20) on phones.
- Cards pad by `space-lg` (16). Gaps between sections are `space-xxl` (24) to `space-xxxl` (32).
- Touch targets are at least `hit-target` (44). Small visuals get hit slop rather than growing.

## Surfaces

Three layers, from back to front:

1. **Ground**: `bg`, with optional brand glows (rose low-left, amber high-right) on hero and splash screens only.
2. **Glass**: cards and grouped lists. `glass-fill`, 1px `glass-border`, `glass-highlight` on the top edge, radius `radius-lg`. No drop shadows: borders and the lit edge do the separating.
3. **Chrome**: the floating tab bar (64 tall, `radius-xl`, inset from the screen edges), headers and sheets. Real blur on iOS (`chrome-tint`), `chrome-solid` elsewhere.

Scrims (`scrim`) sit between content and a sheet or dialog.

## Screen anatomy

- A large title at the top of scrolling screens (`Screen`), which hands over to a small header title as you scroll.
- Content in sections: an `overline` title, a glass group, an optional `footnote` footer.
- The tab bar floats above content; scroll content gets bottom padding so nothing hides behind it. It slides away on pushed screens and when the keyboard opens.
- One primary action per screen, full width at the bottom (`Button` lg) or in the header.
- Sheets for choices and short tasks, with a grab handle, top radius `radius-xl`, sized to their content.

## Radii

`radius-pill` for everything you tap (buttons, chips, badges, search, segmented control); `radius-md` for inputs, alerts and photo tiles; `radius-lg` for cards and sections; `radius-xl` for sheets and the tab bar; `radius-sm` for icon wells and skeletons. Photos in the looks grid use `radius-md`.
