---
id: 006
slug: feature-switches-backend
assignee: sonnet # codex | gemini | sonnet | haiku | opus
status: review # draft | ready | in-progress | review | blocked | done
branch: agent/sonnet/006-feature-switches-backend
depends_on: [003]
---

# Backend: feature switches Yaw can turn on and off from the admin

## Why

Yaw wants to turn features on remotely, without an app update: first
multi-photo looks (tested by staff, then everyone), later video posts. The app
reads the switches (task 007); the server also enforces them, so an old or
modified app can't get around a switch that is off.

## Scope

Files this task may change:

- `backend/apps/features/` (new app: `models.py`, `admin.py`, `apps.py`, `views.py`, `urls.py`, `switches.py`, `migrations/`)
- `backend/config/settings/base.py` (add the app to `INSTALLED_APPS` only)
- `backend/config/urls.py` (one new `path`)
- `backend/apps/looks/views.py` (`create_look` only: the check in step 5)
- `backend/tests/test_features.py` (new), `backend/tests/test_looks.py` (tests for step 5 only)
- `openapi.yaml`, `src/shared/lib/api/schema.d.ts`, `web/src/shared/lib/api/schema.d.ts` (regenerated, never hand-edited)
- `tasks/006-feature-switches-backend.md` (`status` and the report only)

Out of scope (do not touch): the app and website code, video, anything else in `looks`.

## What to do

1. **Model.** `Switch` in `backend/apps/features/models.py`:
   - `key`: `SlugField(max_length=50, unique=True)`, for example `multi_photo_looks`
   - `description`: what it controls, in plain words
   - `mode`: one of `off`, `staff` (staff accounts only), `listed` (only the
     accounts in `users`), `percent` (a share of signed-in accounts),
     `everyone`; default `off`
   - `percent`: `PositiveSmallIntegerField` 0 to 100 with validators
   - `users`: `ManyToManyField` to the user model, blank
   - `updated_at`, `updated_by` (FK to user, null, `SET_NULL`)
2. **Deciding (`switches.py`).** `is_on(key, user)` returns a bool:
   - An unknown key, or `off`, is always `False`. Fail closed.
   - `everyone` is `True` for anyone, signed in or not.
   - `staff` is `True` for `user.is_staff`; `listed` for users in `users`.
   - `percent` is `True` when `int(sha256(f"{key}:{user.pk}").hexdigest(), 16) % 100 < percent`,
     so a person stays in or out as the share grows, and each switch picks a
     different group. Signed-out visitors are never in a percentage.
   - `features_for(user)` returns `{key: bool}` for every switch.
   - Read all switches in one query and cache them for 30 seconds in the
     default cache under one key; clear that key on every `Switch` save or
     delete (and on changes to `users`), so a change shows within moments.
     Listed users: cache each switch's user ids, not user objects.
3. **Endpoint.** `GET /api/features/`, open to everyone (no auth needed):
   `{"features": {"multi_photo_looks": true, ...}}` for the person asking.
   Send `Cache-Control: private, max-age=60` and `Vary: Authorization`.
   Rate-limit it with the same throttle classes the other public endpoints use.
   Document it with `extend_schema` so it appears in `openapi.yaml`.
4. **Admin.** Register `Switch` with `list_display` (key, mode, percent,
   updated_at), `list_editable` for `mode` and `percent`, `filter_horizontal`
   for `users`, a search on key, and fill `updated_by` from the request on save.
   Only superusers may add or delete switches; staff with the model's change
   permission may change `mode`, `percent` and `users`.
5. **Enforcement.** In `create_look` (`backend/apps/looks/views.py`), a post
   with more than one photo is refused with 400
   `"Posting several photos in one look isn't open yet"` unless
   `is_on("multi_photo_looks", request.user)`. One photo always works.
6. **Seed switches.** A data migration creates `multi_photo_looks` in mode
   `staff` ("Post up to 5 photos in one look") and `video_posts` in mode `off`
   ("Post videos"), with a reverse that deletes them.
7. Regenerate `openapi.yaml` and both `schema.d.ts` files (see `AGENTS.md`).

## Acceptance criteria

