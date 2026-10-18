---
id: 009
slug: featured-stylists-backend
assignee: codex # codex | gemini | sonnet | haiku | opus
status: done # draft | ready | in-progress | review | blocked | done
branch: agent/codex/009-featured-stylists-backend
depends_on: []
---

# Server: featured stylist pages, the waitlist for them, and claiming them

## Why

With a stylist's permission, Yasante builds her page from her public posts so
clients have real work to find at launch. Clients can join a waitlist for her,
and she can make the page hers whenever she likes. This task is the whole
server side. The staff screens, the website and the app come after, in tasks
010, 011 and 012, and depend on the endpoints here being exactly as written.

**Read `tasks/featured-stylists.md` in full before starting.** It is part of
this brief: the flow, the exact words to use, and the principles your work is
reviewed against (intuitive, ingenious, fast, secure, honest).

## Scope

Files this task may change:

- `backend/apps/stylists/` (`models.py`, `featured.py` (new), `views.py`, `urls.py`, `serializers.py`, `admin.py`, `tasks.py`, `migrations/`)
- `backend/apps/looks/` (`serializers.py` for `present_looks`, `views.py` for `LookDetailView.patch` and the shared visibility rule in step 4, `urls.py` only if needed)
- `backend/apps/bookings/views.py`: only the refusals in step 9, and routing `_public_look` through the shared look visibility filter (step 4)
- `backend/apps/planner/views.py`: only routing its look lookups (saving a look) through the shared look visibility filter (step 4)
- Any other file where a public look lookup bypasses the shared filter: route it through, change nothing else there, and list it in your report. You don't need to ask first for these.
- `backend/apps/accounts/views.py`, `backend/apps/accounts/serializers.py`: only the stand-in refusals in step 3
- `backend/apps/common/uploads.py`: only the refactor in step 5
- `backend/apps/common/identifier_policy.json`: add `claim` and `finish` to `routes`
- `backend/apps/common/metrics.py`, `backend/apps/staff/insights.py`: only the exclusions in step 12
- `backend/apps/staff/views/featured.py` (new), `backend/apps/staff/urls.py` (new paths only), `backend/apps/staff/names.py` (one entry)
- `backend/apps/web/views.py`, `backend/apps/web/seo.py`, `backend/apps/web/urls.py`: only step 13
- `backend/config/settings/base.py`: new throttle scopes only
- `backend/apps/profiles/serializers.py`: only the reserved-domain guard in `UserUpdateSerializer.validate_email` (step 3)
- **Standing rule:** when a step here plainly requires a small change in a file not listed (like the guards in step 3 or the refusals in step 9), make only that change, and list the file and why in your report. You don't need to ask first. Stop only for questions about what to build.
- `backend/config/urls.py`: new `path` entries only, to register the new endpoints
- `backend/tests/test_featured.py` (new), and the existing test files only where an existing test must change because of this task (say which and why in your report)
- `openapi.yaml`, `src/shared/lib/api/schema.d.ts`, `web/src/shared/lib/api/schema.d.ts` (regenerated, never hand-edited)
- `tasks/009-featured-stylists-backend.md` (`status` and the report only)

Out of scope (do not touch): everything in `web/src` and `src/` and `app/`
other than the two generated `schema.d.ts` files; the existing slot waitlist
(`SlotInterest`); deleting the mock accounts; anything not named above.

## What to do

Copy patterns from the code that is already there. Where a step names a file to
copy from, match it: naming, comments, error style (`{"message": "..."}` with a
plain sentence), `extend_schema` on every view, `@transaction.atomic` around
every write.

