# Motion

Motion in Yasante moves like the ribbon: it eases out, settles without bouncing, and never makes anyone wait.

## Timing

Two curves, from `src/shared/theme/motion.ts`:

- **Ease out** `cubic-bezier(0.23, 1, 0.32, 1)` for anything arriving, leaving or pressed: `duration-press-in` (120ms), `duration-press-out` (180ms), `duration-state` (180ms), `duration-enter` (250ms).
- **Ease in-out** `cubic-bezier(0.77, 0, 0.175, 1)` for something travelling across the screen: `duration-move` (250ms).

Three springs for anything a finger started:

| Spring | Duration | Damping | Use |
| --- | --- | --- | --- |
| settle | 400ms | 1.0 | Coming to rest with no overshoot: the tab icon's lift, cards returning. |
| snap | 400ms | 0.8 | A small, confident overshoot: the tab bar's active pill gliding between tabs. |
| sheet | 300ms | 0.8 | Sheets and drags, carrying the speed of a flick. |

## Rules

- Press feedback starts on press-in and scales buttons and cards to 0.97 (large surfaces nearer 1). List rows highlight instead of scaling.
- Only transform and opacity move. Nothing animates layout.
- Things arrive with `Rise`: up a few pixels and in, each a beat after the last, all together after a handful.
- Selection ticks with a light haptic; destructive actions don't animate playfully.
- Reduce motion on: movement drops, the acknowledgement stays (an opacity change instead of a scale).

## The logo reveal

The storyboard in `assets/Motion/yasante-logo-reveal-storyboard.jpg` is the brand's signature animation, about seven seconds:

1. 0–1s: a single ribbon of pink light moves across the dark.
2. 1–2s: two ribbons sweep together.
3. 2–3s: they settle into the Y.
4. 3–4s: the mark sharpens on `bg`.
5. 4–5s: the tile draws around it and the glow edge lights.
6. 5–6s: the icon rests, with a soft reflection.
7. 6–7s: the name rises in under it (`Rise` timing), and holds.

Use it for the app's first launch, store previews and social. Every move uses the ease-out curve; nothing bounces.
