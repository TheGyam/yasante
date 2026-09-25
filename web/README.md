# yasante.com

The website: the pages a shared link opens when the app isn't installed (her page, a
look), browsing looks, styles and areas, the waitlist and the policies. It's React,
built with Vite, and it follows the same principles as the app: read
[ARCHITECTURE.md](../ARCHITECTURE.md) first — nearly everything there applies here.

## Run it

```bash
cd web
npm install
npm run dev            # http://localhost:5173
```

Vite passes `/api` and `/media` to a backend: a local one on port 8000 by default
(see the root README), or any other with `YASANTE_API=https://api.yasante.com npm run dev`.

```bash
npm test               # Vitest
npm run lint           # ESLint, including the module boundaries
npx tsc --noEmit       # types
npm run api:types      # regenerate src/shared/lib/api/schema.d.ts from ../openapi.yaml
npm run build          # into ../backend/apps/web/static/site/
```

## How a page reaches someone

Django serves every page's HTML (`backend/apps/web/views.py`, one view per page, and
`templates/web/site.html`). The HTML carries what can't wait for JavaScript:

- the **title, description and share image**, so search engines and link previews
  (WhatsApp, Instagram, iMessage) see the real page;
- the **page's own API data**, inlined as `<script id="page-data">` under the query keys
  the features read it with (`['stylist', handle]`, `['look', id]`, `['policy', type]`,
  `['styles']`). `seedFromPage` puts it in the query cache before the first render, so
  her page opens on her page, not a spinner. The keys are a contract: change one in a
  feature's `hooks.ts` and in `views.py` together (the backend tests check the data
  matches the API exactly).

The bundle loads from `/static/site/`. It is built in CI and on deploy, never committed:
`deploy.yml` builds it, adds it to the backend package, and `collectstatic` serves it.
Every built file is named by its content, so browsers keep it for good.

Every page's address is the app's address for the same thing, so one link works in
both. A new page is added in three places: `src/routes/index.tsx`,
`backend/apps/web/urls.py` (with its view), and, if the app should open it,
`APP_PATHS` in the same views file.

## Where things live

```
src/routes/            One file per page. Reads the address, renders a feature's screen.
src/features/<name>/   api.ts · hooks.ts · types.ts · format.ts · components/ · index.ts
src/shared/ui/         The design system: Page, Text, Button, Glass, Chip, ListRow, Section…
src/shared/theme/      themes.ts and tokens.ts (the app's), vars.css.ts, global.css.ts
src/shared/lib/        The API client, errors, formatting, page data, the query client
```

Features today: `home` · `looks` · `stylist` · `browse` (style and area pages) ·
`policy` · `waitlist` · `auth`.

The same three rules as the app, enforced by ESLint:

1. A feature is imported through its `index.ts`, never its internals.
2. `shared/` never imports from `features/` (or `routes/`).
3. `routes/` holds routing, not logic.

## The design system, on the web

- **Styles are TypeScript, like the app's.** Each component's styles sit beside it in a
  `.css.ts` file (vanilla-extract) — the web's `makeStyles`. They read typed tokens:
  `space.lg`, `radius.md`, `vars.color.accent`, `media.wide`. A typo is a type error, and
  it all compiles to plain CSS at build time, so nothing runs in the browser for it.
- **The tokens are the app's.** `themes.ts` and `tokens.ts` mirror the app's files of
  the same names, value for value, and a test compiles the app's and fails if they ever
  differ. `vars.css.ts` turns the colours into CSS variables that switch between light
  and dark with the reader's setting. Never hard-code a colour.
- **Every page is a `<Page>`**, which owns the width, gutters and the tab's title.
- **Type goes through `<Text variant>`**: the app's scale, in `rem` so it follows the
  reader's text size.
- **Glass has the same two weights.** `card` is a translucent fill; `chrome` blurs, and
  is kept for the header, whose glass fades in with a scroll-driven animation rather
  than a scroll listener.
- **Motion moves only transform and opacity**, on the app's curves and durations, and
  stops for `prefers-reduced-motion`.
- **Show only real data.** Every count, badge and sentence about a stylist comes from
  the API, worded as the app words it (`features/stylist/format.ts`).
- **Errors in plain words**, through `errorMessage`, never a code.

## Built for growth

- **Lists of unknown length load a page at a time**, the next one as the reader nears
  the end. Off-screen tiles use `content-visibility: auto`, so a long feed costs layout
  and paint only for what's on screen.
- **Photos go through `RemoteImage`**: lazy below the fold, eager for the first
  screenful, and the frame holds its shape so nothing jumps.
- **Links start loading early.** `Link` takes a `preload`, run on hover, focus or touch,
  so the next page is usually in the cache by the click.
