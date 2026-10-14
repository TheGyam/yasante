---
id: 007
slug: feature-switches-app
assignee: sonnet # codex | gemini | sonnet | haiku | opus
status: ready # draft | ready | in-progress | review | blocked | done
branch: agent/sonnet/007-feature-switches-app
depends_on: [004, 006]
---

# App: read the feature switches, and open multi-photo posting only where it's switched on

## Why

Task 006 added switches Yaw turns on from the admin (`GET /api/features/`).
The app needs to read them so a feature appears or hides without an app
update. The first one gates posting several photos in one look (task 004), so
staff can test it before everyone gets it.

## Scope

Files this task may change:

- `src/shared/config/features.ts` (new) and `src/shared/config/__tests__/features.test.ts` (new)
- `app/_layout.tsx`, only to make sure the features query is persisted and refreshed (step 2)
- `app/looks/new.tsx`, only the photo limit (step 3)
- `tasks/007-feature-switches-app.md` (`status` and the report only)

Out of scope (do not touch): the backend, `web/`, how looks are shown (anyone
can always **see** a multi-photo look; only posting is switched), video.

## What to do

1. **`src/shared/config/features.ts`.**
   - `type FeatureKey = 'multi_photo_looks' | 'video_posts'`.
   - `featuresQuery`: React Query options for `GET /api/features/` with the
     shared `apiClient`, key `['features']`, `staleTime` 60 s, `gcTime` 7 days,
     `refetchOnWindowFocus: true` (the app's focus manager covers coming back
     to the foreground), and a refetch when the signed-in account changes
     (include the user id in the key, or invalidate on sign-in and sign-out,
     following how other account-scoped queries do it).
   - `useFeature(key)`: `true` only when the latest known answer says so.
     While nothing has loaded yet, or on an error, it is `false`. Fail closed.
   - It must not import from `src/features/` (rule 2 in `ARCHITECTURE.md`).
2. **Persisting.** Check `persistOptions` in `app/_layout.tsx`. If it only
   persists some queries, add `['features']` so the last known switches are
   there at the next cold start, even offline. Prefetch the query once at
   startup so the composer doesn't wait for it.
3. **Gate.** In `app/looks/new.tsx`, the photo limit is
   `useFeature('multi_photo_looks') ? 5 : 1`. With a limit of 1 the composer
   behaves exactly as it did before task 004: one photo, "Choose a different
   photo", no strip, no reordering. If the switch turns off while she has
   several chosen, keep the first and tell her plainly: "Posting several
   photos isn't open yet, so we kept your first one."
4. **Tests.** `useFeature` is `false` before load, on error and for unknown
   keys, and `true` when the server says so; the composer limit follows the
   switch (mock the hook).

## Acceptance criteria

- [ ] With the switch off, posting allows one photo and looks as it did before task 004.
- [ ] With the switch on, up to 5 photos can be posted.
- [ ] The answer survives a cold start offline (persisted), and a change in the admin reaches the app within about a minute of opening it or bringing it back to the front.
- [ ] `useFeature` fails closed (tests).
- [ ] `src/shared/config/features.ts` imports nothing from `src/features/`.
- [ ] New behaviour is covered by tests.

## Checks

```
npx tsc --noEmit
npm run lint
npx jest --ci
```

## Report to the lead

_Filled in by the assignee when it sets `status: review` or `blocked`._

- **Changed:**
- **Checks run:** (each command and its result; "not run" if you didn't)
- **Unsure about:**
- **Skipped, and why:**
- **Question for the lead:** (only if `blocked`)