1. **Models** in `backend/apps/stylists/models.py`.
   - On `StylistProfile`, add `featured = models.BooleanField(default=False, db_index=True)`,
     with a comment: set up by Yasante and not taking bookings yet. It is
     `True` from the moment staff create the page until the first moment the
     page takes bookings (step 8). It is the one flag every screen reads.
   - New `FeaturedPage`, one-to-one with `StylistProfile`
     (`related_name="featured_page"`, `on_delete=CASCADE`). Fields:
     - `instagram_handle`: `CharField(max_length=50)`, lower case, no `@`. The
       account she agreed from. Fixed once set; nothing but staff changes it.
     - `agreed_at`: `DateTimeField(null=True, blank=True)`. When she said yes.
     - `agreed_note`: `CharField(max_length=300, blank=True)`, e.g.
       "Said yes in Instagram DM to Akua".
     - `agreed_proof`: FK to `common.Media`, null, `SET_NULL`, a private
       screenshot of her yes (optional).
     - `added_by`: FK to user, null, `SET_NULL`, `related_name="+"`.
     - `code_hash`: `CharField(max_length=64, blank=True, db_index=True)`, the
       SHA-256 hex of her link's code; empty when there is no live link.
     - `code_expires_at`: `DateTimeField(null=True, blank=True)`.
     - `claimed_at`: `DateTimeField(null=True, blank=True)`; `claimed_by`: FK to user, null, `SET_NULL`, `related_name="+"`.
     - `tags_checked_at`: `DateTimeField(null=True, blank=True)`.
     - `created_at` / `updated_at` (`TimeStampedModel`).
   - New `PageWaitlist`: `client` (FK user, CASCADE, `related_name="page_waitlists"`),
     `stylist` (FK `StylistProfile`, CASCADE, `related_name="waitlist"`),
     `created_at`. A `UniqueConstraint` on `(stylist, client)`. An index on
     `(stylist, created_at)`.
   - One migration per app touched. Make sure `makemigrations --check` is clean.

2. **`backend/apps/stylists/featured.py`** (new) holds all the logic, so views
   stay thin. Functions, each with a one-line docstring:
   - `STAND_IN_DOMAIN = "yasante.invalid"` and `is_stand_in(user) -> bool`
     (email ends with `@yasante.invalid`).
   - `create_page(*, display_name, instagram_handle, base_area, avatar_media=None, bio="", added_by)`:
     creates the stand-in user (`email=f"{uuid4().hex}@{STAND_IN_DOMAIN}"`,
     `name=display_name`, unusable password, `roles=["stylist"]`), then the
     `StylistProfile` (`handle` = the Instagram handle, run through the same
     handle validation as everywhere else, `instagram_handle` the same,
     `featured=True`, `published=False`) and its `FeaturedPage`. If the
     handle is taken or not allowed, raise a `ValueError` with the same
     message the handle check gives today, so staff see why.
   - `add_look(page, *, photos, styles, hair_texture="", caption="")`: makes
     one `Look` (author the stand-in, `stylist_id`/`stylist_name`/`stylist_handle`
     filled as in `PortfolioListCreateView._share`, `area` her `base_area`,
     public, no service, no price) with 1 to 5 photos in order (`LookPhoto`
     rows exactly as `create_look` in `apps/looks/views.py` makes them; copy
     that, cover photo first) and its `styles`, plus one `PortfolioPhoto` for
     the cover with `look_id` set. Every photo must be a `Media` owned by the
     stand-in. At least one style is required.
   - `remove_look(page, look_id)`: deletes the look and its portfolio photo.
   - `record_yes(page, *, note, proof_media=None)`, `put_live(page)` (refuses
     with a message unless `agreed_at` is set and there is at least one look;
     sets `published=True`), `new_link(page) -> str` (makes the code with
     `secrets.token_urlsafe(24)`, stores only `sha256(code).hexdigest()` and
     `now + 7 days`, returns the full URL `f"{settings.PUBLIC_BASE_URL}/claim/{code}"`;
     works before or after the page is live), `take_down(page)` (deletes the
     stand-in user, which cascades to the profile, looks, photos, media and
     waitlist; refuses once the page is claimed, since it is hers then).
   - `page_for_code(code)`: the `FeaturedPage` whose `code_hash` matches,
     still unclaimed and not expired, or `None`. Look up by the hash only.
   - `claim(page, user)`: everything in step 6.
   - `takes_bookings(profile) -> bool`: published, not owned by a stand-in,
     at least one menu item, and at least one working day in her week. Find
     how the week is stored and read it with the existing helpers in
     `apps/stylists/slots.py` (`day_hours`); do not parse the JSON a second way.
   - `open_if_ready(profile)`: if `profile.featured` and `takes_bookings(profile)`,
     set `featured=False` (in the request, so the page flips at once) and, on
     commit, queue `tell_waitlist.delay(profile.pk)`. Safe to call any number
     of times.
   - `finish_state(profile)`: what the checklist needs (step 7).

