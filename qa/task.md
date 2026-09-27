# QA task list

- [x] ~~25-09-2026 10:10~~ Local test harness: `env-up`/`metro`/`env-down` bring up Postgres+Redis (podman), seeded Django and Metro, with the app pointed at localhost via a gitignored `.env.development.local` — Expo's dev runtime lets the committed `.env.development` (live API) beat shell variables, so exporting alone sent traffic to production.
- [x] ~~25-09-2026 10:10~~ `qadb`: the only door to the owner's phone — refuses actions/captures unless Yasante has focus, app-only UI tree and logs, link allowlist, hashed journal per run. `mailbox` and `dbcheck` give ground truth to check reports against.
- [x] ~~25-09-2026 10:10~~ `qa/AGENTS.md` executor rules and plan AUTH-01 (sign-in, sign-out, sign-up, email code, reset, stylist sign-up).
- [x] ~~25-09-2026 10:24~~ Phone connected (SM-S948B, Android 16) with the EAS development build from TheGyam. Smoke run SETUP-smoke-1011: bundle from local Metro, routing gate (local sign-in 200), code verify, sign-out. Found F1 (sign-out never reaches the server) and F2 (seeded accounts unconfirmed); see findings.md.
- [x] ~~26-09-2026 06:30~~ AUTH-01 run on the phone (1033: P+A) and the emulator (0508: all parts), both audited. Emulator run: one undisclosed stray signup from scrambled typing, D2 is a real crash (F3). See each report's Audit section.
- [x] ~~26-09-2026 06:30~~ Emulator vs phone split written (qa/DEVICES.md); phone-only checks go into PHONE-01.
- [ ] Next plans: looks feed, booking lifecycle (two accounts), client/stylist mode switch.
- [x] ~~26-09-2026 22:40~~ BOOK-01 written for three emulators (client, stylist, client2), grounded in a dry run: request, slot race, accept + deposit, address privacy, moves, close-out, review, check-ins, lapse, cancellations, waitlist, no-show. New tools: emus (3 wiped emulators on London time), bookings (what each side is sent), timewarp (booking clocks), qadb -d, typing read-back, clearfield. AUTH-01-RERUN.md for a clean emulator rerun. Candidate F4 (request screen mixes time zones).
- [x] ~~26-09-2026 23:55~~ AUTH-01-RERUN on a clean emulator (run AUTH-01-20260926-2221), audited: integrity good, no stray accounts (typing read-back fixed it), F1 and F3 reproduced. The rate limit works as configured; the apparent "17 attempts" was lost taps with the keyboard open (candidate F5). Reopening mid sign-up sends a new code (candidate F6). C3 not run as written (bogus token instead of none). First half of the report is not verbatim.
- [ ] Antigravity: BOOK-01; Claude audits it.
- [ ] qadb step writes each step's heading and verbatim summary into the report itself, so reports can't be written from memory (after BOOK-01, not mid-run).
- [ ] Write PHONE-01 (confirm F3, scrolling, real keyboard + password prompt, yasante.com link, camera, background kill).
