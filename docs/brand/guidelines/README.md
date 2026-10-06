Yasante is where you find a look you love, book the person who can do it, and look after yourself in between. It starts with textured hair and is built to grow into beauty as a whole. The brand is a silk ribbon of pink light on an aubergine night: soft, lit from within, unhurried.

## The idea in one line

A ribbon that turns into a Y. One stroke twists from a petal into a stem, and a second petal opens beside it, so the mark reads as a letter, a flower and fabric in motion at once. Everything else in the system is the setting for that ribbon: a near-black ground, glass surfaces, one warm pink.

## Voice

Write like a stylist you trust talking across the chair: warm, direct, never salesy. These are real lines from the app; match them.

- Buttons say exactly what happens, in the person's words: "Request a booking", "Yes, I'm coming", "Keep my time", "Close it out", "Add it yourself".
- Titles name the situation plainly: "This look is gone", "Waiting on a deposit", "That's not what happened".
- Empty states tell you the next step: "Save a look from the feed and choose this collection."
- Onboarding earns attention honestly: "Two minutes, and everything here gets more useful".
- Errors are plain words, never codes. Say what went wrong and what to do; no apologies, no "Oops".
- Sentence case everywhere except overlines. British spelling and £. Curly apostrophes (’).
- "You" for the client, the stylist's own name or brand name for the stylist. The app never says "we" when it can say what it did.
- No emoji in the interface. No exclamation marks. Social captions may be looser (lowercase, one emoji), never in the product.

## Using this system

- Dark is the brand's home theme and the first theme here; light is a full equal. Build every screen in both.
- Ground every screen in `bg`. Put content on glass: `glass-fill` with a 1px `glass-border` and a `glass-highlight` top edge. Real blur only on chrome (tab bar, headers, sheets): `chrome-tint` over blur on iOS, `chrome-solid` elsewhere.
- One accent. `accent` (Petal in dark, Berry in light) marks the primary action and the current selection; text on an accent fill is `text-on-accent`, never literal white. Tints behind accent text are `accent-soft`.
- `gold` is for money, ratings and glow. Status colours always carry a word or icon too.
- The `silk-*` tokens, `petal-smoke` and `glow` belong to the logo and brand artwork only, never to UI text or controls.
- Type is Instrument Sans in four weights, set with the styles in Typography. Numbers that line up use `numeric` and tabular figures.
- Space on the 4-point scale; the page gutter is `space-xl` (20). Radii: `radius-pill` for anything you tap, `radius-lg` for cards, `radius-xl` for sheets and the tab bar.
- Motion uses the `duration-*` tokens and the three springs in Motion. Everything respects the system's reduce-motion setting.
- Icons are Lucide at stroke 2.2, sized 15–20 in controls and 28 in empty states, coloured with the text token of their context.

## Iconography

The app uses [Lucide](https://lucide.dev) (`lucide-react-native`) as its only icon set: outline icons, round caps, stroke width 2.2 in controls (3 inside the checkbox tick). Icons take the colour of the text they sit with (`text-primary`, `text-secondary`, `accent`, or a status colour), never `silk-*`. No emoji and no filled icon variants in the interface. The brand mark is never used as an icon inside the UI except as the app icon and the Home tab glyph.

## Not synced

Built from the repository at `claude/pensive-hypatia-y6rlae` (src/shared/theme, src/shared/ui, README.md) and the logo artwork supplied by the founder. The component previews are static HTML recreations of the React Native components, hand-written from their source files; the app's own components are the truth. Not carded: behaviour-only pieces (PressableScale, Rise, Motion kit, Screen, TabStack, DialogHost, RemoteImage, VideoPlayer, Text), and composite inputs (CodeInput, DateTimeField, MonthCalendar, ExpandableText, ListFooter, PhotoSourceSheet). The logo's vector files are traces of the supplied raster artwork; the raster master stays the reference for the rendered icon. Instrument Sans loads from Google Fonts; no font files are stored here.