3. **Stand-ins can never sign in.** They have an unusable password, so a
   password sign-in already fails; add a test proving it. Then refuse the
   domain at the doors that take an email: signup, the email-code start and
   any email change, with 400 "Use your own email address". Forgot-password
   for a stand-in address sends nothing and answers exactly as it does for an
   unknown address (no way to tell the difference).

4. **Waitlist for clients.**
   - `PUT /api/stylists/by-handle/<handle>/waitlist/` joins, `DELETE` leaves.
     Signed in only. Throttle scope `waitlist` (exists). Joining twice is
     fine and changes nothing (`get_or_create` on the unique pair). Leaving
     when not on it changes nothing either. Both answer 200, never 204.
   - Only for a page with a `FeaturedPage` that does not take bookings yet.
     Otherwise 400 "{name} already takes bookings. Book now." The stylist
     can't join her own page's waitlist (400 "This is your page").
   - Both answer `{"joined": true|false}`.
   - In `stylist_page()` (`apps/stylists/views.py`), add to `profile`:
     `featured` (the flag), `claimable` (a `FeaturedPage` exists and is not
     claimed), and to the top level `waitlist_joined`: `true`/`false` for a
     signed-in viewer, `null` when signed out. Never the count, never names.
     `stylist_page()` has no request today; pass the viewer in and keep the
     website's inlined copy (`apps/web/views.py`) working with `None`.
   - A featured page that isn't live (`published=False`) stays a 404 to
     everyone, as today.
   - **Its looks are hidden too.** Until staff put a featured page live, its
     looks must not appear anywhere public: the feed, a look's own page,
     style and area pages, search, comments, likes, saves and the website's
     inlined data. Add the rule once, in the shared queryset every public
     look read already goes through (`_looks` / `_visible_look` in
     `apps/looks/views.py`, or wherever they really live), as one indexed
     filter: exclude looks whose author's profile has `featured=True` and
     `published=False`. No per-look checks. List every public look read you
     confirmed goes through it in your report, and test the feed, a look's
     page and a style page. Staff endpoints still see them.

5. **One upload pipeline.** Move the body of `UploadView.post` in
   `apps/common/uploads.py` (size and pixel checks, re-encode, the three
   copies, the hash, the duplicate check, the `Media` row) into
   `store_image(upload, *, owner, kind, source, private) -> (media, error)`.
   `UploadView.post` calls it and behaves exactly as before (its tests must
   pass unchanged). Staff uploads in step 10 call the same function with the
   stand-in as owner and `source="instagram"`. No second copy of image
   handling anywhere.

