---
id: 008
slug: look-photos-web-posting
assignee: sonnet # codex | gemini | sonnet | haiku | opus
status: ready # draft | ready | in-progress | review | blocked | done
branch: agent/sonnet/008-look-photos-web-posting
depends_on: [005, 006]
---

# Website: post several photos as one look

## Why

Yaw posted 3 photos on the website and got 3 separate looks. Task 005 taught
the website to **show** multi-photo looks, but "Post your work"
(`PostWorkScreen`) still turns every photo into its own look. That batch mode
is useful for a stylist's back catalogue, so it stays. This task adds a second
way to post: several photos (up to 5) as **one** look, the same as the app.
It appears only for people the `multi_photo_looks` switch is on for (task
006); the server already refuses several photos for anyone else.

## Scope

Files this task may change:

- `web/src/shared/lib/features.ts` (new) and `web/src/shared/lib/__tests__/features.test.ts` (new)
- `web/src/features/looks/components/PostWorkScreen.tsx` and `PostWork.css.ts`
- `web/src/features/looks/hooks.ts` (`usePostWork` only, or a new hook next to it)
- `web/src/test/__tests__/studio.test.tsx` (new tests only)
- `tasks/008-look-photos-web-posting.md` (`status` and the report only)

Out of scope (do not touch): the backend, the app (`src/`, `app/`),
`schema.d.ts`, `LookPhotos.tsx` and the look page, and the colours or theme.

## What to do

1. **Switches on the website (`web/src/shared/lib/features.ts`).**
   - `useFeature(key: 'multi_photo_looks' | 'video_posts')` reads
     `GET /api/features/` with the shared `api` client. The response is
     `{"features": {"multi_photo_looks": true, ...}}`. The keys arrive exactly
     like that, in snake_case, so read them as they are.
   - Use React Query with `staleTime` 60 s. Refetch when the signed-in account
     changes: put the account id in the query key, or invalidate on sign-in
     and sign-out, copying how other account-scoped queries on the website do it.
   - Fail closed: `false` while loading, on an error, and for a key the
     server didn't send.
   - Import nothing from `web/src/features/`.
2. **Choosing how to post (`PostWorkScreen.tsx`).** When
   `useFeature('multi_photo_looks')` is on and she has 2 or more photos, show
   a two-option choice above the photos (use the existing `SegmentedControl`
   or radio pattern in `web/src/shared/ui`, whichever the site already uses):
   - **"Each photo as its own look"**, the default. This is today's behaviour,
     unchanged.
   - **"One look with these photos"**. Up to 5 photos.
   With the switch off, or with one photo, the screen is exactly as it is now.
3. **One-look mode.**
   - At most 5 photos. With more than 5 chosen, the choice stays enabled, but
     picking it shows a plain note ("A look holds up to 5 photos. Remove some
     to post them together.") and Post stays disabled until 5 or fewer are left.
     Never drop photos silently.
   - One shared Style (required), Service and Caption for the whole look,
     replacing the per-photo fields while this mode is on. When she switches
     into one-look mode, start these from the first photo's values.
   - The photos show in posting order. The first is labelled "Cover". Each
     other photo has "Move earlier" and "Move later" buttons (icon buttons
     with those `aria-label`s), so the order can be changed with a keyboard
     too. Remove still works.
   - The Post button reads "Post 1 look with 3 photos" (with the real count).
4. **Posting one look (`hooks.ts`).**
   - Upload the photos with `uploadPhoto(file, 'look')`, **at most 3 at a
     time**, keeping her order. Retry a failed upload once.
   - Then make one `postLook` call with `photoUris` (the uploaded `uri`s, in
     order), the shared style, service and caption, and `visibility: 'public'`.
   - If "Also show it on my page" is ticked, add **only the cover** to her
     portfolio with `lookId`, as today.
   - Progress: one bar for the whole look (photos uploaded out of the total,
     then done). If an upload fails twice, post nothing, say which photo
     failed ("Photo 2 didn’t upload. Try again."), and keep all her photos.
     A retry re-sends only the photos that didn't upload (keep the uploaded
     results while the screen is open).
   - If the server refuses (for example "Posting several photos in one look
     isn't open yet"), show its message and keep her photos.
   - Afterwards, invalidate the same queries `usePostWork` invalidates now.
5. **Tests** in `studio.test.tsx` and `features.test.ts`:
   - `useFeature` is false before load, on error and for a missing key, and
     true when the server says so.
   - With the switch off, there's no choice and posting 3 photos makes 3
     `postLook` calls (today's behaviour).
   - With the switch on, picking "One look with these photos" and posting 3
     makes **one** `postLook` call whose `photoUris` follow the order on
     screen after a "Move earlier", and adds only the cover to the portfolio.
   - Uploads never run more than 3 at a time (mock `uploadPhoto` with
     promises you resolve yourself, and check how many have started).
   - 6 photos in one-look mode disable Post and show the 5-photo note.

## Acceptance criteria

- [ ] With the switch off, "Post your work" looks and behaves exactly as before.
- [ ] With the switch on, 2 to 5 photos can be posted as one look, which then shows as one look with swipeable photos on the looks page.
- [ ] The order on screen, including after moving photos, is the order posted, and the first is the cover.
- [ ] Uploads run at most 3 at a time; a failed upload posts nothing and a retry re-sends only what failed.
- [ ] `useFeature` fails closed (tests), and `features.ts` imports nothing from `web/src/features/`.
- [ ] No files outside **Scope** are changed (`git diff --name-only origin/master`).
- [ ] New behaviour is covered by the tests named above.

## Checks

From `web/`:

```
npm ci && npx tsc --noEmit && npm run lint && npm test && npx vite build
```

Then, from the repo root:

```
git diff --name-only origin/master
```

## Report to the lead

_Filled in by the assignee when it sets `status: review` or `blocked`._

- **Changed:**
- **Checks run:** (each command and its result; "not run" if you didn't)
- **Unsure about:**
- **Skipped, and why:**
- **Question for the lead:** (only if `blocked`)
