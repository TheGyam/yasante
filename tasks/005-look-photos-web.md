---
id: 005
slug: look-photos-web
assignee: gemini # codex | gemini | sonnet | haiku | opus
status: ready # draft | ready | in-progress | review | blocked | done
branch: agent/gemini/005-look-photos-web
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

_Filled in by the assignee when it sets `status: review` or `blocked`._

- **Changed:**
- **Checks run:** (each command and its result; "not run" if you didn't)
- **Unsure about:**
- **Skipped, and why:**
- **Question for the lead:** (only if `blocked`)
