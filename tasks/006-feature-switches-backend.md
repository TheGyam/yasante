---
id: 006
slug: feature-switches-backend
assignee: codex # codex | gemini | sonnet | haiku | opus
status: blocked # draft | ready | in-progress | review | blocked | done
branch: agent/codex/006-feature-switches-backend
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
pip install -r requirements-dev.txt
DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run
python -m pytest -q -p no:cacheprovider --create-db
```

From the repo root:

```
npm run api:types && git diff --exit-code src/shared/lib/api/schema.d.ts
```

## Report to the lead

- **Changed:** Only this task's status and report. Read the task, AGENTS.md,
  ARCHITECTURE.md and the affected code; confirmed the assigned branch and a
  clean starting worktree. No feature code was written.
- **Checks run:** On the unchanged code:
  - `pip install -r requirements-dev.txt`: failed; no matching distribution
    for `pytest-cov>=6.0,<7`. The active Python environment has no pytest-cov,
    and `PIP_NO_INDEX` is configured.
  - `DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run`:
    passed, "No changes detected" (environment variable set with PowerShell).
  - `python -m pytest -q -p no:cacheprovider --create-db`: failed with 33
    setup errors: access denied to `C:/Users/yawop/AppData/Local/Temp/pytest-of-yawop`.
  - `npm run api:types && git diff --exit-code src/shared/lib/api/schema.d.ts`:
    passed (commands sequenced conditionally in PowerShell). Generation made
    no content changes; the generated file was restored to its original bytes.
- **Unsure about:** Whether a prepared Python environment is available for this
  worktree. The current Python and pip resolve to `Kalon/backend/venv`.
- **Skipped, and why:** Implementation and schema regeneration for the new
  endpoint were not started because the required environment checks failed.
  Git also cannot create `Kalon/.git/worktrees/agent-codex-006-feature-switches-backend/index.lock`
  (permission denied), so the required report commit is blocked by workspace
  permissions. No dependencies, shared fixtures or permission settings changed.
- **Question for the lead:** Please provide an environment with the required
  development dependencies and writable test temporary storage, and allow Git
  to write this worktree's metadata, then return this task to ready.
