---
id: 003
slug: look-photos-backend
assignee: codex # codex | gemini | sonnet | haiku | opus
status: review # draft | ready | in-progress | review | blocked | done
branch: agent/codex/003-look-photos-backend
depends_on: []
---

# Backend: a look can hold up to 5 photos, in order

## Why

Yaw wants people to post up to 5 photos in one look and swipe through them, as
on Instagram and TikTok. Today a look holds exactly one photo. This task stores
and serves the photos; the app (task 004) and website (task 005) show them.

## Scope

Files this task may change:

- `backend/apps/looks/models.py`, `backend/apps/looks/migrations/` (new files only)
- `backend/apps/looks/views.py` (`create_look`, `_looks` and the `LookCreateRequestSerializer` it uses)
- `backend/apps/looks/serializers.py` (`present_looks` and the response serializer for a look)
- `backend/apps/looks/admin.py` (an inline for the photos)
- `backend/apps/common/signals.py` (delete each photo's files when its look goes)
- `backend/apps/staff/review.py` (moderators see every photo of a reported look)
- `backend/apps/web/seo.py` (a look page's structured data lists every photo)
- `backend/tests/test_looks.py`, `backend/tests/conftest.py` (fixtures only)
- `openapi.yaml`, `src/shared/lib/api/schema.d.ts`, `web/src/shared/lib/api/schema.d.ts` (regenerated, never hand-edited)
- `tasks/003-look-photos-backend.md` (`status` and the report only)

Out of scope (do not touch): the app (`src/`, `app/`) and website (`web/src/`)
code beyond the regenerated `schema.d.ts` files; feature switches; video.

## What to do

1. **Model.** Add `LookPhoto` in `backend/apps/looks/models.py`: `look` (FK to
   `Look`, `on_delete=CASCADE`, `related_name="photos"`), `position`
   (`PositiveSmallIntegerField`, 0 to 4), `photo_uri`, `thumb_uri`, `feed_uri`
   (same field types as on `Look`), `aspect` (`FloatField`, default 1),
   `created_at`. Unique on (`look`, `position`), ordered by `position`, table
   `looks_look_photo`. Keep `Look.photo_uri`, `thumb_uri`, `feed_uri` and
   `photo_aspect` exactly as they are: they always hold the **first** photo
   (the cover), so every existing reader (feed tiles, bookings, collections,
   SEO, staff, older app versions) keeps working untouched.
2. **Migration with backfill.** A schema migration plus a data migration that
   creates one `LookPhoto` at position 0 for every existing look, copied from
   its cover fields. Use `bulk_create` in batches of 1000 and give it a
   reverse that deletes the rows. Run `makemigrations --check` afterwards.
3. **Create.** `create_look` accepts `photo_uris`: a list of 1 to 5 upload
   addresses, in the order she wants them shown. The old single `photo_uri` is
   still accepted, as a list of one, so installed apps keep posting. Rules:
   - Every address goes through `own_media(user, uri)`, exactly as the single
     photo does today. Any one that fails means 400 `"A look needs a photo"`
     for an empty list, or `"That photo isn't one of yours"` for a foreign one.
   - More than 5 is 400 `"Up to 5 photos in a look"`. Never trim silently.
   - The same upload twice is 400 `"That photo is in this look twice"`.
   - Sizes and aspect come from each `Media` record, never from what was sent
     (copy how the cover's `photo_uri`, `thumb_uri`, `feed_uri` and
     `photo_aspect` are built now).
   - Create the look, its cover fields (from photo 0) and all `LookPhoto` rows
     inside the existing `transaction.atomic()`, with one `bulk_create`.
   - Add `photo_uris` to `LookCreateRequestSerializer` so it is in the schema.
4. **Read.** `present_looks` adds `photos`: a list of
   `{"uri", "thumb_uri", "feed_uri", "aspect"}` in position order (null for an
   empty thumb or feed, like the cover fields). Load them with
   `Prefetch("photos", queryset=LookPhoto.objects.order_by("position"))` in
   `_looks()` and anywhere else that builds looks for `present_looks`, so a
   page of any size costs exactly one extra query. If a look somehow has no
   rows, `photos` is a list of one built from its cover fields. Add `photos`
   to the response serializer so the schema and typed clients carry it.
5. **Deleting.** Add a `post_delete` receiver for `looks.LookPhoto` in
   `backend/apps/common/signals.py` that calls
   `delete_media_for(instance.photo_uri, instance.look.author_id)`, copying
   `delete_look_media`. Make sure it still works during a cascade from a
   deleted look or a deleted account (read the author id without an extra
   query that can fail, for example by keeping `look.author_id` on the photo
   via `select_related` or storing it). Deleting twice must be harmless.
6. **Moderation.** In `backend/apps/staff/review.py`, when a report's target
   is a look, `preview()` puts every photo's thumb (or full) address into
   `data["images"]`, in order, using `image()`'s same safety rules for each.
   A reviewer must see all 5 photos, not only the cover.
7. **SEO.** In `backend/apps/web/seo.py`, a look page's structured data lists
   every photo (`"image"` becomes a list of feed or full addresses when there is
   more than one). The page's main image and `og:image` stay the cover.
8. **Admin.** A read-only `TabularInline` of `LookPhoto` on the look admin.
9. Regenerate `openapi.yaml`
   (`python manage.py spectacular --file ../openapi.yaml` from `backend/`),
   then `npm run api:types` in the repo root and in `web/`.

## Acceptance criteria

- [ ] Posting with `photo_uris` of 1, 3 and 5 of her own uploads creates a look whose `photos` come back in the order sent, with the cover fields equal to photo 1.
- [ ] Posting with only the old `photo_uri` still works and returns `photos` of length 1.
- [ ] 6 photos, a duplicate, an empty list, and someone else's upload are each refused with the message above, and nothing is created (count looks before and after).
- [ ] The feed, a look's page and "my looks" all return `photos`; a test using `django_assert_max_num_queries` (or `django_assert_num_queries`) shows a feed page of 12 multi-photo looks costs no more queries than a page of 1.
- [ ] Deleting a look with 3 photos deletes all 3 `Media` rows and their files; deleting the author's account does the same.
- [ ] A staff report preview for a 3-photo look lists all 3 images.
- [ ] The migration backfills one photo per existing look and reverses cleanly.
- [ ] `openapi.yaml` and both `schema.d.ts` files are regenerated and `git diff --exit-code` is clean after `npm run api:types`.
- [ ] New behaviour is covered by tests in `backend/tests/test_looks.py`.

## Checks

From `backend/`:

```
pip install -r requirements-dev.txt
DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run
python -m pytest -q -p no:cacheprovider --create-db
```

From the repo root:

```
npm run api:types && git diff --exit-code src/shared/lib/api/schema.d.ts
```

## Report to the lead

- **Changed:** Implemented ordered look photos (1-5), legacy single-photo posting, upload ownership and duplicate checks, cover fields from the first upload, and atomic photo creation. Added the photo model, position constraints, schema migration and reversible backfill in batches of 1000. Reads prefetch photos with a cover fallback; moderation previews apply existing image safety and access checks; SEO lists all photos while keeping the cover; admin has a read-only inline. Photo deletion caches the author before cascades and removes each upload and its files. Added tests and regenerated OpenAPI and both typed clients.
- **Review addressed:** The lead's review explicitly permitted the photo prefetch in `backend/apps/web/views.py` and `LookCreateRequestSerializer` in serializers.py. Those were the only scope additions used. The subsequent SEO review is addressed below; no additional minor items were listed.
- **Checks passed:** `DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run` reported no changes. `python manage.py check` reported no issues. OpenAPI generation completed with zero errors and seven enum/operation-name warnings. `npm run api:types` succeeded in the root and web; repeating each produced byte-identical files. `git diff --check` passed.
- **Tests:** The full suite passed: **462 passed in 32.95s**, including ordered posts of 1/3/5 photos, legacy posting, invalid inputs creating nothing, cover fallback, constant feed queries for 1 versus 12 multi-photo looks, direct/ look/account deletion with file checks, safe permission-aware moderation previews, SEO and the 1001-look migration backfill/reverse. The exact required `python -m pytest -q -p no:cacheprovider --create-db` was run first and did not pass: pytest temporary-directory creation hit `PermissionError: [WinError 5] Access is denied`. Initial new-test mistakes were fixed. Changing TEMP/TMP alone did not fix the Windows mode-0700 directories. The successful full run used `pytest.main` with the same checks, a workspace basetemp, normal verbose summary, and a process-local `os.mkdir` wrapper changing mode 0700 to 0777 only for directories inside this workspace. No tests or repository fixture behavior were weakened or skipped.
- **Generated-type check:** On this review revision, `npm run api:types` followed by `git diff --exit-code src/shared/lib/api/schema.d.ts` passed (exit 0).
- **Known limit:** The installed openapi-typescript 7.13 generator produced tuple lengths 0-4 for OpenAPI minItems=1/maxItems=5. The request serializer therefore documents the one-to-five limit without numeric schema bounds; the endpoint enforces it and tests cover it. A shortcut comment records when to restore the schema bounds. No dependency was added or updated.
- **Skipped:** Dependency installation, as directed by the review. Committing, as the review says the runner commits. `.agent-review.md` was not modified or committed. App and website UI changes remain outside this task.
- **Review revision:** Removed the nested `image` property from the cover ImageObject. Each extra photo now has its own ImageObject with ordered `#image-2`, `#image-3`, etc. identifiers, its full content URL and thumbnail/feed/full fallback, and the cover metadata. Updated the regression test to inspect rendered page JSON-LD for zero, one and three photo rows, asserting the complete original cover object, ordered extra objects, unchanged main image and unchanged og:image. Only SEO, its scoped test and this report changed.
- **Revision checks:** `DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run` passed with no changes; root `npm run api:types` and its literal git diff check passed. Dependency installation remains skipped per the lead. No API contract changed, so OpenAPI and web client regeneration were not repeated.
- **Revision test results:** The exact `python -m pytest -q -p no:cacheprovider --create-db` failed with 33 setup errors: `PermissionError: [WinError 5] Access is denied: C:\Users\yawop\AppData\Local\Temp\pytest-of-yawop`. The full rerun passed: **462 passed in 29.47s**. From `backend/`, a PowerShell here-string was piped to `python -`; it invoked `pytest.main(['-o', 'addopts=', '-q', '-p', 'no:cacheprovider', '--create-db', '--basetemp', str(base)])`. `base` was `Path(tempfile.gettempdir()) / ('yasante-review-' + uuid.uuid4().hex)`, resolving to `C:\Users\yawop\AppData\Local\Temp\yasante-review-138b66cb6c16487b9813fe751ceebbb9`. A process-local `os.mkdir` wrapper replaced mode 0700 with 0777 only when `Path(path).resolve().is_relative_to(base)`; all other calls used the original mode and arguments. No workaround script or test artifacts were written into the repository; no tests were skipped or weakened. `git diff --check` passed. Status stays `review`; `.agent-review.md` is untouched and uncommitted. No unresolved review items remain.
