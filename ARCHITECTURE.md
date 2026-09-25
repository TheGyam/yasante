# Architecture

How this codebase is organised, and the rules that keep it that way.

## Where things live

```
app/                      Routes only (Expo Router). Thin — a screen file wires
                          params to a feature's exported screen and nothing else.

src/features/<name>/      Everything that belongs to one domain.
  api.ts                    HTTP calls for this feature
  hooks.ts                  React Query hooks
  components/               UI used only by this feature
  store.ts                  Zustand store, if it needs one
  types.ts                  Types owned by this feature
  index.ts                  The feature's public surface — the ONLY thing
                            other features may import

src/shared/               Cross-cutting, domain-free.
  ui/                       The design system: Screen, Text, Button, Glass, Sheet,
                            ListRow, TabBar… Import each by path; there is no barrel.
  hooks/                    Device hooks (image picker, notifications, network)
  lib/                      API client, storage, haptics, formatting, images
  theme/                    Tokens, themes, motion, ThemeProvider and makeStyles
  config/                   Runtime config, policy versions, consent
  utils/                    Pure helpers
  types/                    Only types genuinely shared across features
```

## The three rules

1. **A feature is imported through its `index.ts`, never through its internals.**
   `import { useBookings } from '@/features/booking'` — yes.
   `import { useBookings } from '@/features/booking/hooks'` — no.
   Inside a feature, use relative imports.

2. **`shared/` never imports from `features/`.** If something in shared needs to
   know about a feature, it belongs in that feature.

3. **`app/` holds routing, not logic.** A route file reads params, renders a
   feature screen, and nothing more.

Rules 1 and 2 are enforced by ESLint, not by good intentions.

## Why feature-first

Layer-first (all components in one folder, all hooks in another) works up to
about a dozen screens. Past that, every folder becomes a pile that spans
unrelated domains, and a change to one feature touches five directories.

Phase 1 adds bookings, stylist mode, the looks feed, the product shelf,
verification and insights. Feature-first keeps each of those self-contained,
which matters most when two developers are working in parallel.

## Naming

- `src/shared/lib/` is device and platform work (storage, notifications, images).
- A feature's `api.ts` is HTTP. Nothing else is called "service", because the
  word previously meant both and that was a reliable source of confusion.

## The composition root

`src/api.ts` assembles every feature's endpoints into the `api` object. It is the
one module allowed to import from every feature, because wiring them together is
its whole job.

The HTTP client in `shared/lib/api/client.ts` needs tokens but must not depend on
the auth feature, so auth registers an `AuthBridge` with it at startup
(see `features/auth/AuthContext.tsx`). That inversion is also what removed the
circular dependency the old lazy `require` existed to work around.

## Features today

`auth` · `profile` · `planner` · `education` · `stylist` · `looks` · `booking` · `shelf`

Phase 1 still adds `insights`. Each one is a new
folder following the same shape — no changes needed elsewhere.

`planner` is the client's own planning: collections (what she saves) and care plans
(how she looks after the hair she has). Both replaced what came before — mood boards
and treatments — because a booking owns the stylist, price and appointment now.

`booking` owns what hangs off an appointment too: reviews and the week 2 and week 4
check-ins. The server decides when each is open and says so on the booking
(`review`, `checkInDue`); the app only reflects it. `shelf` is the product catalogue
and the products a client uses, rates, finishes and buys again.

The booking state machine lives server-side; the mock in `src/mocks/bookings.ts` is
its reference, tests included. Its scheduled jobs (requests lapse after 48 hours,
unpaid deposits after 24, an unclosed appointment completes a day after it ends)
run lazily on every read there; the real server runs them on a clock. A cancelled
or lapsed booking releases its day to anyone on that stylist's waitlist for it.

**The hair profile is progressive.** First run asks the core (curl pattern, length,
density, porosity, goals); the rest (scalp, chemical history, area, budget) are
sections answered whenever she likes, each saved on its own (`quiz/sections.ts`).
Every answer is kept on the device as it's given, so a half-finished quiz resumes.
After signing up, `useHairProfileSync` sends the device's answers to the account,
filling only gaps; the device copy remembers whose it is, so a second person on the
same phone never inherits the first's. Length is a ranked reference point stored
with whether it was stretched, and asked again a month on.

