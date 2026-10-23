# Handoff: where QA stands (updated 23-10-2026)

Read `qa/AGENTS.md`, `qa/README.md`, then the open items at the top of `qa/task.md`.

- **Running now:** Antigravity (Gemini 3.8 Flash) is rerunning **LOOKS-02** on the dev
  client rebuilt 23-10 (`qa/apk/dev-client.apk`, sha256 `c04a06c5…`). When it ends,
  audit the newest `qa/runs/LOOKS-02-*` against its report (the earlier audits in
  `qa/reports/*.md` show the method), commit, push `ck/quality-check`.
- **Queue after it**, one at a time with an audit each: DIARY-01, WEBBOOK-01, FIXES-01,
  NEW-01, NEW-02, STAFF-02. Before each, check the plan against upstream changes
  (testIDs, wording); the terms notice after sign-in is handled in BOOK-01 S3 / AGENTS §6.
- **Security:** `qa/bin/secscan <RUN>` is green apart from known xfails (F25, F36,
  F41–F44). Upstream issues #124–#126 are open; their fixes will show up as XPASS.
  Remaining review claims to test are listed in `qa/task.md`.
- **Phone (S23 Ultra):** the owner installed Yaw's Expo build; release-build checks
  (manifest, F37 from outside, logcat) need it plugged in with USB debugging.
- While an Antigravity run is up: static `secscan` and pytest are safe (own test
  database); `secscan --dynamic`, `env-up`/`env-down` and the emulators are not.
