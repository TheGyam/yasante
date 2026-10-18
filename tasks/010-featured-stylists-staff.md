---
id: 010
slug: featured-stylists-staff
assignee: codex # codex | gemini | sonnet | haiku | opus
status: review # draft | ready | in-progress | review | blocked | done
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
- `backend/apps/staff/views/featured.py`: only adding `agreed_at` to the page detail (and summary) response, with a test in `backend/tests/test_featured.py`
- `tasks/010-featured-stylists-staff.md` (`status` and the report only)

Out of scope (do not touch): the rest of `backend/`, the public website outside
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
      note and the date ("Said yes on {date}: {note}"). The note says who
      they said yes to, so there is no separate recorder.
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
   re-reading everything. A look's photos go up in one ordered multipart
   request (`files`, cover first), as the server takes them; show "Saving…"
   on the button while it runs.
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

- **Changed:**
  - Added the lazy-loaded Featured stylists section under People, with paged rows, all five next-step statuses, a name/handle filter, and the requested empty state. The filter applies to the current server page; the existing endpoint does not implement global search.
  - Added creation and editing with Instagram handle/link normalisation, optional avatar, the live-handle lock and server errors. Staff writes keep same-origin cookies and CSRF through `writeStaff`.
  - Added the look grid, confirmed removal, searchable and paged style choices from the existing staff style catalogue, hair type and caption. Choosing/dropping 1–5 photos previews them before upload; drag and keyboard buttons reorder them. One multipart request sends the cover first. The button says Saving… and cannot be pressed again while saving; a successful save clears the still-open panel.
  - Added the yes note/screenshot and the exact saved-date line, a private link kept only on the mounted screen, copying and expiry status, the guarded publishing button, and typed-handle take-down with real look/photo counts. Claiming hides the destructive and handover actions. Existing staff UI pieces, tokens and dialogs are reused.
  - Added only `agreed_at` to the server summary, which is also used by the detail response. The regression covers missing and recorded dates in both responses. Nothing else in backend changed except that test.
  - Added 18 staff tests covering navigation, all statuses, empty state, both handle formats, refused handles, look validation/order/dragging/previews/clearing/busy state, publishing reasons, the yes date and live handle lock, private-link lifetime/copying/expiry, typed take-down, claimed state, removal, CSRF for every write and the lazy export. All existing tests and their timeouts remain unchanged.
  - Supporting change: `web/src/features/staff/api.ts` accepts an optional POST/PATCH/DELETE method, defaulting to POST, so the new staff endpoints use the existing writer without duplicating its CSRF/error handling. Existing callers keep their behavior. Other listed staff files contain additions for this section only.
  - Writes update cached detail/list rows without reloading the workspace. Create/edit, links, publication and removal use the returned data and confirmed action. Adding a look and recording the yes return only an id/done flag, so those two actions read just the affected detail to obtain authoritative media addresses or the saved date, then update its cached list row. Link codes are not put in query data or browser storage.
- **Initial implementation checks (before review):**
  - Website `npm ci`: passed, 309 packages installed from the existing lockfile. npm reported one existing high-severity audit finding; no dependency or lockfile changed.
  - Website `npx tsc --noEmit`: passed. Early errors were limited to the new test typings and were corrected.
  - Website `npm run lint`: passed, zero errors or warnings. The first run caught an impure expiry calculation during render; it now uses state and an expiry timer.
  - Website `npm test`: passed for all 18 files and 101 tests, including all 18 new staff cases. Earlier runs exposed a missing asynchronous wait in the new list test; it now waits for the lazy screen and its data. One intermediate parallel run also timed out in the unchanged existing signup test. The final ordinary `npm test` run passes with the original timeouts and assertions; no workers or suites were excluded.
  - Website `npx vite build`: passed. The output includes a separate Featured chunk, and a test also verifies the lazy export.
  - Backend `python -m pip install -r requirements-dev.txt`: passed; requirements already satisfied.
  - Backend `DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run`: passed; no changes detected. PowerShell supplied test settings and the isolated local PostgreSQL URL through environment variables.
  - Backend `python -m pytest -q -p no:cacheprovider --create-db`: passed for the whole backend, all 529 tests, including the new date-response test.
  - `python manage.py spectacular --file ../openapi.yaml` and `git diff --exit-code ../openapi.yaml`: passed. Seven existing schema warnings, zero errors and no generated change: staff endpoints are excluded from the public schema.
  - Root and website `npm run api:types && git diff --exit-code src/shared/lib/api/schema.d.ts`: passed; both clients regenerated without drift or manual edits.
  - `git diff --check`: passed. Dependency lockfile diff check: passed, no changes.
- **Unsure about:** No unanswered implementation questions. Style choices use the existing staff catalogue and its existing model permissions. The current-page search and the two targeted detail reads are described above so their limits are explicit.
- **Skipped, and why:** No acceptance test skipped or weakened. Manual browser/device testing and the unrelated app test suite were not run; the staff interactions were exercised through the complete routed component tests. No changes to the public website, app, other backend behavior, dependencies or lockfiles.


### Review fixes for pull request #52

Merged master, including the full-link server fix in `ea8ddff`, before making these changes. Status remains `review`.

1. Look cards now show the catalogue's style names and the existing hair type labels. One shared, deduplicated catalogue lookup supplies all cards; it follows further catalogue pages when needed. Tests prove three cards use one read, codes are not displayed, and names on a second catalogue page are resolved.
2. Photo order/removal controls are small arrow/remove icon buttons, using the existing Button. Each retains its full accessible name and matching tooltip. Impossible earlier/later moves are absent at the ends. Tests check icons, names, tooltips, hidden end controls, keyboard/button reordering and removal; the existing drag test still passes.
3. Chosen styles use removable chips above the scrollable choices, matching the notification composer's chip pattern. The hint changes from `Pick up to 3 styles` to the picked count. A test filters the choices, keeps both chosen chips visible, removes one and checks the count and remaining checkbox.
4. The add-look panel closes with `Cancel`. A test checks that closing restores `Add a look`, removes the panel and sends no write.
5. Removed the search hint and hid search when the list is empty. Existing populated-list filtering assertions remain; new assertions check both the absent hint and the absent empty-list search box.
6. While the private link is visible, only its full explanatory expiry sentence is shown. After leaving and returning, only the saved status and expiry are shown. The link-lifetime test now requires one date occurrence in each state and verifies the other message is absent.
7. Added a dedicated regression that shows the full `https://yasante.com/claim/...` address returned by the server, rejects a path-only display and copies the full address. The existing full-address/lifetime test remains.

Review checks:

- Website `npm ci`: passed; 309 locked packages installed. The existing audit still reports one high-severity finding. Neither lockfile changed and no dependency was added.
- Website `npx tsc --noEmit`: passed.
- Website `npm run lint`: passed, zero errors or warnings.
- Website `npm test`: passed on the first review run, all 18 files and 107 tests, including all 24 staff cases. Six tests were added, and the existing search and link tests gained assertions. No tests or workers were skipped, no assertions were removed, and no timeouts changed.
- Website `npx vite build`: passed; the Featured section remains a separate lazy chunk.
- `git diff --check`: passed. Dependency lockfile diff check: passed.
- Verified `ea8ddff` is an ancestor of this branch after pulling master.
- Backend tests, app tests, schema/client generation and manual browser/device testing: not run in this review round. The new changes are confined to the staff UI, its query hook, its tests and this report; the server fix was merged unchanged from master. The earlier implementation checks above are historical results, not new runs.

Status remains `review`. No unresolved questions or skipped review points.