**Events and consent.** `track()` in `shared/lib/analytics.ts` sends only the plan's
minimum event set, only with the analytics consent (otherwise dropped, never queued),
with UTC and local time on each. Consent choices are recorded on the device first and
synced by `useConsentSync` while signed in. Both give up on a request that hasn't
settled in 20 seconds and try again later, so one stuck request can't stall them.

**Links.** yasante.com links open the app (iOS associated domains, Android verified
intent filters in `app.json`). `routeForLink` in `shared/lib/links.ts` maps them:
the site's pages match the app's screens, and a bare `/{handle}` opens her page. For
the OS to verify the links, the site must serve `/.well-known/apple-app-site-association`
(team ID + `com.yasante.app`) and `/.well-known/assetlinks.json` (package name + the
signing certificate's SHA-256). Handles can't take the site's own paths (`NOT_HANDLES`).
Each build profile in `eas.json` sets its API: staging for development and preview,
`api.yasante.com` for production.

**Notifications the server sends** carry `data` the app acts on: `mode`
(`client` or `stylist`) and `url` open the right screen. The day-before reminder
goes out under the category `attendance` with `bookingId` in its data; its two
buttons, "Yes, I'm coming" and "I can't make it", are registered by the app
(`ATTENDANCE_CATEGORY`). The first confirms there and then; the second opens the
booking with its cancel warning.

**Home is the looks feed.** Everything in its grid is posted by someone on Yasante;
the editorial content (tips, the library) lives in Learn and search, not the feed.
Anyone can browse looks; liking, saving, commenting and reporting ask for an account.

`looks` is posted by clients and stylists alike. Who did the hair is never typed in: a
stylist is credited through her own menu, a client's stylist through a completed
booking. Likes are the one place the query cache is patched instead of re-read
(`patchLook` in its hooks), because re-reading every page of a feed per tap costs more
than the like. A double tap on a photo likes it; that's timed by hand in `usePhotoTaps`
rather than with `Gesture.Exclusive`, which on web opened the look on the first tap.

## Modes and navigation

One account can be a client and a stylist. The root layout guards two route groups,
`app/(client)` and `app/(stylist)`, each with its own tabs; the stored mode in
`features/stylist/mode.ts` decides which is allowed, and flipping it swaps the tabs
without pushing anything. Screens both modes need, like settings, live at the root.

Inside a tab, shared routes (`(home,planner,profile)`) keep detail screens in the tab
you opened them from. See the comments in each `_layout.tsx`.

## Mocks

Until an endpoint exists on the backend, the app answers it from `src/mocks`, an
in-memory stand-in. Mocks run only in development with `EXPO_PUBLIC_API_MOCKS=true`,
which `.env.development` sets. Anything without a mock goes to the real API. When an
endpoint ships, delete its handlers.

A mock returns a copy of what it stores. Handing back the live object let a write
change data already sitting in the query cache, which then couldn't tell it had
changed and never re-rendered.

In the browser console, `mockSignIn('ama@yasante.dev')` signs in without the form, and
`mockDb` is the store itself, for when a screen and the mock backend disagree.

Seeded accounts: `client@yasante.dev`, `ama@yasante.dev` and `zainab@yasante.dev`
(both stylists), `new@yasante.dev` (phone not verified). Efua (client) has a
completed appointment with Ama from a fortnight ago, so her week-2 check-in and a
review are both waiting, and two products on her shelf.

Reviews arrive pending, as they will for real. To see one on a stylist page, pass it
by hand: `mockDb.reviews.forEach(r => (r.status = 'published'))`.

If your own dev server is on 8081, `.claude/launch.json` has a second web config on
8082, so the preview can pick up new mocks without restarting yours.

## Design system

The UI is glass over a soft ambient background, in Instrument Sans. Everything a
screen draws comes from `src/shared/ui` and `src/shared/theme`.

- **Every screen is a `<Screen>`.** It owns the background, safe areas, the glass
  header that fades in on scroll, keyboard handling and tab-bar clearance. A screen
  that renders its own list uses `scroll="list"` with `useScreenScrollHandler` and
  `useContentInsets`. Clearing the floating tab bar is automatic: `TabBarProvider`
  wraps each tabs navigator, so every screen in that group — tab roots and anything
  pushed on top of them — reserves the room. Nothing passes a flag for it.
- **Styles come from `makeStyles`.** Both themes' StyleSheets are built once at module
  load, so the hook is a context read. Never build style objects in render, and never
  hard-code a colour — read it from the theme.
- **Type goes through `<Text variant>`.** Each weight is its own font family; never set
  `fontWeight`.
- **Motion runs on the UI thread.** Shared values and Reanimated only, springs and
  curves from `theme/motion.ts`, reduced motion respected. Press feedback is
  `PressableScale`; nothing re-renders while a finger is down. Tabs never slide.
- **Haptics go through `shared/lib/haptics`**, one per user action, always with a
  visual change.
- **Glass has two weights.** `card` is a translucent fill with no blur and is safe
  anywhere. `chrome` blurs on iOS for bars and sheets, and is a solid fill on
  Android, where blur re-renders every frame.
- **Use the platform where it's better.** Native switches, date and time pickers,
  share sheet and stack transitions.
- **Show only real data.** No placeholder counts, reviewers or success messages for
  things that didn't happen.

## The website

`web/` is yasante.com: React and Vite, on the same rules as the app. Routes are thin,
features are imported through their `index.ts`, `shared/` never reaches into a feature
(ESLint enforces all three there too), and the types come from the same `openapi.yaml`.
Its design tokens are the app's, held equal by a test, so the site and the app can't
drift apart. Django serves each page's HTML with its title, share image and its own API
data inlined, so shared links preview properly and open on their content.
[web/README.md](web/README.md) has the details.

## Built for growth

The catalogue, the feed and one person's saved items all grow without limit. These
rules keep the app the same speed at ten thousand items as at ten.

- **Every list of unknown length is virtualised.** FlashList, never a `map` inside a
  ScrollView. Fixed, short lists (a stylist's four menu rows) may map.
- **A screen reads a page, never a table.** Pass a `limit`, or use an infinite query
  with `onEndReached`. Anything that fetches everything to filter or join on the phone
  is a stop-gap and is written down below.
- **Images go through `RemoteImage`**, which caches to memory and disk and takes a
  `recyclingKey` so a reused row never shows the previous picture.
- **Nothing writes the query cache to storage.** Persisting it on every interaction
  grows with the feed; offline support, when it comes, persists chosen queries only.
- **Motion runs on the UI thread** and lists never re-render to animate.
- **One tap, one navigation** — `@/shared/lib/navigation` drops the second.

## Known issues worth fixing

- **Mood board field names.** Create maps fields to snake_case; update sends
  camelCase. Confirm with the backend which one it accepts and make both match.
- **Search, the library and saved items read one page of content.** Each filters or
  joins what `useContent({ limit })` returns, so results are capped. They need
  server-side search, topic paging, and saved items returned with their content.
- **Editing anything under `src/mocks` needs the dev server restarted**, not just a
  reload. After an edit the bundler keeps serving a mock layer whose requests never
  answer, so a mocked screen sits on its skeleton for ever. Reloading the page does
  not clear it; `npx expo start` again does.

- **Entering animations don't finish in the web preview.** A `Rise` or a setup step
  sits at its first frame, which reads as content that never arrives. They run
  correctly on a device, so judge motion there — and don't take a blank-looking web
  preview as proof a screen is broken.

- **Bottom sheets don't open in the web preview.** `Sheet` presents nothing there,
  in a modal screen or a tab — `edit-profile`'s photo sheet included, so it predates
  the portfolio work. Anything behind a sheet has to be checked on a device.

- **Requests queued behind a token refresh can wait for ever.** On web, a reload
  restores the user but not the tokens (SecureStore), so early requests 401; the
  client queues 401s behind any refresh in progress, and in the web preview some of
  those never settled. Screens recover through React Query's retries; consent sync
  and analytics now give up and retry. Worth confirming on a device and against the
  real API whether the refresh queue can hang.

- **Formatting drift.** `npm run format` rewrites a large number of files. Do it
  as its own commit, never mixed with a change.
