---
id: 002
slug: homepage-copy
assignee: gemini # codex | gemini | sonnet | haiku | opus
status: ready # draft | ready | in-progress | review | blocked | done
branch: agent/gemini/002-homepage-copy
depends_on: []
---

# Website: name the hero Nana Ama, drop the spinning badge, open socials in a new tab, say "stylist" not "braider"

## Why

Caleb wants the hero character named Nana Ama, the spinning "Move your cursor" badge
removed, the cursor copy toned down,
Instagram and TikTok to open in a new tab, and the site to stop reading as if
Yasante is only for braids. Yasante is for any textured-hair style and any stylist.

## Scope

Files this task may change:

- `web/src/features/home/components/Hero.tsx`
- `web/src/features/home/components/Hero.css.ts`, only to delete the badge styles (step 1)
- `web/src/shared/ui/SiteFooter.tsx`
- `web/src/features/home/components/LinksScreen.tsx`
- User-facing copy (strings shown on the page, page titles and meta descriptions) in
  `web/src/features/**`, only to replace "braider(s)" wording
- `web/src/test/__tests__/site.test.tsx`, only where a test asserts copy you changed
- `tasks/002-homepage-copy.md` (`status` and the report only)

Out of scope (do not touch):

- The app (`app/`, `src/`), the backend, other styles (`*.css.ts`), images and the hero animation.
- Code comments, identifiers and file names (leave "braider" in comments alone).
- Stylist display names used as sample data, such as "Braids by Ama" (that's a business name).

## What to do

1. **Remove the hero badge** (`Hero.tsx`): delete the whole circular badge, the
   `<div className={styles.badge} aria-hidden>` block with its spinning SVG ring
   (`Move your cursor · She’s looking too ·`) and the arrow inside it. Remove the
   `ArrowUpLeft` import if nothing else uses it. In `Hero.css.ts`, delete the styles
   only the badge used: `badge`, `ring`, `ringText`, `arrow` and the `spin` keyframes.
   Keep `eye`, `pupil` and `desktopOnly` (the eye still uses them).
2. **Hero intro** (`Hero.tsx`, the lede paragraph):
   - `Meet Ama:` becomes `Meet Nana Ama:`.
   - Replace the pointer line `Move your cursor: she’s watching.` (the `hoverOnly`
     span) with `Say hi, she’s already looking your way.`
   - Leave the `touchOnly` line as it is.
   - Update the component's doc comment that says "Ama turns to look" to "Nana Ama".
3. **Social links open in a new tab**: on the Instagram and TikTok `<a>` tags in
   `SiteFooter.tsx`, and on the external links rendered in `LinksScreen.tsx`
   (Instagram and TikTok; internal links to yasante.com pages stay as they are), add
   `target="_blank"` and `rel="noopener noreferrer"`. For LinksScreen, add an
   `external` flag (or equivalent) to the two link entries rather than checking URLs.
4. **"Stylist", not "braider"**, in user-facing copy across `web/src/features/**`. For example:
   - `Book the braider who did it` → `Book the stylist who did it` (`HomeScreen.tsx`)
   - `Braiders in ${name}` → `Stylists in ${name}`; `Braiders based in` → `Stylists based in` (`AreaScreen.tsx`)
   - the `Braiders` section header in `Listing.tsx` → `Stylists`
   - `by braiders on Yasante` → `by stylists on Yasante` (`StyleScreen.tsx`)
   - `from braiders near you` and `the braiders who did it` (`LooksScreen.tsx`)
   - `the braiders’ work` and the `'Braider'` fallback description (`StylistScreen.tsx`)
     Search with `grep -rni braider web/src/features` and fix every user-facing hit.
     Keep the sentences reading naturally.
5. Update `site.test.tsx` assertions that check copy you changed (e.g. `Braiders in Peckham`).

## Acceptance criteria

- [ ] The circular badge is gone from the hero, with its now-unused styles and import;
      `grep -rn "Move your cursor\|She’s looking too" web/src` finds nothing.
- [ ] The hero lede says "Meet Nana Ama:" and "Say hi, she’s already looking your way."
- [ ] Instagram and TikTok links in the footer and on the links page have
      `target="_blank"` and `rel="noopener noreferrer"`; internal links don't.
- [ ] `grep -rni braider web/src/features` only matches code comments, not user-facing text.
- [ ] No file outside Scope changed (`git diff --name-only origin/master`).
- [ ] All checks below pass.

## Checks

From `web/`:

```
npm ci
npx tsc --noEmit
npm run lint
npm test
npx vite build
```

## Report to the lead

_Filled in by the assignee when it sets `status: review` or `blocked`._

- **Changed:**
- **Checks run:** (each command and its result; "not run" if you didn't)
- **Unsure about:**
- **Skipped, and why:**
- **Question for the lead:** (only if `blocked`)
