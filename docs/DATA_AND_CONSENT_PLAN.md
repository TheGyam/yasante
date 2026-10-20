# Data and consent plan

The whole brief for the next stretch of work on Yasante: making consent real, then
using the data we hold for personalisation and, with people's agreement, research.
Written 20 October 2026 by the lead, for whoever picks it up. Read it in full before
touching code, then follow it exactly. Where it's silent, ask Yaw; don't guess.

Yaw (GitHub: TheGyam) owns Yasante. Call him Yaw.

---

## 1. What we're aiming for

Yasante holds some of the most valuable data about textured hair that exists: hair
profiles with change history, how long styles last, which products people buy
again, what they search for and book. Two uses:

- **Personalisation:** a person's own data used to serve them (their feed, stylists,
  products, reminders, insights).
- **Hair research:** anonymised totals from people who agreed, used beyond the app
  (trend reports for brands, studies with universities). Later, maybe, a paid
  opt-in photo programme. Not in this plan.

Both rest on consent that is real: asked clearly, recorded, enforced on the server,
and as easy to withdraw as to give. That comes first. Nothing that uses hair data
beyond showing it back to the person ships before the consent work is merged.

The standard is "top industry practice", which Yaw asked for explicitly: no
pre-ticked boxes, no dark patterns, equal Allow and No buttons, no penalty for no,
every choice also in Settings, every record kept with its policy version.

## 2. Decisions already made (don't reopen them)

| Decision | Detail |
| --- | --- |
| Analytics is opt-in everywhere | UK included. Off until the person says yes. |
| Four consents, asked at their own moment | Analytics after sign-up; hair and scalp details at the start of the hair profile; research when the hair profile is finished; a photo programme only later, not in this plan. |
| Personalisation is a real, explicit consent | Hair texture can stand in for ethnicity, and scalp concerns are health data: both special category under GDPR. The `personalisation` switch stays and becomes explicit consent to use hair and scalp details. It starts **off**. |
| One research consent | Covers both commercial reports (hair brands) and academic studies (universities). Its wording names both. |
| Research consent stays in Settings | Asked first at the end of the hair profile, then always in Settings > Privacy and data. |
| No inferring | Never guess ethnicity, health or income from behaviour. Use what people tell us, for the purpose they gave it. |
| Never collect | Ethnicity or race, precise or background location, contacts, other apps, ad identifiers. No ad networks, no third-party tracking scripts, no cookie banner needed (the site sets no cookies). |
| Registrations | The company has an EU representative. The ICO fee is paid before launch. |
| Under-18s | Not allowed (terms say 18+). Keep it that way. |
| Research outputs | Only people who said yes; totals never rows; a minimum group of 20; area or region, never postcode; weeks or months, never exact times; no free text; no photos. |

## 3. How we work (follow exactly)

### People and roles

- You are the lead for this work, working with Yaw directly. Read `CLAUDE.md`,
  `AGENTS.md` and `ARCHITECTURE.md` first. `ARCHITECTURE.md`'s rules are enforced.
- Yaw prefers the lead to do the work itself rather than hand it to Gemini.
  Delegating to other agents (`npm run agent`) is allowed by `CLAUDE.md`, but only
  if Yaw says so for a piece.
- Report to Yaw in short, plain updates: what shipped, what needs him, what's next.
  He reads on his phone too.

### Hard rules (Yaw's, never break them)

- **No AI authorship anywhere.** No `Co-Authored-By`, "Generated with", session
  links, or any line naming an AI or model in commits, PRs or comments. Commits are
  under Yaw's git identity.
- **Plain, natural English** in commits, PR titles and bodies, review comments, and
  every word the app shows. Short full sentences, no jargon, no internal ids or tool
  names. Conventional prefixes: `feat(area): ...`, `fix(area): ...`,
  `docs(area): ...`, saying what changes for the person using the app.
