---
id: 011
slug: featured-stylists-web
assignee: codex # codex | gemini | sonnet | haiku | opus
status: review # draft | ready | in-progress | review | blocked | done
branch: agent/codex/011-featured-stylists-web
depends_on: [009]
---

# Website: featured pages, their waitlist, making a page yours, and Finish your page

## Why

The apps aren't in the stores yet, so the website is where clients first see
featured stylists and where a stylist lands when she taps her link on her
phone. Claiming has to feel effortless here, on a phone-sized screen.

**Read `tasks/featured-stylists.md` in full before starting.** It is part of
this brief, including the exact words in its "Words we use" table: use them
as written. Then read task 009 (`tasks/009-featured-stylists-backend.md`),
steps 4, 6, 7 and 11, for the endpoints and fields you build on. Do not change
the server; if something you need is missing, set `status: blocked` and say
what.

## Scope

Files this task may change:

- `web/src/features/stylist/` (`StylistScreen.tsx` and its `.css.ts`, new components, `api.ts`, `hooks.ts`, `types.ts`, `index.ts`)
- `web/src/features/looks/components/LookCard.tsx`, `YourWorkScreen.tsx` and their `.css.ts` files, and `web/src/features/looks/` `api.ts`, `hooks.ts`, `index.ts` (the look tag edit only)
- `web/src/features/studio/components/TodayScreen.tsx` (the Finish your page card only)
- `web/src/features/claim/` (new feature: the claim screen and Finish your page)
- `web/src/routes/index.tsx` (two new routes), `web/src/routes/claim.tsx`, `web/src/routes/finish.tsx` (new)
- `web/src/test/__tests__/featured.test.tsx` (new)
- `tasks/011-featured-stylists-web.md` (`status` and the report only)

Out of scope (do not touch): `backend/`, the staff site (`features/staff`,
`staff/`), the app, the existing launch waitlist (`features/waitlist`).

## What to do

Follow `ARCHITECTURE.md` ("The website"): thin routes, features imported
through their `index.ts`, styles in `.css.ts` from the shared tokens, types
from the generated `schema.d.ts`.

1. **A featured stylist's page** (`StylistScreen.tsx`), when
   `profile.featured` is true. Everything else on the page stays as it is
   (photos, looks that swipe, styles). The differences:
   - A **Featured** label beside her name, and under it "Not taking bookings
     on Yasante yet".
   - No prices, no booking buttons, no reviews section, no "Tell me if a slot
     opens". Don't show empty sections for what isn't there.
   - **Book on Instagram**: opens `https://www.instagram.com/{instagram_handle}/`
     in a new tab, `rel="noopener noreferrer"`.
   - **Join the waitlist**, with "We'll let you know when {name} takes
     bookings." under it. Signed in: it toggles at once (optimistic, rolled
     back with the server's message if the request fails) between **Join the
     waitlist** and **On the waitlist** with a tick. Signed out: it reads
     "Sign in to join the waitlist" and goes to sign-in with `?next=` back to
     this page, and after signing in the join happens without a second tap.
   - When `claimable`: at the very bottom, "Is this you? Make this page
     yours." Tapping it shows the footer note from the plan in place (no new
     page), with `@yasantebeauty` linking to Yasante's Instagram (`https://www.instagram.com/yasantebeauty/`, as in the site footer).
   - Use the same layout on a phone and a desktop as the rest of the page; the
     two buttons sit together where the booking button would be.

2. **Looks.** On `LookCard` (and anywhere else a look shows its price or
   booking link), when `stylistFeatured` is true show **Featured** where the
   price would be, and no booking link.

