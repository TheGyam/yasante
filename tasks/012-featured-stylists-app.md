---
id: 012
slug: featured-stylists-app
assignee: codex # codex | gemini | sonnet | haiku | opus
status: ready # draft | ready | in-progress | review | blocked | done
branch: agent/codex/012-featured-stylists-app
depends_on: [009]
---

# App: featured pages, their waitlist, making a page yours, and Finish your page

## Why

The same experience as the website (task 011), in the Expo app, for when the
apps are in the stores: clients find featured stylists and join their
waitlist, and a stylist who opens her link with the app installed makes the
page hers without leaving the app.

**Read `tasks/featured-stylists.md` in full before starting.** It is part of
this brief, including the exact words in its "Words we use" table: use them
as written. Then read task 009 (`tasks/009-featured-stylists-backend.md`),
steps 4, 6, 7 and 11, for the endpoints and fields you build on, and task 011
(`tasks/011-featured-stylists-web.md`), steps 1 to 5: the app does the same
things, with the same words, in the app's own components. Do not change the
server or the website; if something you need is missing, set `status: blocked`
and say what.

## Scope

Files this task may change:

- `app/stylist/[handle].tsx`, `app/claim/[code].tsx` (new), `app/finish.tsx` (new), `app/_layout.tsx` (register the two new screens only)
- `src/features/stylist/` (components, `api.ts`, `hooks.ts`, `types.ts`, `index.ts`)
- `src/features/looks/` (`LookCard.tsx`, `LookTile.tsx`, `api.ts`, `hooks.ts`, `index.ts`, types: the Featured label and the look tag edit only)
- `src/features/claim/` (new feature)
- `app/(stylist)/(today)/today.tsx` (the Finish your page card only), `app/(stylist)/(portfolio)/portfolio.tsx` (the tag edit only)
- `src/features/auth/accountGate.ts` (add `finish` and `claim` paths to the right lists only)
- `src/shared/lib/links.ts` (add `claim` and `finish` to `NOT_HANDLES`, and map `/claim/:code` and `/finish` in `routeForLink`)
- `src/api.ts` (wiring only), tests under the existing `__tests__` folders
- `tasks/012-featured-stylists-app.md` (`status` and the report only)

Out of scope (do not touch): `backend/`, `web/`, `src/mocks` (the new
endpoints go to the real API; don't add mocks), the existing slot waitlist
screen (`app/waitlist/[handle].tsx`), EAS builds (never start one).

## What to do

Follow `ARCHITECTURE.md` exactly: thin routes in `app/`, logic in
`src/features/<name>/`, imported through `index.ts`; every screen a
`<Screen>`; styles from `makeStyles`; type through `<Text variant>`; images
through `RemoteImage`; motion on the UI thread with Reanimated, reduced motion
respected; haptics through `shared/lib/haptics`, one per action, always with a
visual change; press feedback with `PressableScale`.

1. **A featured stylist's page** (`app/stylist/[handle].tsx`), when
   `profile.featured`: the same differences as task 011 step 1. **Featured**
   label and "Not taking bookings on Yasante yet" under her name; no prices,
   booking, reviews or "Tell me if a slot opens"; **Book on Instagram** opens
   her profile with `Linking.openURL` (the Instagram app if installed);
   **Join the waitlist** toggles at once with a light haptic and the tick,
   rolls back with the server's message on failure, and signed out goes
   through the existing account gate and joins on return. When `claimable`,
   the "Is this you?" line at the bottom opens the plan's note in place.

2. **Looks.** `LookCard` and `LookTile`: when `stylistFeatured`, show
   **Featured** where the price would be and no booking action.

3. **Her link** (`app/claim/[code].tsx`, logic in `src/features/claim/`).
   The same states and words as task 011 step 3. After **Make it yours**
   succeeds: update the signed-in user from the response, switch to stylist
   mode the way `app/invite/[code].tsx` does after redeeming an invite (copy
   its pattern, including its success motion), then open `/finish`.
   `yasante.com/claim/...` links must open this screen when the app is
   installed (`routeForLink`).

4. **Finish your page** (`app/finish.tsx`). The same checklist as task 011
   step 4: price each style (reuse the menu's price and time inputs), set
   hours (the existing `availability` screen), check tags. For the tags step,
   add a styles and hair type edit to her own looks in the smallest way that
   fits the portfolio screen, sending `PATCH /api/looks/:id/`, and a **These
   look right** button.

5. **Today** (`today.tsx`): the "Finish your page · 1 of 3 done" card at the
   top until done.

6. **Speed and quality.** Lists stay virtualised. The waitlist toggle patches
   the page's query cache instead of re-reading the page. Nothing re-renders
   while a finger is down. Every new control is at least 44 by 44 points and
   has an accessibility label; the waiting count and the checklist progress
   are read out by screen readers.

## Acceptance criteria

- [ ] A featured page shows Featured, Book on Instagram and Join the waitlist, and no prices, booking or reviews (test).
- [ ] Join the waitlist toggles at once, rolls back on an error, and signed out joins after signing in (tests).
- [ ] A look by a featured stylist shows Featured and no booking action (test).
- [ ] The claim screen's states match task 011 (waiting count singular and plural, signed out, used or expired) (tests).
- [ ] Make it yours switches to stylist mode and opens Finish your page (test).
- [ ] `routeForLink` opens `/claim/:code` and `/finish`; `claim` and `finish` are in `NOT_HANDLES` (test).
- [ ] The checklist prices a style, counts progress and shows the final message (tests).
- [ ] Every word on these screens matches the plan's table.
- [ ] No new dependencies, no mocks added, no EAS build started.

## Checks

From the repo root:

```
npm ci
npx tsc --noEmit
npm run lint
npx jest --ci
npm run api:types && git diff --exit-code src/shared/lib/api/schema.d.ts
```

## Report to the lead

_Filled in by the assignee when it sets `status: review` or `blocked`._

- **Changed:**
- **Checks run:** (each command and its result; "not run" if you didn't)
- **Unsure about:**
- **Skipped, and why:**
- **Question for the lead:** (only if `blocked`)
