# yasante.com

The website: the pages a shared link opens when the app isn't installed (her page, a
look), browsing looks, styles and areas, the waitlist and the policies — and a
stylist's own sign-up, from account to a live page. It's React,
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

## Stylists signing up

A stylist can make her account and put her page live without the app, in the app's
steps and words: `/auth/signup` (the account, role stylist), `/auth/verify-email` (the
six-digit code), then `/stylist-setup` (name and page, where she works, her rules,
proof of work, go live). `/auth/login` brings her back to finish or change it. These
are the app's own addresses, so on a phone with the app they open there instead.

- **The session lives in this tab only** (sessionStorage): a reload keeps her signed
  in, closing the tab signs her out, and "Sign out" also ends it on the server. The
  auth feature hands tokens to the API client through an `AuthBridge`, as in the app,
  and an expired token is refreshed once.
- **Her answers are saved in the browser as she goes** (per account), so an interrupted
  setup picks up where it stopped. A page she already has fills the form to edit.
- **The rules are the app's**: password rules, handle rules and the policy version are
  checked against the app's own files by a test, so an account made here works there.
- She accepts the terms, the privacy policy and the **stylist terms**; all three are
  recorded against her account (`POST /api/consents/`), and kept to retry if that fails.

## A stylist's studio

Until the apps are in the stores, a stylist runs everything from the website. Her studio
is the app's stylist screens, at the app's own addresses, behind her sign-in:

| Address | What it's for |
| --- | --- |
| `/today` | Her page link, a "get ready for clients" checklist worked out from her real page (live, services, hours, payment details, 9+ looks), this week's numbers, today's and upcoming appointments |
| `/requests`, `/requests/:id` | Requests to answer (accept an asked-for time with her deposit and how to pay it, suggest another time in London time, or decline), deposits to mark as arrived, cancelling, and closing out after an appointment |
| `/looks/new` | Posting her work: up to 20 photos at once, each tagged with a style (and a service if she likes). Each becomes a look in the feed, credited to her, and joins her page linked to that look |
| `/portfolio` | What she's posted: her looks in the feed, and the photos on her page |
| `/menu`, `/menu/new`, `/menu/:id` | Her services: price, "from" prices, time, options by length and size, hair included |
| `/availability`, `/payment-methods`, `/account` | Working hours and days off, where clients pay deposits, her address, editing her page |

A live stylist can post up to 200 looks an hour (clients: 30), so a back catalogue goes up
in one sitting. Everything she does here is what the app does, through the same API, so
when the app arrives it's all already there.

## Where things live

```
src/routes/            One file per page. Reads the address, renders a feature's screen.
src/features/<name>/   api.ts · hooks.ts · types.ts · format.ts · components/ · index.ts
src/shared/ui/         The design system: Page, Text, Button, Glass, Chip, ListRow, Section…
src/shared/theme/      themes.ts and tokens.ts (the app's), vars.css.ts, global.css.ts
src/shared/lib/        The API client, errors, formatting, page data, the query client
```

Features today: `home` · `looks` · `stylist` (her page, and setting it up) · `browse`
(style and area pages) · `policy` · `waitlist` · `auth` (signing up and in).

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