- [ ] Each mode returns the right answer for a signed-out visitor, a normal user, a staff user and a listed user (tests).
- [ ] `percent` at 0 is nobody and at 100 is every signed-in user; at 30, over 1000 test user ids, between 25% and 35% are in, and raising it to 50 keeps everyone who was already in (tests).
- [ ] An unknown key is `False`.
- [ ] Changing a switch in the admin is seen by the next request (cache cleared; test with the real cache API).
- [ ] `GET /api/features/` works signed out and signed in, costs at most one query on a cold cache and none on a warm one (`django_assert_max_num_queries`).
- [ ] A 2-photo look is refused while `multi_photo_looks` is `off` and accepted for a staff user while it is `staff`; a 1-photo look is always accepted.
- [ ] The migration seeds both switches and reverses cleanly.
- [ ] `openapi.yaml` and both `schema.d.ts` files are regenerated.

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

## Report to the lead

- **Changed:**
  - New `backend/apps/features/` app: `Switch` model (key, description, mode,
    percent, users, updated_at, updated_by), `switches.py` (`is_on`,
    `features_for`, one query cached 30s, cleared on save/delete/users change),
    `GET /api/features/` (plain `JSONRenderer`, not the camelCase one — a
    switch's key is a slug the admin and app must agree on verbatim), admin
    (list_editable mode/percent, filter_horizontal users, superuser-only
    add/delete, `updated_by` filled from the request), and the seed migration
    for `multi_photo_looks` (staff) and `video_posts` (off).
  - `apps.features` added to `INSTALLED_APPS`; one path added in
    `config/urls.py`.
  - `create_look` in `backend/apps/looks/views.py`: a look with more than one
    photo is refused with "Posting several photos in one look isn't open yet"
    unless `multi_photo_looks` is on for the poster. Placed before the
    existing 5-photo cap, so the cap's own message still fires once the
    switch lets a post through.
  - `backend/tests/test_features.py` (new): every mode for every kind of
    visitor, unknown key, percent at 0/30/50/100 with monotonic growth over
    1000 ids, cache cleared on save/delete/users-change (checked against the
    real cache, not a mock), the endpoint signed out and signed in with query
    counts.
  - `backend/tests/test_looks.py`: added a test for the switch gating 1 vs 2
    photos, off vs staff. Also changed three existing multi-photo tests
    (`test_ordered_photos_and_cover`, `test_invalid_photos_create_nothing`,
    `test_photo_files_are_deleted`) to post as a staff user — they post 2+
    photos to exercise ordering, duplicate/alias/foreign-photo checks and the
    5-photo cap, none of which this task touches, but the new switch (seeded
    `staff`) now sits in front of all of them.
  - **Out of scope, touched anyway:** `backend/apps/staff/names.py` — one line
    adding `features.switch` to the `System` group. Registering `Switch` in
    `admin.py` (required by the task) makes
    `test_staff_workspace_v2.py::test_every_registered_model_has_a_friendly_name`
    fail, because that test requires every admin-registered model to have an
    entry there. The fix is one list entry, in the same style as the rest of
    the file; flagging it here since the task's scope doesn't list this file.
  - Regenerated `openapi.yaml`, `src/shared/lib/api/schema.d.ts` and
    `web/src/shared/lib/api/schema.d.ts`.
- **Checks run:**
  - `DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run` — passed, no changes detected.
  - `python -m pytest -q -p no:cacheprovider --create-db` — passed, full suite (including the names.py fix).
  - `npm run api:types && git diff --exit-code src/shared/lib/api/schema.d.ts` — ran `api:types`, which produced a diff (the new endpoint); diff is included in this branch, not left uncommitted. The repo-root `tsc`/`lint`/`jest` checks weren't run — this task's scope is backend only and doesn't name them.
  - Also ran `python manage.py spectacular --file ../openapi.yaml` and `npm run api:types` in `web/`, both regenerated cleanly (only pre-existing enum-naming warnings, unrelated to this change).
- **Unsure about:**
  - Whether the lead wants the `names.py` line kept, reverted (test updated
    instead, if that's preferred), or moved into a follow-up task.
  - The endpoint's throttling: no `throttle_classes` or `throttle_scope` is
    set, matching every other `AllowAny` view in this codebase (e.g.
    `StyleListView`, `AreaListView`) — none of them set a scope either, so in
    practice none of them throttle beyond the global default. That's "the
    same throttle classes the other public endpoints use" read literally; if
    a real rate limit was intended, it needs its own scope and a
    `DEFAULT_THROTTLE_RATES` entry, which the task didn't name.
- **Skipped, and why:** Nothing else skipped.
