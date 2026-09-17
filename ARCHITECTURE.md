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

`auth` · `profile` · `planner` · `education`

Phase 1 adds `looks`, `stylist`, `booking`, `products` and later `insights`. Each
one is a new folder following the same shape — no changes needed elsewhere.

## Modes and navigation

One account can be a client and a stylist. The root layout guards two route groups,
`app/(client)` and `app/(stylist)`, each with its own tabs; the stored mode in
`features/stylist/mode.ts` decides which is allowed, and flipping it swaps the tabs
without pushing anything. Screens both modes need, like settings, live at the root.

Inside a tab, shared routes (`(home,planner,profile)`) keep detail screens in the tab
you opened them from. See the comments in each `_layout.tsx`.

## Mocks

Until an endpoint exists on the backend, the app answers it from `src/mocks`, an
in-memory stand-in seeded with two accounts (`client@yasante.dev`, and
`ama@yasante.dev`, who is also a stylist). Mocks run only in development with
`EXPO_PUBLIC_API_MOCKS=true`, which `.env.development` sets. Anything without a mock
goes to the real API. When an endpoint ships, delete its handlers.

In the browser console, `mockSignIn('ama@yasante.dev')` signs in without the form.

## Design system

The UI is glass over a soft ambient background, in Instrument Sans. Everything a
screen draws comes from `src/shared/ui` and `src/shared/theme`.

- **Every screen is a `<Screen>`.** It owns the background, safe areas, the glass
  header that fades in on scroll, keyboard handling and tab-bar clearance. A screen
  that renders its own list uses `scroll="list"` with `useScreenScrollHandler` and
  `useContentInsets`.
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
- **Formatting drift.** `npm run format` rewrites a large number of files. Do it
  as its own commit, never mixed with a change.
