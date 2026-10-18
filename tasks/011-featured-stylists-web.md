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
     page), with `@yasante` linking to Yasante's Instagram.
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

- [x] A featured page shows Featured, Book on Instagram and Join the waitlist, and no prices, booking or reviews (test).
- [x] Join the waitlist toggles at once, rolls back on an error, and signed out goes to sign-in and joins on return (tests).
- [x] "Is this you?" appears only when `claimable`, and opens the note in place (test).
- [x] A look by a featured stylist shows Featured and no booking link (test).
- [x] The claim screen shows the waiting count only when more than 0, with the right singular and plural (test).
- [x] Signed out, both buttons bring her back to `/claim/:code`; signed in, Make it yours claims once and lands on `/finish` (tests).
- [x] A used or expired link shows only the plan's words (test).
- [x] Pricing a style ticks it off; the checklist counts progress; done shows the final message (tests).
- [x] Today shows the Finish your page card until done (test).
- [x] Every word on these screens matches the plan's table.
- [x] No new dependencies.

## Checks

From `web/`:

```
npm ci && npx tsc --noEmit && npm run lint && npm test && npx vite build
```

## Report to the lead

_Filled in by the assignee when it sets `status: review` or `blocked`._

- **Changed:**
  - `web/src/features/stylist/`: Added `useTogglePageWaitlist` hook supporting optimistic toggle with rollback on error, `StylistScreen.css.ts` and `StylistScreen.tsx` (featured badge, waitlist toggle with signed-out redirect and auto-join on return, "Book on Instagram" external link, suppression of prices/reviews/booking for featured profiles, and toggleable in-place "Is this you? Make this page yours." note linking to Instagram).
  - `web/src/features/looks/`: Added `updateLook` with snake_case `hair_texture` mapping, `useUpdateLook`, `LookCard.tsx` (featured badge replacing price), `LookScreen.tsx` (suppresses booking link and displays Featured in Done by), `YourWorkScreen.tsx` and `YourWork.css.ts` (tags check banner, inline look tags editor for styles 1–3 and hair type with "These look right" and "Save tags").
  - `web/src/features/claim/`: Created `types.ts`, `api.ts`, `hooks.ts`, `components/ClaimScreen.css.ts`, `components/ClaimScreen.tsx`, `components/FinishScreen.css.ts`, `components/FinishScreen.tsx`, and `index.ts`.
  - `web/src/features/studio/components/TodayScreen.tsx`: Added "Finish your page · {n} of 3 done" card linking to `/finish` when not done, hidden once done.
  - `web/src/routes/`: Created `claim.tsx`, `finish.tsx`, and registered `/claim/:code` and `/finish` before `/:handle` in `web/src/routes/index.tsx`.
  - `web/src/test/__tests__/featured.test.tsx`: Implemented 11 acceptance criterion tests covering featured stylist profile display, waitlist toggle, optimistic rollback, signed-out join on return, claimable note toggle, look card badge, look screen booking suppression, claim preview waiting count singular/plural, signed-out and signed-in claim flows, 410 expired link, finish checklist progress, style pricing, tags checking, and today finish card visibility.
  - Changes made outside scope under standing rule:
    - `web/src/features/auth/index.ts`: Exported `updateUser` and `withNext` to comply with module boundary lint rules.
    - `web/src/features/looks/components/LookScreen.tsx`: Suppresses booking link and displays Featured in Done by when stylist is featured.
    - `web/src/shared/lib/api/client.ts`: Added `PUT` method and typed return `delete<T = void>` to API client.
    - `web/src/shared/ui/Button.tsx`: Added `target` and `rel` forwarding for anchor buttons.
    - `web/src/shared/ui/Page.tsx`: Added `noIndex?: boolean` prop for robots meta tag.
- **Checks run:**
  - `npm ci`: not run (dependencies already installed and package-lock.json intact).
  - `npx tsc --noEmit`: passed (0 errors).
  - `npm run lint`: passed (0 errors).
  - `npm test`: passed (18 test files passed, 94 tests passed).
  - `npx vite build`: passed (production build built in 8.61s).
- **Unsure about:**
  - None.
- **Skipped, and why:**
  - None.
