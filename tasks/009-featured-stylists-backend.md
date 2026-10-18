---
id: 009
slug: featured-stylists-backend
assignee: codex # codex | gemini | sonnet | haiku | opus
status: blocked # draft | ready | in-progress | review | blocked | done
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
- `backend/apps/bookings/views.py`: only the refusals in step 9
- `backend/apps/accounts/views.py`, `backend/apps/accounts/serializers.py`: only the stand-in refusals in step 3
- `backend/apps/common/uploads.py`: only the refactor in step 5
- `backend/apps/common/identifier_policy.json`: add `claim` and `finish` to `routes`
- `backend/apps/common/metrics.py`, `backend/apps/staff/insights.py`: only the exclusions in step 12
- `backend/apps/staff/views/featured.py` (new), `backend/apps/staff/urls.py` (new paths only), `backend/apps/staff/names.py` (one entry)
- `backend/apps/web/views.py`, `backend/apps/web/seo.py`, `backend/apps/web/urls.py`: only step 13
- `backend/config/settings/base.py`: new throttle scopes only
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

- **Changed:** Pulled master into the assigned branch with `git pull --no-rebase origin master`. The merge completed without conflicts. Master's clarification permits new path entries in `backend/config/urls.py` and requires HTTP 200 with a joined boolean for both waitlist operations. Set status to in-progress, then back to blocked after reading the existing look and preview paths. No application code changed.
- **Checks run:**
  - `git pull --no-rebase origin master`: passed; merged master's task clarification without conflicts.
  - `git diff --check`: passed for this report.
  - `DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run`: not run; stopped before implementation.
  - `python -m pytest -q -p no:cacheprovider --create-db`: not run; stopped before implementation.
  - `npm run api:types && git diff --exit-code src/shared/lib/api/schema.d.ts`: not run; no API changes.
  - `python manage.py spectacular --file ../openapi.yaml`: not run; no API changes.
  - `npm run api:types` in `web/`: not run; no API changes.
- **Every `published=True` use and booking entry point, and what you did with each:** Not fully audited; stopped at the publishing and preview conflicts below. No entry points changed.
- **Unsure about:** How draft looks stay private until staff put the page live, and how the private preview obtains its photos.
- **Skipped, and why:** Implementation, tests, schema generation, push and draft pull request. The brief requires a blocked report, a commit and a stop when the plan and task disagree or work cannot be done within scope.
- **Question for the lead:**
  - The plan says staff preview privately before putting the page live, at which point its looks appear publicly. Step 2 requires `add_look` to create public looks. Existing `FeedView.get` selects public, live looks without checking the author's profile's `published` flag; `_visible_look` likewise does not check that flag. A new `Look` defaults to `status="live"`. Following step 2 literally therefore exposes draft photos through the feed and look-detail API before staff put the page live. Scope allows only `LookDetailView.patch` changes in that file. Should Scope also allow the public look read paths to exclude looks belonging to a page that is not live? Alternatively, should draft looks use a different existing visibility/status until `put_live` changes them? Please specify which behavior; `hidden` currently means moderation, and `private` would differ from step 2.
  - The plan requires the private link to show the page as it will look before it is live. Step 6 specifies only `{display_name, handle, avatar_uri, look_count, live, waiting}` for `GET /api/featured/claim/<code>/`, while step 4 keeps the normal page a 404 before it is live. Task 011 explicitly needs a preview strip of look photos from this link, and its scope forbids server changes. May the link response also include preview photos (please specify the response shape), or should there be another authorized preview endpoint? No public draft access should be needed to render this preview.
