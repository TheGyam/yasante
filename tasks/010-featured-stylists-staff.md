---
id: 010
slug: featured-stylists-staff
assignee: codex # codex | gemini | sonnet | haiku | opus
status: ready # draft | ready | in-progress | review | blocked | done
branch: agent/codex/010-featured-stylists-staff
depends_on: [009]
---

# Staff site: the Featured stylists section

## Why

Akua and the team build each featured stylist's page by hand, from photos
they save from her public Instagram posts once she has said yes. This is where
they do it. It will be used many times a day during launch, so it has to be
quick and impossible to get wrong.

**Read `tasks/featured-stylists.md` in full before starting.** It is part of
this brief. Then read task 009 (`tasks/009-featured-stylists-backend.md`),
step 10, for the exact staff endpoints you are building on. Do not change the
server; if an endpoint doesn't give you what you need, set `status: blocked`
and say what's missing.

## Scope

Files this task may change:

- `web/src/features/staff/components/featured/` (new folder: its screens and `.css.ts` files)
- `web/src/features/staff/api.ts`, `hooks.ts`, `types.ts`, `index.ts`, `nav.ts` (additions only)
- `web/src/staff/routes.tsx`, `web/src/staff/routes/featured.tsx` (new)
- `web/src/test/__tests__/staff-featured.test.tsx` (new)
- `tasks/010-featured-stylists-staff.md` (`status` and the report only)

Out of scope (do not touch): `backend/`, the public website outside
`features/staff` and `staff/`, the app.

## What to do

Copy the shape of the Notifications page: `web/src/staff/routes/notifications.tsx`,
`web/src/features/staff/components/notifications/` (`Broadcasts.tsx`,
`Composer.tsx`), reading through `readStaff` and writing through `writeStaff`
with the CSRF token from `useStaffContext()`. Use the staff site's existing
UI pieces (`ui.css.ts`, `controls.css.ts`, `ConfirmDialog`, `FileField`,
`EmptyState`) rather than new ones.

1. **Navigation.** In `nav.ts`, map the `stylists.featuredpage` model to its
   own page, `/featured`, the same way `PAGES` maps `staff.broadcast` to
   `/notifications`. It shows under People as **Featured stylists**.

2. **The list** (`/featured`). One row per page, newest first: photo, name,
   `@handle`, area, and one status in words that says what to do next:
   - "Needs photos" (no looks yet)
   - "Waiting for their yes" (looks, no yes recorded)
   - "Ready to go live" (yes recorded, not live)
   - "Live · 14 on the waitlist" (live, not claimed)
   - "Claimed {date}" (claimed)
   Above the list, one button: **Add a featured stylist**. A search box
   filters by name or handle. An empty list says: "No featured stylists yet.
   Add one once they've said yes."

3. **Add a featured stylist.** A short form: name, Instagram handle (accept a
   pasted `@handle` or a full `instagram.com/...` link and keep only the
   handle), area, optional bio and photo. Show the server's message under the
   handle field when it refuses (for example a handle already taken). On
   success, open that stylist's page in the staff site.

4. **One stylist's page** (`/featured/:id`). Top to bottom, in the order the
   work is done, each step showing a tick when it's done:
   1. **Their details**, editable (the Instagram handle locks once live, with
      the words "Locked while the page is live").
   2. **Their looks.** A grid of looks, each with its photos, styles and hair
      type, and a remove button (with a confirm). **Add a look** opens a
      panel: drop or choose 1 to 5 photos (drag to reorder; the first is the
      cover), pick one or more styles from the style list (search as you
      type), pick a hair type, optional caption. Show each photo's preview
      before uploading. Upload with a progress state, and keep the panel open
      after saving, cleared, so adding the next look is one step.
   3. **Their yes.** "Where and when did they say yes?" One line of text, an
      optional screenshot, and **They said yes**. Once recorded it shows the
      note, the date and who recorded it.
   4. **Their link.** **Make a new link** shows the link once, with **Copy
      their link** and the words "This link works once and runs out on
      {date}. Making a new one stops this one working." After leaving the
      page the link can't be shown again; only a new one can be made. Show
      whether a link is live and when it runs out.
   5. **Put the page live.** Disabled, with the reason in words, until there's
      a look and a yes. When live, show **View the page** (opens
      `yasante.com/{handle}` in a new tab) and the waitlist count.
   6. **Take the page down**, at the bottom, in the danger style. A confirm
      dialog that says exactly what is deleted ("Their page, 12 looks and 31
      photos are deleted for good. The waitlist is emptied.") and asks staff to
      type the handle. Hidden once claimed, replaced by "Claimed by them on
      {date}. It's their page now."

5. **Speed.** Read the list and a page with React Query through the existing
   staff hooks. After a write, update the cache from the response rather than
   re-reading everything. Upload photos in parallel, at most 3 at a time.
   Lazy-load the section (`lazy()` in `features/staff/index.ts`, as
   `Broadcasts` is) so it costs nothing until opened.

6. **Every action is safe to press twice.** Disable a button while its request
   runs. Show the server's message when something is refused.

## Acceptance criteria

- [ ] Featured stylists appears under People and opens `/featured`.
- [ ] The list shows the right next-step status for each of the five states (test).
- [ ] Adding a stylist keeps only the handle from `@name` and from an `instagram.com` link (test).
- [ ] A look can't be saved without at least one photo and one style; more than 5 photos is refused before upload (test).
- [ ] Put the page live is disabled with its reason until a look and a yes exist (test).
- [ ] The link is shown once with its expiry and can be copied; leaving and coming back shows only Make a new link (test).
- [ ] Take the page down needs the typed handle and is hidden once claimed (test).
- [ ] Every write sends the CSRF token (test).
- [ ] No new dependencies; the section is lazy-loaded.

## Checks

From `web/`:

```
npm ci && npx tsc --noEmit && npm run lint && npm test && npx vite build
```

## Report to the lead

_Filled in by the assignee when it sets `status: review` or `blocked`._

- **Changed:**
- **Checks run:** (each command and its result; "not run" if you didn't)
- **Unsure about:**
- **Skipped, and why:**
- **Question for the lead:** (only if `blocked`)