6. **Claiming** (`claim(page, user)`), in one `transaction.atomic()`:
   - Lock the `FeaturedPage` and its profile with `select_for_update()`, then
     re-check: unclaimed, code not expired. Otherwise raise the "link used or
     expired" error.
   - Refuse if `user.email_verified` is false and the account has neither
     `apple_id` nor `google_id` (409 with "Confirm your email first, then open
     this link again"). Refuse if the user already has a `stylist_profile`
     (409, the "Already has a page" words from the plan). Refuse a stand-in.
   - Move everything the stand-in owns to `user`: `Look.author` and
     `Look.stylist_id` (both the looks it wrote and any crediting it),
     `Media.owner`, then `profile.account`. Use `.update()` queries, not a
     loop. Remove `user` from this page's waitlist if present.
   - Add `"stylist"` to `user.roles`. Set `claimed_at`, `claimed_by`, clear
     `code_hash` and `code_expires_at`.
   - **Never lose data.** Before deleting the stand-in, check every reverse
     relation to the user model (`User._meta.related_objects`) and count rows
     still pointing at the stand-in. Allow only rows Django or this codebase
     creates for every user automatically (list them in a constant, with a
     comment saying why each is safe). If anything else is left, raise, so
     the whole claim rolls back. A test must prove this by adding an
     unexpected related row and checking nothing moved.
   - Delete the stand-in. Write a staff audit event (`security_event` in
     `apps/staff/audit.py`, event `featured_page_claimed`). Then
     `open_if_ready(profile)`.
   - Endpoints, throttle scope `claim` (new, `"10/min"` in `base.py`):
     - `GET /api/featured/claim/<code>/` (anyone): 200 with
       `{display_name, handle, avatar_uri, look_count, live, waiting, photos}` where
       `waiting` is the waitlist count and `photos` is up to 6 look covers,
       newest first, each `{uri, thumb_uri}`, so she sees her page before it
       is live (one query, no extra per photo); 410 with the plan's "Link used or
       expired" words when there's no such live link.
     - `POST /api/featured/claim/<code>/` (signed in): claims, answers with
       the user exactly as `InviteRedeemView` does (`UserSerializer`), so the
       apps can switch to stylist mode.
     - Both send `Referrer-Policy: no-referrer` and `Cache-Control: no-store`.

7. **Finish your page**, for a claimed page only (404 otherwise):
   - `GET /api/stylists/me/finish/`:
     `{styles: [{slug, name, photo_count, priced}], hours_set, tags_checked, done}`.
     `styles` comes from the styles on her looks made before `claimed_at`,
     one query with an aggregate, sorted by `photo_count` descending. `priced`
     is true once a service of hers covers that style's looks. `done` is all
     three true.
   - `POST /api/stylists/me/finish/price/` with
     `{style, price, from_price, duration_minutes}`: validated through
     `_menu_draft` (copy its rules), creates one `MenuItem` named after the
     style, links every portfolio photo of hers whose look has that style and
     no service yet, and fills `service_id`, `service_name`, `price` and
     `from_price` on those looks. One transaction, `.update()` queries. Then
     `open_if_ready`. Answers with the new finish state.
   - `POST /api/stylists/me/finish/tags-checked/`: sets `tags_checked_at`,
     answers with the finish state.
   - Call `open_if_ready(profile)` after the existing menu create, menu
     import and hours (availability) updates as well, so the page opens
     however she gets there.

8. **Telling the waitlist.** `tell_waitlist(profile_id)` in
   `apps/stylists/tasks.py` as a `@shared_task`, matching the tasks in
   `apps/bookings/tasks.py`. It re-checks `takes_bookings`, then for each
   waiting client in batches of 500 (`iterator()`), sends the plan's
   notification through `notify_once` in `apps/common/notifications.py`,
   category `waitlist`, event key `f"page-open:{profile_id}:{client_id}"`,
   `url=f"/{handle}"`, `mode="client"`. Then deletes the rows. Running it
   twice sends nothing twice.

9. **No booking a featured page.** Wherever a booking, a free-times request
   (`StylistSlotsView`) or a slot waitlist (`SlotInterest` create) is made
   against a profile, refuse when `profile.featured`, with 400
   "{name} isn't taking bookings on Yasante yet. Join the waitlist and we'll
   let you know." Find every such entry point (`apps/bookings/views.py` lines
   near 209 and 739 do this lookup today) and list them in your report.

