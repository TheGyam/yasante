---
id: 004
slug: look-photos-app
assignee: sonnet # codex | gemini | sonnet | haiku | opus
status: ready # draft | ready | in-progress | review | blocked | done
branch: agent/sonnet/004-look-photos-app
depends_on: [003]
---

# App: post up to 5 photos in a look, and swipe through them

## Why

Yaw wants people to post up to 5 photos in one look and swipe sideways through
them, as on Instagram and TikTok. Task 003 made the backend store and return
them (`photos` on every look; `photo_uris` when posting). This task is the app.

## Scope

Files this task may change:

- `src/features/looks/types.ts`, `api.ts`, `hooks.ts`, `index.ts`
- `src/features/looks/components/` (new `LookPhotos.tsx` and its test; edits to `LookCard.tsx`, `usePhotoTaps.tsx`, `index.ts`)
- `src/features/looks/heroTransition.ts`, only if opening at the current photo needs it
- `app/looks/new.tsx` (the composer)
- `app/looks/[id].tsx`, only where it shows the look's photo
- `src/features/looks/__tests__/` (new tests)
- `tasks/004-look-photos-app.md` (`status` and the report only)

Out of scope (do not touch): the backend, `web/`, `src/shared/` (use what is
there: `useImagePicker().pickManyFromLibrary`, `uploadImage`, `RemoteImage`),
feature switches, video. Never edit `schema.d.ts` by hand.

## What to do

1. **Types.** Add `photos: LookPhoto[]` to `Look`, with
   `LookPhoto = { uri: string; thumbUri?: string; feedUri?: string; aspect?: number }`.
   Add a helper `lookPhotos(look)` that returns `look.photos` when it has any,
   else one photo built from `photoUri`/`thumbUri`/`feedUri`/`photoAspect`, so
   cached and older responses still render. In `LookDraft`, replace
   `photoUri: string` with `photoUris: string[]` (1 to 5, in order).
2. **Posting (`api.ts`).** Upload the draft's photos **in parallel, at most 3 at
   a time**, keeping their order, then `POST /api/looks/` with `photoUris` (the
   uploaded addresses, in order). Report progress per photo through an
   optional callback. If one upload fails, retry it once; if it fails again,
   throw a clear error and post nothing. Keep uploads that worked so a
   retry from the composer only re-sends the failed ones (keep a map of local
   uri to uploaded address for the life of the composer).
3. **Composer (`app/looks/new.tsx`).**
   - "Choose photos" opens the library with `pickManyFromLibrary(5 - chosen)`
     so the picker itself stops at 5. The stylist's own portfolio strip lets
     her tap up to 5 too, with a number badge on each showing its order.
   - Show the chosen photos as a horizontal strip of thumbnails with a
     "1/5"-style count. Each has a remove button (44pt target). Long-press and
     drag to reorder (use `react-native-gesture-handler` and
     `react-native-reanimated`, already installed). The first is the cover,
     labelled "Cover".
   - When she has 5, the add button reads "5 of 5" and is disabled.
   - While posting, show one progress bar for the whole post (photos done /
     total) and keep the Post button disabled. On failure, say which photo
     failed in plain words and offer "Try again".
   - Keep everything else in the composer as it is (styles, caption, tagging).
4. **Swiping (`components/LookPhotos.tsx`).** A new component used by
   `LookCard` (feed and grid-to-page) and the look page:
   - A horizontal, paging list of the photos (`FlatList` with
     `pagingEnabled`, `horizontal`, `showsHorizontalScrollIndicator={false}`,
     `windowSize={3}`, `initialNumToRender={1}`, `getItemLayout`). One photo
     renders exactly as today, with no list around it.
   - Every photo is shown in the **first photo's frame** (its aspect, clamped
     the way the card clamps it today), with `contentFit="cover"`, so the card
     never jumps height while swiping.
   - Dots under the photo (current one in the accent colour) and a small
     "2/5" counter in the top-right corner that fades out 1.5 s after the last
     swipe. Neither shows for a single photo.
   - When photo n is on screen, prefetch photo n+1's feed size with
     `Image.prefetch` from `expo-image`.
   - Use the feed size (`feedUri`) in feeds and the full size on the look page,
     falling back as the code does today.
   - Accessibility: each photo is labelled "Photo 2 of 5"; the list is an
     `adjustable` element so a screen reader can swipe with up/down.
   - Inside the vertical feed, a sideways swipe moves the photos and a
     vertical swipe still scrolls the feed.
5. **Taps.** Double-tap still likes on any photo, and a single tap still opens
   the look; update `usePhotoTaps` only as far as needed. Opening the look page
   starts at the photo she was looking at (pass the index through the hero
   transition or route params). The hero transition still grows from the photo
   on screen.
6. **Grid tiles.** Where looks show as small tiles (`LookTile.tsx` and the
   profile grids that use it), add a small "stacked photos" icon in the
   top-right corner of tiles with more than one photo. Tiles still show only
   the cover.

## Acceptance criteria

- [ ] Picking 7 photos is impossible: the picker stops at 5, and the strip shows 5 of 5.
- [ ] Removing and reordering in the composer changes the order the post is sent in (covered by a test of the draft-to-request mapping).
- [ ] Uploads run at most 3 at a time and the request lists `photoUris` in her order (a test with a mocked `uploadImage` checks concurrency and order).
- [ ] A failed upload posts nothing, names the failed photo, and "Try again" re-sends only that one.
- [ ] A look with one photo renders exactly as before (no dots, no counter, no list).
- [ ] A look with 3 photos shows dots and a counter, keeps the first photo's height on every swipe, and double-tap likes on photo 3.
- [ ] Tiles of multi-photo looks show the stacked icon.
- [ ] `lookPhotos()` falls back to the cover for a look with no `photos` (tested).
- [ ] `ARCHITECTURE.md` rules hold: other features import only from `@/features/looks`.
- [ ] New behaviour is covered by tests in `src/features/looks/__tests__/`.

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