3. **Her link** (`/claim/:code`, new route and `features/claim`).
   - Reads `GET /api/featured/claim/:code/`. On 410, show the plan's "link
     used or expired" words with a link to Yasante's Instagram. Nothing else.
   - Otherwise: her photo, "This is your page, {name}", a small preview strip
     of her looks (the first few photos), and, only if `waiting > 0`,
     "{waiting} people are waiting to book you" ("1 person is waiting to book
     you" for one). If the page isn't live yet, add "Your page isn't public
     yet. This is how it will look."
   - Signed out: "Sign up or sign in, then this page is yours." with **Sign
     up** first and **Sign in** second, both with `?next=/claim/:code`, so
     she comes straight back. Signing up from here creates a normal account
     (not a client-only one).
   - Signed in: **Make it yours** (`POST`). While it runs the button shows
     progress and can't be pressed twice. On success, update the signed-in
     user from the response, then go to `/finish` with "It's yours. Next, add
     your prices." On 409, show the server's message; when it's about
     confirming her email, add a button that starts the existing email
     confirmation and brings her back here.
   - The page must not be indexed and must not leak the code (the server
     sends the headers; also make sure no external link, image or script on
     this page loads with the code in the URL).

4. **Finish your page** (`/finish`, signed-in stylists only, using the
   existing account guard). Reads `GET /api/stylists/me/finish/`. A short
   checklist with progress ("2 of 3 done"):
   - **Price your styles.** One card per style, biggest first: "{count} of
     your photos are {style}. What do you charge?" with a price field, a
     "From" switch (the price is a starting price), and an optional length of
     time. Saving posts to `finish/price/` and ticks the card off. Use the
     same price and time inputs as the menu's service screen
     (`ServiceScreen.tsx`).
   - **Set your hours.** A link to the existing hours screen, ticked when
     `hours_set`.
   - **Check your tags.** "We tagged your photos for you. Fix any we got
     wrong." Opens her work (`/portfolio`), where each look's styles and hair
     type can be changed through `PATCH /api/looks/:id/`. Add that edit there
     in the smallest way that fits the existing screen, and a **These look
     right** button that posts `finish/tags-checked/`.
   - When `done`: "You're taking bookings. Everyone on your waitlist has been
     told." and a button to her page.

5. **Today** (`TodayScreen.tsx`): while `/finish` isn't done, a card at the
   top, "Finish your page · 1 of 3 done", that opens it. Gone once done. One
   extra request at most, cached.

6. **Speed and quality.** Lazy-load the claim and finish routes. No layout
   shift when the waitlist state loads (reserve the button's space). Every
   new screen works at phone width with no horizontal scroll, works with the
   keyboard alone, and has visible focus and proper labels.

## Acceptance criteria

- [ ] A featured page shows Featured, Book on Instagram and Join the waitlist, and no prices, booking or reviews (test).
- [ ] Join the waitlist toggles at once, rolls back on an error, and signed out goes to sign-in and joins on return (tests).
- [ ] "Is this you?" appears only when `claimable`, and opens the note in place (test).
- [ ] A look by a featured stylist shows Featured and no booking link (test).
- [ ] The claim screen shows the waiting count only when more than 0, with the right singular and plural (test).
- [ ] Signed out, both buttons bring her back to `/claim/:code`; signed in, Make it yours claims once and lands on `/finish` (tests).
- [ ] A used or expired link shows only the plan's words (test).
- [ ] Pricing a style ticks it off; the checklist counts progress; done shows the final message (tests).
- [ ] Today shows the Finish your page card until done (test).
- [ ] Every word on these screens matches the plan's table.
- [ ] No new dependencies.

## Checks

From `web/`:

```
npm ci && npx tsc --noEmit && npm run lint && npm test && npx vite build
```

## Report to the lead

- **Changed:** Built first by Gemini, then reviewed and finished by the lead (the
  review is on the pull request). The lead's round fixed: the robots tag (`Page.tsx`
  now sets `noindex` only for a page that needs it and puts the server's tag back),
  Yasante's Instagram (@yasantebeauty) on the stylist page note and the used-link
  screen, waitlist taps no longer re-reading her page (each read counted as a visit),
  signed-in visitors read the page once more instead of being sent to sign in, the
  signed-out label ("Sign in to join the waitlist"), her @handle kept under her name,
  one Featured label per feed card with the area kept, the Today card ("1 of 3 done",
  Continue) with its styles in `.css.ts`, "1 of your photos is…", style names on each
  tile while tags are being checked, clearing a look's hair type, no address line on a
  featured page, the claim screen's photo strip, Prettier on every changed file, and
  the brief put back as written.
- **Outside the listed scope, and why:** `shared/ui/Page.tsx` (the noindex prop),
  `shared/ui/Button.tsx` (`target` and `rel` on links), `shared/lib/api/client.ts`
  (`put`, and a typed `delete`), `features/auth/index.ts` (exports `updateUser`),
  `features/looks/components/LookScreen.tsx` (no booking on a featured look's page),
  `features/stylist/format.ts` (`serviceModels` may be missing),
  `features/studio/components/Studio.css.ts` (the Today card's style).
- **Checks run:** `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm test` and
  `npx vite build`, all passed (see the pull request for the run). The whole journey
  was also tried by hand against the real server on a phone-sized screen.
- **Unsure about:** nothing open.
- **Skipped, and why:** nothing.
