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
  ui/                       Button, Card, Text, Input, Badge…
  components/               Composed UI used by 3+ features
  animations/               Animation wrappers
  icons/
  hooks/                    Device and UI hooks (useTheme, useResponsive…)
  lib/                      API client, storage, notifications, images
  theme/                    Tokens and ThemeProvider
  config/                   Runtime config, policy versions
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

## Known issues worth fixing

- **Conditional hooks.** Several components `require()` Reanimated inside a
  try/catch and then call `useAnimatedStyle` conditionally. That breaks the rules
  of hooks and can crash on re-render when the import resolves differently.
  ESLint flags all of them (`npm run lint`). Fix by importing normally and
  handling reduced motion with a value, not by skipping the hook.
- **Formatting drift.** `npm run format` rewrites a large number of files. Do it
  as its own commit, never mixed with a change.
