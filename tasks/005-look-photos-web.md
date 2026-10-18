---
id: 005
slug: look-photos-web
assignee: sonnet # codex | gemini | sonnet | haiku | opus
status: review # draft | ready | in-progress | review | blocked | done
branch: agent/sonnet/005-look-photos-web
depends_on: [003]
---

# Website: swipe through a look's photos, and show moderators all of them

## Why

Looks can now hold up to 5 photos (task 003 added `photos` to every look in
the API). The website should let people swipe or click through them, show
which looks have several, and show moderators every photo of a reported look.

## Scope

Files this task may change:

- `web/src/features/looks/components/LookScreen.tsx` and `LookScreen.css.ts`
- `web/src/features/looks/components/LookPhotos.tsx` and `LookPhotos.css.ts` (new)
- `web/src/features/looks/components/LookCard.tsx` and its `.css.ts`
- `web/src/features/staff/components/review/ReviewDetail.tsx` and `ReviewDetail.css.ts`
- `web/src/test/__tests__/site.test.tsx` and `web/src/test/__tests__/staff.test.tsx` (new tests only)
- `tasks/005-look-photos-web.md` (`status` and the report only)

Out of scope (do not touch): `PostWorkScreen.tsx` and the posting hooks (the
website keeps posting one photo per look for now), the backend, the app,
`web/src/shared/lib/api/schema.d.ts`, and the colours or theme.

## What to do

1. **`LookPhotos.tsx` (new).** Props: `photos` (the look's `photos`), `alt`,
   `aspect`, `sizes`. For one photo, render exactly what `LookScreen` renders
   today (a single `RemoteImage` with `priority`). For several:
   - A horizontal row using CSS scroll snap (`overflow-x: auto`,
     `scroll-snap-type: x mandatory`, each slide `scroll-snap-align: center`,
     `flex: 0 0 100%`), hidden scrollbar, so touch swiping works with no
     JavaScript.
   - Every slide uses the **first photo's** aspect, with the image covering it.
   - Only the first image has `priority`; the rest load lazily.
   - Previous and next buttons on either side (hidden on touch-only screens
     with `@media (hover: hover)`), dots under the photo, and a "2 / 5" label.
     Track the current slide with an `IntersectionObserver`, not scroll events.
   - Left and right arrow keys move between photos when the row has focus.
   - Each slide's alt text is `"<alt>, photo 2 of 5"`. The row has
     `role="region"` and `aria-label="Photos"`; buttons have labels
     ("Previous photo", "Next photo").
   - Respect `prefers-reduced-motion` (no smooth scrolling).
   - Follow the `vanilla-extract` style of the files next to it, using theme
     tokens only (no new colours).
2. **`LookScreen.tsx`.** Replace the single `RemoteImage` with `LookPhotos`,
   passing `look.photos` (or, when it is missing or empty, one photo built from
   `photoUri`/`feedUri`). Prefer `feedUri` for each slide, as now.
3. **`LookCard.tsx`.** Cards still show only the cover. When the look has more
   than one photo, show a small stacked-photos icon (from `lucide-react`, as
   used elsewhere in `web/src`) in the top-right corner, with
   `aria-label="Several photos"`.
4. **`ReviewDetail.tsx`.** When a preview has more than two images, lay them
   out in a grid of up to 3 columns so a moderator sees all of them at once.
   Keep the current one- and two-image layouts.
5. **Tests.** In `site.test.tsx`: a look with 3 photos renders 3 slides, the
   label "1 / 5"-style counter, and working next/previous buttons; a look with
   one photo renders no buttons or dots. In `staff.test.tsx`: a report preview
   with 5 images renders all 5.

## Acceptance criteria

- [ ] A one-photo look page looks exactly as before.
- [ ] A 3-photo look page swipes on touch, has arrows and dots on desktop, and keyboard arrows move between photos.
- [ ] Only the first photo loads eagerly; the others have `loading="lazy"`.
- [ ] Multi-photo cards show the stacked icon; one-photo cards don't.
- [ ] A moderator's report preview shows every photo of a reported look.
- [ ] No files outside **Scope** are changed (`git diff --name-only origin/master`).
- [ ] New behaviour is covered by the tests named above.

## Checks

Run these exactly as written, from `web/`:

```
npm ci && npx tsc --noEmit && npm run lint && npm test && npx vite build
```

Then, from the repo root:

```
git diff --name-only origin/master
```

## Report to the lead

- **Changed:**
  - Added `LookPhotos.tsx` / `LookPhotos.css.ts`: one photo renders exactly the old
    single `RemoteImage`; several render a CSS scroll-snap row (hidden scrollbar,
    `scroll-snap-type: x mandatory`, each slide `flex: 0 0 100%` / `scroll-snap-align:
    center`), with previous/next buttons (shown only under `(hover: hover)`), dots, a
    "n / total" counter, left/right arrow-key support on the focused row, and the
    current slide tracked with an `IntersectionObserver` (guarded for environments
    without one, e.g. jsdom). Only the first slide gets `priority`; the rest lazy-load.
    `prefers-reduced-motion` turns off smooth scrolling via CSS. Colours reuse
    `vars.color.scrim` and the same literal white/`rgba(12,6,9,…)` the sibling
    `LookCard` shade already uses — no new colours.
  - `LookScreen.tsx`: replaced the single `RemoteImage` with `LookPhotos`, passing
    `look.photos`, or (when empty) a single synthetic photo built from
    `photoUri`/`thumbUri`/`feedUri`/`photoAspect`, exactly as before.
  - `LookCard.tsx` / `.css.ts`: a small stacked-photos icon (`Images` from
    `lucide-react`, `aria-label="Several photos"`) in the top-right corner when
    `look.photos.length > 1`.
  - `ReviewDetail.tsx` / `.css.ts`: added a `data-grid` flag for more than two images,
    giving a 3-column grid; the one- and two-image layouts are untouched.
  - Tests: `site.test.tsx` adds a 3-photo look test (counter, region, 3 `img`s, working
    next/previous buttons) and a 1-photo look test (no region, no buttons).
    `staff.test.tsx` adds a report-preview test with 5 images, asserting all 5 render
    inside the detail `<article>`.
- **Checks run** (all from `web/`, then the repo-root diff check):
  - `npm ci` — passed.
  - `npx tsc --noEmit` — passed, no errors.
  - `npm run lint` — passed, no warnings or errors.
  - `npm test` — passed, 16 files / 74 tests.
  - `npx vite build` — passed (built to `../backend/apps/web/static/site`, not
    committed/tracked).
  - `git diff --name-only origin/master` (from the repo root) — only the files listed
    above, plus the new `LookPhotos.*` files and this task file; nothing outside scope.
- **Unsure about:** jsdom has no `Element.prototype.scrollIntoView`, so the
  prev/next/dot handlers call it as `?.scrollIntoView?.(...)` (optional on the method
  too, not just the ref) so clicking still updates state under test; this is purely a
  jsdom gap, real browsers always have the method.
- **Skipped, and why:** did not disable the previous/next buttons at the first/last
  slide — the task didn't ask for it, and `goTo` already clamps the index, so clicking
  past either end is a harmless no-op. Did not add a dedicated `LookCard` test for the
  stacked icon; the task's test list only named the `site.test.tsx` and
  `staff.test.tsx` cases above, and the condition is a one-line, trivial boolean.
