# On-device QA

Manual, evidence-backed test runs of the Android app on a real phone or emulators, and of
the staff workspace in a browser, against a local backend. Claude writes the plans, Antigravity executes them, and Claude audits each run
from the raw evidence rather than from the report.

```
qa/
  AGENTS.md          rules the executing agent must follow (phone guardrails, evidence)
  plans/<ID>.md      one plan per section or interaction of sections
  reports/<RUN>.md   the executor's report for one run
  runs/<RUN>/        raw evidence (gitignored): server.log, journal.jsonl, steps/, MANIFEST.json
  bin/               env-up, metro, qadb, mailbox, dbcheck, env-down;
                     web-up, qaweb, totp, staffaudit, pushlog, staff-fixtures (staff workspace);
                     secscan (Claude's automated security checks), canary (SEC plans)
  sec/               the security tests secscan runs; see sec/README.md
```

## One run

1. Plug the phone in, unlock it, and turn on Do Not Disturb.
2. Tell Antigravity: *"Read qa/AGENTS.md, then execute qa/plans/<ID>.md (parts …)."*
   One plan at a time, as a single agent. Runs share one backend, so they can't run in parallel.
3. When it's done, tell Claude: *"Audit run <RUN>."* Claude checks the journal, hashes,
   screenshots, server log and database, then writes findings into the report's
   `## Audit` section.

## How the guardrails work

- `qadb` is the only way onto the phone. It refuses any action or capture unless
  `com.yasante.app` (or Android's permission prompt) has focus, trims the UI tree to the
  app's own windows, reads the app's log by its process ID only, and opens only
  yasante.com / `yasante://` links, inside the app.
- `metro` writes a gitignored `.env.development.local` pointing the app at
  `http://localhost:8765`, which `adb reverse` tunnels over USB to Django on :8000 (the phone already uses 8000 for something else). Expo's dev runtime lets
  the committed `.env.development` (the **live** API) win over shell variables, so the
  file is the only override that works. `env-down` removes it.
- Every plan opens with a routing gate: sign in with a seeded account that exists only
  in the local database, and stop unless the local server logged that request.

## Plans

| ID | Covers | Status |
| :--- | :--- | :--- |
| AUTH-01 | welcome, sign-in, sign-out, client and stylist sign-up, email code, password reset | run on phone (P+A) and emulator; rerun: `AUTH-01-RERUN.md` |
| BOOK-01 | request, race for a slot, accept + deposit, attendance, moves, close-out, review, check-ins, suggest/decline, lapse, cancel in time/late, waitlist, no-show | run and audited (3 emulators, `BOOK-01-20260926-2339`) |
| GAPS-01 | reset link with no token; no attendance question >48 h ahead | run and audited (`GAPS-01-20260927-1055`): both PASS |
| STYLIST-01 | becoming a stylist (setup, go live), menu, hours, payment, portfolio import, stylist tabs, public page, invites; F4 across time zones | written (2 emulators) |
| LOOKS-01 | feed, area filter, search, a look (like, comment, reply), collections, saved, posting public/private, what others see, report, block, take down | written (2 emulators) |
| PROFILE-01 | edit profile, username, hair profile and quiz, planner, care plans, shelf, learn | written (1 emulator) |
| SETTINGS-01 | settings, notifications, privacy, data download, FAQs, policies, reports and appeals, sign-out (F1), delete account | written (1 emulator) |
| FIXES-01, NEW-01, NEW-02 | rechecks of upstream's fixes; new booking and discovery features | written (emulators) |
| STAFF-01 | staff workspace: sign-in, two-factor, recovery codes, Today, search, people records and hidden details, export, quick edit, errors, push notifications, a moderator's limits, sign-in limits | written (browser), dry-run by Claude |
| PHONE-01 | the phone-only checks: links at someone else's data, session and sign-out, Samsung Pass, camera, F3 on real hardware, background, feel; tablet layout | written (S23 Ultra; owner at the start and, after an explicit wait, at the end), not yet run |
| SITE-01 | yasante.com: public pages, waitlist, stylist pages, policies; a stylist's web sign-up, set-up and studio (menu, hours, payments, posting, address privacy); a request from the app answered on the web | written (browser + 1 emulator), dry-run by Claude (`SETUP-site-dry`) |
| STAFF-02 | app ↔ workspace: report → hide → appeal → overturn, product approval, a tip of the day, review report | written (2 emulators + browser), workspace side dry-run by Claude |

## The staff workspace (browser runs)

`qa/bin/web-up <RUN>` (after `env-up`) starts Vite on :5173, which serves the staff
workspace at `http://admin.localhost:5173` and the public site at `http://localhost:5173`,
and resets the two test staff accounts (`staff.lead@` superuser, `staff.helper@` in the
`QA moderators` group; password `password123`, no two-factor, no phones). It refuses to
run if `backend/.env` sets `PUSH_DELIVERY=expo`, so pushes are only ever logged.

`qa/bin/qaweb` is to the browser what `qadb` is to the phone. `qaweb start <RUN>` runs a
Playwright Chromium in a systemd user unit (`yasante-qa-browser`) holding one window per
person (`lead`, `helper`, `visitor`); each `qaweb` command talks to it over a socket in
the run folder. Every request to a host other than the two local ones is aborted and
journalled (images from `images.unsplash.com`, where the seed's photos live, are the one
exception). `qaweb step` writes `screen.png`, `aria.txt`, `visible.txt`, `network.txt`,
`console.txt` and `url.txt`, hashes them into the journal and opens the report section,
in the same report and journal as `qadb` when a plan uses both. `totp <email>` prints the
current code for a test staff account (it reads the secret from the local database and
waits rather than hand out a used or expiring code); `staffaudit`, `pushlog` are
read-only views; `staff-fixtures` adds pretend phones or posts an app error, only where a
plan says so.

Needs Playwright in the QA venv once:
`uv pip install --python qa/.venv/bin/python playwright && qa/.venv/bin/python -m playwright install chromium`.

## Building the dev client locally

When the app gains a native module (as `expo-camera` did on 27-09-2026), the old
dev-client APK can't load it (`Cannot find native module …`). Build a new one here rather
than waiting for an EAS build:

```
npx expo prebuild --platform android --no-install --clean   # android/ is gitignored, regenerated
cd android && echo "sdk.dir=$HOME/Android/Sdk" > local.properties
JAVA_HOME=~/Apps/jdk-17 ANDROID_HOME=~/Android/Sdk JAVA_TOOL_OPTIONS=-Djava.net.preferIPv4Stack=true \
  ./gradlew :app:assembleDebug -PreactNativeArchitectures=x86_64,arm64-v8a \
  "-Dorg.gradle.jvmargs=-Xmx4g -Djava.net.preferIPv4Stack=true"
cp app/build/outputs/apk/debug/app-debug.apk ../qa/apk/dev-client.apk
```

Needs JDK 17 (RN 0.81's Gradle rejects newer), SDK platform 36, build-tools 36.0.0, NDK
27.1.12297006, CMake 3.22.1. `preferIPv4Stack` matters on this laptop: IPv6 has no route,
and Java stalls on it (`Read timed out`) while curl works. The first build takes ~20 min.
A locally built APK is signed with the debug key, not TheGyam's: `emus up --wipe`
reinstalls it cleanly, but a device holding the EAS build must uninstall that first.