- **Ask before any EAS build** (cloud builds are limited). Local Android builds are
  fine (section 7).
- **No server actions that cost money.** No paid services, no new paid plans.
- **Never type passwords or real credentials** into anything, except local dev test
  accounts. No SSH to production.
- **Don't commit** `.env.development`, `output/`, `skills-lock.json`, `.agents/`,
  `web/scripts/hero/film.py`, or anything else untracked that isn't yours.
- **Don't touch** the `Y:` drive, Windows system or security settings, or the main
  checkout's `funky` branch (Yaw's own uncommitted work lives there).
- **The privacy policy is Yaw's decision.** Draft it; never publish a new version
  without his written approval in chat.

### Branches, PRs, merging

- Work in the worktree `C:\Users\yawop\Downloads\Coding\survey` (not the main
  `Kalon` folder). Start each piece from fresh master:
  `git fetch origin && git switch -c <prefix>/<short-name> origin/master`.
- One PR per piece in section 6. Small, reviewable, one area at a time.
- PR body: what changes for people, how it behaves, in plain words. No checklist
  boilerplate.
- Yaw has handed merging to the lead: once CI is green **on the latest commit**,
  post a comment starting "Approved by lead." with a one-line summary, then
  squash-merge with the title ending ` (#<n>)`. Never merge red, conflicted or
  unreviewed work. Then delete the branch, on GitHub and locally.
