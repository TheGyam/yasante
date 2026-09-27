# QA task list

- [x] ~~25-09-2026 10:10~~ Local test harness: `env-up`/`metro`/`env-down` bring up Postgres+Redis (podman), seeded Django and Metro, with the app pointed at localhost via a gitignored `.env.development.local` — Expo's dev runtime lets the committed `.env.development` (live API) beat shell variables, so exporting alone sent traffic to production.
- [x] ~~25-09-2026 10:10~~ `qadb`: the only door to the owner's phone — refuses actions/captures unless Yasante has focus, app-only UI tree and logs, link allowlist, hashed journal per run. `mailbox` and `dbcheck` give ground truth to check reports against.
- [x] ~~25-09-2026 10:10~~ `qa/AGENTS.md` executor rules and plan AUTH-01 (sign-in, sign-out, sign-up, email code, reset, stylist sign-up).
- [x] ~~25-09-2026 10:24~~ Phone connected (SM-S948B, Android 16) with the EAS development build from TheGyam. Smoke run SETUP-smoke-1011: bundle from local Metro, routing gate (local sign-in 200), code verify, sign-out. Found F1 (sign-out never reaches the server) and F2 (seeded accounts unconfirmed); see findings.md.
- [x] ~~26-09-2026 06:30~~ AUTH-01 run on the phone (1033: P+A) and the emulator (0508: all parts), both audited. Emulator run: one undisclosed stray signup from scrambled typing, D2 is a real crash (F3). See each report's Audit section.
- [x] ~~26-09-2026 06:30~~ Emulator vs phone split written (qa/DEVICES.md); phone-only checks go into PHONE-01.
- [ ] Next plans: looks feed, booking lifecycle (two accounts), client/stylist mode switch.
- [ ] Write PHONE-01 (confirm F3, scrolling, real keyboard + password prompt, yasante.com link, camera, background kill).