10. **Staff endpoints** in `apps/staff/views/featured.py`, under the staff
    site's API like `broadcasts.py`: `@staff_data`, `@csrf_protect` on
    writes, and the `FeaturedPage` model's view/change permissions checked
    the way `model_admin()` in `apps/staff/access.py` does. Every write
    writes an audit event naming the action. Paths:
    - `GET featured/` — every featured page, newest first, paged like
      `records.py`: `{id, display_name, handle, instagram_handle, avatar_uri, base_area, live, agreed, look_count, waiting, link_expires_at, claimed_at}`.
      `look_count` and `waiting` come from annotations, not per-row queries.
    - `POST featured/` — create (`display_name`, `instagram_handle`,
      `base_area`, optional `bio`, optional avatar file).
    - `GET featured/<id>/` — the page plus its looks (id, photos, styles,
      hair type, caption).
    - `PATCH featured/<id>/` — display name, bio, area, avatar. Not the
      Instagram handle once the page is live.
    - `POST featured/<id>/looks/` — multipart: `files` (1 to 5), `styles`
      (slugs, at least one), `hair_texture`, `caption`. Each file goes through
      `store_image` (step 5) owned by the stand-in, then `add_look`.
    - `DELETE featured/<id>/looks/<look_id>/`.
    - `POST featured/<id>/yes/` — `note`, optional `proof` file (private).
    - `POST featured/<id>/live/`, `POST featured/<id>/link/` (answers
      `{url, expires_at}`; the only time the code is ever sent),
      `POST featured/<id>/take-down/` (body must include `handle` equal to the
      page's handle, as a typed confirmation).
    - Register `FeaturedPage` in `apps/stylists/admin.py` (read-only list,
      search on handle and Instagram handle) so it appears in the staff
      overview, and add its friendly name ("Featured stylists", group
      "People") in `apps/staff/names.py`.

11. **Looks and search show featured honestly.**
    - In `present_looks` (`apps/looks/serializers.py`) add
      `stylist_featured: bool` to each look, from ONE query per call for the
      featured account ids among the looks' `stylist_id`s. Add it to the
      serializer so it is in `openapi.yaml`.
    - Stylist search (`StylistCreateView.get`) keeps featured pages in the
      results but orders every page that takes bookings first. Do it in the
      query (`order_by("featured", ...)`), keeping the current order within
      each group.
    - `PATCH /api/looks/<id>/` on `LookDetailView`: the author can change
      `styles` (slugs, at least one for a look) and `hair_texture`. Nothing
      else. Copy the validation `create_look` uses for those two fields.

12. **Honest numbers.** `apps/common/metrics.py`, `apps/staff/insights.py`
    and the stylist jobs in `apps/stylists/tasks.py` that loop over published
    stylists leave out `featured=True` pages. Grep for every other
    `published=True` on `StylistProfile` in `backend/apps` and decide each:
    list them all in your report with what you did and why.

13. **The website's server side.** Her page view in `apps/web/views.py`
    renders with `noindex=True` while `featured`. `apps/web/seo.py` leaves
    featured pages out of the sitemap and area lists. Add a `/claim/<code>`
    page view that renders the site shell with `noindex=True`, no seeded
    data, and the `Referrer-Policy: no-referrer` header. Make `/finish` serve
    the site shell exactly the way the studio pages (`/today`) are served. Add `claim` and `finish` to
    `routes` in `apps/common/identifier_policy.json` so nobody can take it as
    a handle (if a test keeps that list equal to the app's `NOT_HANDLES`,
    say so in your report rather than editing the app).

14. Regenerate `openapi.yaml` and both `schema.d.ts` files (see `AGENTS.md`).

## Acceptance criteria

Each one has a test in `backend/tests/test_featured.py` unless it says otherwise.

- [ ] Staff can create a page, add a look of 1 to 5 photos with styles, record the yes, put it live, make a link and take it down; each writes an audit event.
- [ ] A page can't go live without a yes and a look; the Instagram handle can't change once live.
- [ ] A non-staff user, and staff without the model permission, get 403 from every staff endpoint; writes without CSRF are refused.
- [ ] A stand-in can't sign in by password, can't start an email code, and forgot-password for it answers the same as for an unknown email.
- [ ] Signing up with a `@yasante.invalid` email is refused.
- [ ] The claim link: only the hash is stored; a new link stops the old one working; it runs out after 7 days; it works once; a wrong code is 410.
- [ ] Two claims of the same link at once: exactly one succeeds (`transaction=True` test with two threads or two connections).
- [ ] Claiming moves the profile, every look, every portfolio photo and every media file to her account, adds the stylist role and deletes the stand-in; her existing client data is untouched.
- [ ] A claim with an unexpected row still pointing at the stand-in rolls back completely.
- [ ] Claiming is refused for an unconfirmed email (no Apple or Google), an account that already has a page, and a stand-in.
- [ ] The waitlist: join and leave are idempotent; refused for a page that takes bookings and for her own page; signed out is 401; the page response has `featured`, `claimable` and `waitlist_joined` and never the count.
- [ ] Booking, free times and slot waitlists against a featured page are refused with the plan's words.
- [ ] Pricing a style creates the service, links exactly the photos and looks of that style without a service, and leaves other looks alone.
- [ ] The first time a claimed page has a service and working hours, `featured` turns false and `tell_waitlist` is queued after commit; the task notifies every waiting client once, empties the waitlist, and a second run sends nothing.
- [ ] `stylist_featured` is on every look in the feed, with at most one extra query per page (`django_assert_max_num_queries`, measured before and after).
- [ ] Search puts pages that take bookings before featured ones.
- [ ] The staff list costs a fixed number of queries whatever the number of pages.
- [ ] Featured pages are `noindex` and not in the sitemap; `/claim/<code>` is `noindex` and sends `Referrer-Policy: no-referrer`.
- [ ] Metrics, insights and digests don't count featured pages (one test per place changed).
- [ ] `UploadView` behaves exactly as before (its existing tests pass unchanged).
- [ ] `openapi.yaml` and both `schema.d.ts` files are regenerated and committed.

## Checks

From `backend/`:

```
DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run
python -m pytest -q -p no:cacheprovider --create-db
```

From the repo root:

```
npm run api:types && git diff --exit-code src/shared/lib/api/schema.d.ts
```

Run the whole backend suite, not just your new file, and always with
`--create-db` (tests that use `transaction=True` empty the seeded data in a
reused database).

## Report to the lead

- **Changed:**
  - Added the stylist flag, staff facts, client waitlist and one migration. Staff can build a page with 1–5-photo looks, record permission, put it live, replace its seven-day private link and take it down. Writes use staff sign-in, the model permission, CSRF and audit events.
  - Added locked, single-use claiming. Only a hash is stored. Ownership moves with bulk updates; unexpected reverse relations roll the transaction back before deleting the stand-in. Existing client photos and data stay separate from staff views and style pricing.
  - Added Finish your page, style pricing, tag editing and readiness hooks after menu creation/import, hours updates, publishing and claiming. Readiness refreshes the locked profile so nearby menu and hours saves use current data. The waitlist task runs after commit, rechecks readiness, iterates in batches of 500 and uses unique notification keys.
  - Refused the reserved domain at signup, social sign-in, email-code start and profile email changes. Password sign-in fails; forgot-password sends nothing and matches an unknown address.
  - Added the shared indexed draft-look exclusion, the batched look flag, search ordering, Featured booking refusals, noindex/private-link headers, sitemap/area exclusions and honest metrics/insights/digests.
  - Regenerated openapi.yaml and both schema.d.ts files with the existing generators. Added acceptance tests in backend/tests/test_featured.py. No tests were weakened or skipped. No dependencies were added.

- **Initial implementation checks (before review):**
  - `pip install -r requirements-dev.txt`: passed in the existing backend virtual environment.
  - `DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run`: passed; no changes detected. PowerShell supplied the settings and isolated local PostgreSQL URL through environment variables.
  - `python -m pytest -q -p no:cacheprovider --create-db`: passed for the entire backend, 519 tests including the new acceptance cases. Every full run used --create-db.
  - Focused runs of `python -m pytest -q -p no:cacheprovider --create-db tests/test_featured.py`: used while implementing. Early failures in upload URLs/fixtures, schema annotations and the bulk pricing query were corrected; the final whole-suite run passes all acceptance cases, including concurrent claims, hidden reverse relations, private client-data preservation and current readiness state.
  - `python manage.py spectacular --file ../openapi.yaml`: passed; seven warnings, zero errors.
  - Root `npm run api:types && git diff --exit-code src/shared/lib/api/schema.d.ts`: passed after staging the generated files and rerunning the generator; no additional drift.
  - Website `npm run api:types && git diff --exit-code src/shared/lib/api/schema.d.ts`: passed with the same regeneration check.
  - Root `npm ci`, `npx tsc --noEmit` and `npm run lint`: passed. Lint reports 108 warnings and zero errors in the existing code.
  - Root `npx jest --ci`: the first run failed with a shared temporary-cache EPERM error and incorrectly included website Vitest files. After the portable exclusion fix, `npx jest --ci --cacheDirectory <task temporary cache>` passed: 47 suites, 232 tests, exit 0. It still reports a worker open-handle warning. An intermediate serial run passed its assertions but stayed alive on open handles; that completed runner was stopped after the successful normal-worker run.
  - Website `npm ci`, `npx tsc --noEmit` and `npm run lint`: passed.
  - Website `npm test`: the first concurrent run had two timing failures. `npm test -- --maxWorkers=1` then passed every test: 17 files, 83 tests, unchanged assertions and timeouts.
  - Website `npx vite build`: passed.
  - `python -m ruff check apps/stylists/featured.py apps/staff/views/featured.py tests/test_featured.py`: passed. Only the three new Python files were formatted.
  - `git diff --check`: passed.
  - Existing lockfile audit output from npm ci: the app reported 90 vulnerabilities (one critical); the website reported one high-severity vulnerability. No dependencies or lockfiles were changed and no automatic audit fixes were applied.

- **Every published=True use on StylistProfile and booking entry point:**
  - apps/stylists/views.py: StylistCreateView.get keeps live Featured pages and orders them after other pages (including the later style/distance sort). StylistByHandleView.get keeps them visible with the new flags and private waitlist state. StylistSlotsView.get keeps the published lookup, then returns the required Featured refusal. PageWaitlistView keeps the published lookup and rejects joining once the page takes bookings.
  - apps/bookings/views.py: BookingListCreateView.post and SlotInterestListCreateView.post keep the published lookup, then refuse Featured profiles before services or times are processed. These and StylistSlotsView.get are the three booking/free-times/slot-interest entry points changed.
  - apps/looks/views.py: create_look's existing published-profile lookup still credits the owner; stand-ins cannot sign in and all public reads use the draft exclusion.
  - apps/common/throttling.py: PostingThrottle's published-profile lookup stays unchanged. This is a posting allowance for a signed-in stylist, not a business count; stand-ins cannot sign in.
  - apps/common/metrics.py: activated_stylists and response_median exclude Featured profiles.
  - apps/stylists/tasks.py: nightly_stats and monthly_recap exclude Featured profiles.
  - apps/staff/insights.py: area supply excludes Featured profiles. Stylist growth and top-stylist results also exclude them.
  - apps/web/views.py: the normal stylist lookup still serves published Featured pages with noindex. The area stylist list, sitemap profiles/areas and _llms_sections exclude Featured profiles.
  - apps/web/seo.py: the home stylist list, home area list and style-page stylist list exclude Featured profiles.
  - Other published=True hits in the audit belong to content and policy models, not StylistProfile, and were left alone.

- **Public look reads confirmed through the shared filter:**
  - apps/looks/views.py: feed/search and ordinary look reads through _looks; look detail, likes, comments, replies and comment likes through _visible_look; area listing and look/comment reporting through the same filter.
  - apps/planner/views.py: the lookup while saving a look. Nothing else in that file changed beyond the supporting import.
  - apps/bookings/views.py: the actual helper is named _bookable_look; its lookup now uses the filter.
  - apps/stylists/views.py: style-search matches and result photos. apps/stylists/serializers.py: portfolio look-photo expansion uses look ids from the filter.
  - apps/web/views.py: look detail and its inlined data, style/area cover queries, area looks and sitemap look entries. apps/web/seo.py: home, style and look-index queries.
  - Owner-only writes and their private responses, claiming, pricing and staff previews retain scoped owner/staff queries. A tag edit can return its result to the owner before publication without exposing that look through public GET.

- **Small supporting changes under the standing rule:**
  - apps/common/renderers.py, apps/common/schema.py and apps/web/site.py: the initial null-preservation changes have been removed in response to review point 5. These files now match master.
  - apps/common/uploads.py: the shared URL helper accepts a request-free call from the new page-building functions; the existing upload endpoint still uses its request.
  - apps/profiles/serializers.py: only the now-authorized reserved-domain guard. The regression test covers the profile PATCH endpoint.
  - config/urls.py: one new claim path and its supporting import; existing paths are unchanged.
  - jest.config.js: replaced the existing website exclusion with its portable form. On Windows the old root-path expression failed to exclude Vitest files from Jest. All 47 app suites and all 17 website suites were run under their intended runners; no assertions or test timeouts changed.

- **Unsure about:** No unanswered implementation questions. The review settled publication: claiming now puts the page live in the handover transaction. Schema generation reports seven choice-name/operation-name warnings and zero errors.
- **Skipped, and why:** No acceptance tests skipped. Staff UI, website UI and app UI remain for their separate tasks; only their generated schemas changed. No test was found that requires the backend route reservations to equal the app's NOT_HANDLES list; the app source was not edited.


### Review fixes for pull request #51

1. Removed `@public` from the Make it yours page. The shell test now requires `Cache-Control` to equal `no-store` exactly, as well as the existing no-referrer and noindex checks.
2. Claiming sets `published=True` in the same transaction as ownership changes. A new test claims a draft with no staff yes, then reads the stylist page and look publicly. The private-owner tag-edit test now explicitly unpublishes after claiming, preserving its original private-read assertions.
3. Staff can correct a draft Instagram handle using the creation rules. All three saved handle fields change together. Tests cover normalisation, reserved, invalid and taken handles, and the exact live-page refusal. Removed the owner-side refusal; a separate test proves the stylist can edit Instagram after claiming while still Featured.
4. Removed the transaction and profile lock from `tell_waitlist`. Processed ids are deleted once per 500 rows, with one final partial batch. A 1,001-client test proves three DELETE queries and no profile locking. The existing real-notification repeat-run test still proves no duplicate delivery records.
5. Removed the custom renderer, null-preservation schema exception and configurable seed renderer. Signed-out responses omit `waitlistJoined`; signed-in responses send true or false. Tests cover all three states and signed-out HTML. Regenerated OpenAPI and both clients: the field is now an optional boolean.
6. Rooted the Jest website exclusion at `<rootDir>` and matched both path separators. Jest also mishandles an unescaped Windows root containing `.codex`, so the config resolves and escapes the root before Jest normalises it. A regression test evaluates the config with Unix and Windows roots, including an ancestor named `web` and a dot folder, and proves app tests remain included. The resolved Windows Jest configuration was also checked directly against a website path.
7. `open_if_ready` returns before starting a transaction or taking a lock for a profile whose Featured flag is false. A regression test requires zero database queries and no queued notification task for an ordinary stylist.
8. Staff look upload and owner look PATCH refuse more than three styles with exactly `Pick up to 3 styles`. A regression test checks both endpoints and proves the rejected upload creates no media/look and the rejected PATCH changes neither styles nor hair type.
9. The private screenshot of the yes belongs to the staff uploader. Claim coverage proves it stays with staff while the stylist's media move. A separate endpoint test uses an uploader different from `added_by`, then proves taking down the page deletes the screenshot row and files while keeping the staff account.

Review checks:

- `python -m pytest -q -p no:cacheprovider --create-db`: passed for the entire backend, all 528 tests. Rerun after the final Jest configuration and regression-test update; every whole-suite run used `--create-db`.
- `python manage.py makemigrations --check --dry-run` with test settings: passed, no changes detected.
- Focused `python -m pytest -q -p no:cacheprovider --create-db tests/test_featured.py`: passed, 55 tests. The first run exposed a fixture mistake and a Windows text-encoding mistake in the edited test file; both were corrected without changing the expected behavior.
- `python manage.py spectacular --file ../openapi.yaml`: passed, seven existing warnings and zero errors.
- Root and website `npm run api:types && git diff --exit-code src/shared/lib/api/schema.d.ts`: passed after staging the regenerated contracts and rerunning each generator; no additional drift. Neither client was edited by hand.
- App `npx tsc --noEmit` and `npm run lint`: passed; lint retains 108 existing warnings and zero errors.
- App `npx jest --ci --cacheDirectory <task temporary cache>`: passed, all 47 suites and 232 tests, exit 0. The first review run included website files because Jest mishandled the Windows dot-folder root; resolving and escaping the root fixed that. The final run still reports the existing worker open-handle warning.
- Website `npx tsc --noEmit`, `npm run lint`, `npm test -- --maxWorkers=1` and `npx vite build`: passed; all 17 files and 83 tests pass with unchanged assertions and timeouts.
- `python -m ruff check apps/stylists/featured.py apps/staff/views/featured.py tests/test_featured.py`: passed.
- `git diff --check` and `git diff --cached --check`: passed.
- Dependency installation commands were not rerun in this review round: the existing installations were reused, and no dependency or lockfile changed. No acceptance test was skipped or weakened. Status remains `review`.
