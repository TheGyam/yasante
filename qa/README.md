# On-device QA

Manual, evidence-backed test runs of the Android app on a real phone, against a local
backend. Claude writes the plans, Antigravity executes them, and Claude audits each run
from the raw evidence rather than from the report.

```
qa/
  AGENTS.md          rules the executing agent must follow (phone guardrails, evidence)
  plans/<ID>.md      one plan per section or interaction of sections
  reports/<RUN>.md   the executor's report for one run
  runs/<RUN>/        raw evidence (gitignored): server.log, journal.jsonl, steps/, MANIFEST.json
  bin/               env-up, metro, qadb, mailbox, dbcheck, env-down
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
