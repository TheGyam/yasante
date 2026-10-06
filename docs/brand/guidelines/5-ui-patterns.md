# UI patterns

How the product's main jobs are built from the components. Each pattern is in the app today; keep new screens to them.

## Looks feed

A two-column photo grid with almost no chrome: the photo is the content. Filter chips (`Chip`) scroll horizontally above it, the selected one in `accent-soft` with an `accent` border. Saving is one tap on a glass `IconButton` over the photo (`overlay` variant). Opening a look grows the photo out of the grid into its own page.

## Booking

A sheet or screen that reads top to bottom: the look's photo, the service and price (`title2` and `numeric`), size and options as choices, then the stylist's free times as chips (`SlotPicker`). The selected time is an accent chip. One full-width primary `Button` states the action and the money: "Request a booking". The request then moves through badges: asked, accepted, confirmed, done (`Badge` neutral, accent, success).

## Planner and care plans

Collections show stacks of their newest photos. Care plans pair a consistency ring and a 14-day strip with a `ProgressBar` (accent, or gold for streaks). Marking today done flips the card.

## Profile and settings

Grouped `Section`s of `ListRow`s with icon wells, chevrons or `Toggle`s, an `overline` above each group and a `footnote` under it where a choice needs explaining.

## Stylist page

A cover photo, the brand name in `title1`, a `StarRating` and review count, then the menu, portfolio, hours and policies. The booking button stays in reach at the bottom.

## Forms

Floating-label `Input`s (the label sits inside and floats on focus), `InlineAlert` under the field for errors in plain words, a `Checkbox` for consent, and one primary button. Errors shake the field gently and announce politely to screen readers.

## Empty and loading

Every list has an `EmptyState`: an accent icon in a soft well that bobs slowly, a `title3` that names the situation, a `subhead` with the next step, and at most one button. Loading uses breathing `Skeleton`s in the shape of the content, never a spinner on a blank screen.
