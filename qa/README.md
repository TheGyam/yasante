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
3. When it's done, tell Claude: *"Audit run <RUN>."* Claude checks the journal, hashes,
   screenshots, server log and database, then writes findings into the report's
   `## Audit` section.

## How the guardrails work

- `qadb` is the only way onto the phone. It refuses any action or capture unless
  `com.yasante.app` (or Android's permission prompt) has focus, trims the UI tree to the
  app's own windows, reads the app's log by its process ID only, and opens only
  yasante.com / `yasante://` links, inside the app.
- `metro` writes a gitignored `.env.development.local` pointing the app at
  `http://localhost:8000` (tunnelled over USB by `adb reverse`). Expo's dev runtime lets
  the committed `.env.development` (the **live** API) win over shell variables, so the
  file is the only override that works. `env-down` removes it.
- Every plan opens with a routing gate: sign in with a seeded account that exists only
  in the local database, and stop unless the local server logged that request.

## Plans

| ID | Covers | Status |
| :--- | :--- | :--- |
| AUTH-01 | welcome, sign-in, sign-out, client and stylist sign-up, email code, password reset | written |