- Merging to master deploys the backend and website automatically (the "Deploy
  backend and website" workflow). Check it finished green.
- CI runs on pull requests and on pushes to master only.

### Code standards

- Shortest working change. Reuse what's in the repo before writing anything new; no
  new dependency unless the piece truly needs it and you say why in the PR.
- Read the code a change touches end to end before editing. Fix root causes in the
  shared function, not in each caller.
- Match the surrounding code: its comment density (short "why" comments, in plain
  English), naming and idioms. Comments speak about the person ("her", "they")
  the way existing ones do.
- Every non-trivial branch, money path or privacy rule leaves one test behind that
  fails if it breaks. Tests are named as behaviour in plain English, like
  `test_a_private_look_can_go_public_and_back`.
- UI copy: plain, warm, short; curly apostrophes (’) in app and website strings.
  Never "please", never "successfully".
- The plait separator: UI strings join parts with `SEP` from `shared/lib/format`
  (app and website). Text that leaves the app (calendar entries, sharing, push,
  emails) uses `plain()`. Screen readers get `spoken()`. Never write a raw "·" in
  new UI text.
- Money: always in the stylist's own currency, never converted or added across
  currencies. Use `formatMoney(amount, currency)`.
- Prettier rewrites `\uXXXX` escapes into raw characters. For invisible or special
  characters, use `String.fromCharCode(...)`.

### Checks (run all that apply, report the real results)

App, from the repo root:

```
npx tsc --noEmit
npm run lint
npx jest --ci
```

Website, from `web/`:

```
npx tsc --noEmit && npm run lint && npx vitest run && npx vite build
```

Backend, from `backend/` (Postgres must be running; use the main checkout's venv):

```
PY=/c/Users/yawop/Downloads/Coding/Kalon/backend/venv/Scripts/python
DJANGO_SETTINGS_MODULE=config.settings.test $PY manage.py makemigrations --check --dry-run
$PY -m pytest -q -p no:cacheprovider --create-db
```

Always pass `--create-db`: a reused test database loses seeded data and fails
unrelated tests. Website tests sometimes fail when the whole suite runs under load;
rerun the failing file alone before calling it a failure.

After any backend API change, regenerate the schema and both typed clients, never
by hand:

```
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test $PY manage.py spectacular --file ../openapi.yaml
cd .. && npm run api:types && cd web && npm run api:types
```

A check you didn't run is "not run", never "passed".

## 4. The codebase, for this work

| What | Where |
| --- | --- |
| Consent records (append-only) | `backend/apps/profiles/models.py` `ConsentRecord`; `POST /api/consents/` in `backend/apps/profiles/views.py` `ConsentBatchView` |
| App consent state | `src/shared/config/consentStore.ts` (purposes: terms, privacy, analytics, personalisation, research), `consentSync.ts` (sends records), `policies.ts` (`POLICY_VERSION`) |
| App analytics | `src/shared/lib/analytics.ts` (records nothing without analytics consent); events go to `EventBatchView`, stored as `AnalyticsEvent` |
| Privacy settings screen | `app/settings/privacy.tsx` |
| Hair profile | `backend/apps/profiles/models.py` `HairProfile`, `HairProfileSnapshot`; app quiz in `src/features/profile/quiz/` and routes `app/hair-profile/`, `app/onboarding/quiz.tsx` |
| Hair diary | `HairLog` (wash, trim, take_down, with local weekday and hour) |
| Check-ins after a style | `backend/apps/bookings/models.py` `CheckIn` (holding, scalp, again, still_in); `app/check-in/[id].tsx` |
| Hair shown to stylists | `Booking.client_hair`, filled from the hair profile when a booking is made |
| Shelf | `backend/apps/shelf/` (`ShelfItem.hair_snapshot` keeps the hair at the time) |
| Feed | `backend/apps/looks/views.py` (newest first today; `hair` filter for "Hair like mine") |
| Insights for people | `backend/apps/profiles/insights.py`, `app/insights.tsx` |
| Staff insights | `backend/apps/staff/insights.py`, `web/src/features/staff/components/insights/` |
| Data retention jobs | `backend/apps/common/tasks.py` (events and searches deleted after a year; searches and page views anonymised after 90 days) |
| Policies | `PolicyDocument`, published by data migrations: copy `backend/apps/profiles/migrations/0011_privacy_apple_google.py` (new version, old one kept) |
| Website consents | `web/src/features/auth/consents.ts`, `web/src/features/auth/rules.ts` |
| Store privacy answers | `docs/STORE_SUBMISSION.md` |

Known problems this plan fixes:

1. The `personalisation` and `research` switches control nothing.
2. The server never reads consent records back: no device knows another's answers,
   and nothing server-side can enforce a consent.
3. `personalisation` defaults to **on** in `consentStore.ts`.
4. Hair and scalp details are collected with no explicit consent; check-ins ask
   about itchy or sore scalps with none either.
5. The hair profile stores postcode and coordinates, more precise than any feature
   needs.
6. The privacy policy says nothing about cookies or storage, OpenStreetMap,
   personalisation consent or research.

## 5. The consents, exactly

| Purpose key | Asked when | Wording | Starts | Without it |
| --- | --- | --- | --- | --- |
| `analytics` | A "Your privacy choices" screen right after sign-up | Title: "Help make Yasante better". Body: "Share how you use Yasante, never what you post, so we can fix what’s slow or confusing." | Off | Nothing is recorded |
| `personalisation` | The first screen of the hair profile, before any question | Title: "Use your hair details". Body: "We’ll use your hair and scalp details to match looks, stylists and products to your hair. Only you and stylists you book can see them." | Off | The hair profile can't be filled in; the app works without matching |
| `research` | When the hair profile is finished | Title: "Help research on textured hair". Body: "Let your hair data, without your name or photos, join anonymous research on textured hair, including reports for hair brands and studies with universities. You can stop any time in Settings." | Off | Never in any research or report |

Every consent screen:

- Two buttons of equal size and weight: "Allow" and "Not now". Neither is greyed
  out, smaller, or a text link.
- Saying no never blocks anything beyond what the consent is for.
- Shown once per account. Existing accounts see each one once, at the same moment
  (after their next launch, at the next hair profile visit, at the next profile
  completion), unless they've already answered in Settings.
- Records a `ConsentRecord` with purpose, granted, `policy_version`, time, source
  (`app` or `web`).
- Settings > Privacy and data keeps all three switches, with the same wording, and
  changes take effect immediately on every device.

Withdrawing:

- `analytics` off: stop recording at once, drop the queue (already done), and the
  server stops accepting that person's events.
- `personalisation` off: matching stops; new bookings stop copying hair details to
  the stylist; the hair profile stays saved and visible to its owner, with a line
  explaining it isn't being used, and a button to turn it back on.
- `research` off: excluded from every research query from that moment. Already
  published totals can't be recalled, and the policy says so.

## 6. The work, in order

Each item is one PR unless it says otherwise. Don't start item N+1 before item N is
merged, except where noted.

### 6.1 Consent on the server (backend)

- A helper `current_consents(user)`: the latest record per purpose, as
  `{purpose: granted}`, defaulting to not granted. One query.
- `GET /api/consents/`: the person's current choices, with each record's policy
  version and time.
- `has_consent(user, purpose)` used everywhere a consent matters, and nowhere else
  reimplemented.
- `EventBatchView` drops events from people without `analytics` consent (belt and
  braces; the app already doesn't send them).
- Tests: latest record wins; default is no; events refused without consent.

### 6.2 Consent state on the device (app)

- `consentStore.ts`: `personalisation` defaults to **off**. Nothing optional is
  pre-ticked, matching its own comment.
- On sign-in and app start, load `GET /api/consents/` and use the server's answers;
  records waiting to be sent still win until sent.
- Settings > Privacy and data uses the wording in section 5.
- Tests: defaults are all off; the server's answers replace the device's.

### 6.3 The new privacy policy version (backend, needs Yaw)

Draft, show Yaw the full text in chat, and merge only after he approves it in
writing. One data migration, copying `0011_privacy_apple_google.py`. It adds:

- **Cookies and storage:** the website sets no cookies; the browser storage it uses
  (sign-in for the tab, booking and setup drafts, consents not yet sent, a reload
  marker), all essential; the staff site's two essential cookies; on the phone,
  sign-in and settings.
- **Area suggestions:** stylists outside the UK see suggestions from OpenStreetMap
  through Photon (komoot); what's typed is sent to suggest names; nothing else.
- **Your hair details:** what's collected, that texture and scalp details are
  sensitive, used only with consent, shown to stylists you book, and how to stop.
- **Usage analytics:** off until you say yes, what's recorded, kept a year.
- **Research:** opt-in, what it means (anonymous totals, minimum group of 20, no
  names, no photos, brand reports and university studies), withdrawal from then on.
- **How long we keep things:** events and searches a year, searches and page views
  anonymised after 90 days, account data until deletion.

Bump `POLICY_VERSION` in `src/shared/config/policies.ts` and
`web/src/features/auth/rules.ts` to the new version. Update the App Privacy and
Data Safety answers in `docs/STORE_SUBMISSION.md` to match. Yaw pastes them into the
stores himself.

Also write `docs/DPIA.md`: a data protection impact assessment of a few pages (what
data, why, risks to people, how each is reduced, who can see what, retention). It's
for Yaw and a lawyer to review; say so at its top.

### 6.4 The consent moments (app)

- "Your privacy choices" after sign-up: the `analytics` question (section 5).
- Hair data consent as the first screen of the hair profile, wherever it starts
  (onboarding quiz, hair profile hub, any deep link).
- Research question when the hair profile is complete.
- Existing accounts get each once (section 5).
- Tests: each shows once; no blocks the rest of the app; both buttons equal.

### 6.5 Enforcing personalisation and research (backend, app)

- Without `personalisation`: the hair profile can't be saved (the server refuses
  with a plain message); `Booking.client_hair` is left empty for new bookings; check-in
  scalp question is skipped; "Hair like mine" asks for the consent instead of
  filtering.
- A single `research_participants()` queryset, used by every research or staff query
  that breaks results down by hair, scalp or growth. Its test proves people without
  consent never appear.
- Stop storing coordinates on the hair profile if no feature needs them (check first:
  distance features may use them). If something needs them, keep them server-side
  only and never in exports.

### 6.6 Website

- The website has no analytics, so no analytics question there.
- Stylist sign-up records the new `POLICY_VERSION`.
- If the website gains a hair profile later, the same consent rules apply.

### 6.7 Personalisation from data we already have

One PR each, every one checking `personalisation` consent:

1. **Feed matched to your hair:** looks on matching hair texture rank higher, newest
   first within each group. People without consent keep the plain newest-first feed.
2. **"Time to rebook":** a nudge a week before a style is likely to need taking out
   (from their diary and how long that style lasts), with their stylist's next free
   times. Uses existing notifications and their preferences.
3. **Content for your hair:** articles tagged for their texture and porosity first.
4. **Wash-day reminders:** on the weekday and hour they usually wash, opt-in through
   notification preferences.
5. **Why it's suggested:** a short line like "Because you have coily, low-porosity
   hair" where matching changes what's shown.

### 6.8 New questions (app, backend)

One PR each, each optional, a tap or two:

1. **Why a style came out** when logging a take-down: "It was time", "It hurt", "It
   got frizzy", "For an event", "Other". "It hurt" is health data: only with
   `personalisation` consent.
2. **Style wishlist** in the hair profile: styles wanted next, length, colour, upkeep
   (low, medium, high), hours happy to sit.
3. **Extension hair used** in the stylist's close-out: brand, product, number of
   packs. Stylist business data; no consent needed beyond the privacy policy line.
4. **"Not for me"** on a look or stylist, in its menu; the feed shows fewer like it.
5. **Booking for an occasion** (optional when booking): wedding, holiday, event.
6. **Age band** at sign-up, optional: 18 to 24, 25 to 34, 35 to 44, 45 to 54, 55+.

Each new field goes into the data export (`backend/apps/profiles/tasks.py`) and
account deletion.

### 6.9 The first research product (backend, staff website)

A monthly "Hair trends" report in the staff insights:

- From bookings, looks and searches: style demand by area and month, rising styles,
  prices by area in their own currencies (never added across currencies).
- Hair-type breakdowns only from `research_participants()`.
- Minimum group of 20: smaller groups are merged into "Other" or hidden.
- Superusers only, like the money insight.
- Exportable as CSV for sharing with partners only after Yaw has agreed a partner.

### Out of scope for this plan

Selling or licensing data, the photo programme, ad networks, any third-party
analytics, and anything requiring a new paid service.

## 7. Local Android builds and the phone

Yaw tests on a Galaxy Note10+ over USB and on an emulator. Windows' 260-character
path limit breaks native builds from the long project path, so build from the short
checkout `C:\ys` (a detached worktree):

```
cd /c/ys && git fetch origin && git checkout --detach origin/master
export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" JAVA_HOME="/c/Program Files/Microsoft/jdk-17.0.20.101-hotspot" NODE_ENV=production
export PATH="$JAVA_HOME/bin:$PATH"
npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64,arm64-v8a
```

Run `npm ci` in `C:\ys` first if `package-lock.json` changed. Copy
`android/app/build/outputs/apk/release/app-release.apk` to
`C:\Users\yawop\Downloads\Coding\Kalon\output\yasante-android.apk`, then install
with `"$LOCALAPPDATA/Android/Sdk/platform-tools/adb" -s <device> install -r <apk>`.
The emulator is `Yasante_Pixel_8`; start it with `-no-audio`. The build talks to the
live server, so server changes must be merged and deployed before testing them on
the phone.

## 8. Done means

For each piece: merged, CI green, deployed, the checks above run and passing,
tested on the phone where it's visible there, and a two-line note to Yaw. At the end:
the four consent rules in section 5 hold, the policy is published with Yaw's
approval, and the trends report shows only consented, grouped data.
