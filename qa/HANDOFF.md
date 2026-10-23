# Handoff: where QA stands (updated 24-10-2026)

Read `qa/AGENTS.md`, `qa/README.md`, then the open items at the top of `qa/task.md`.

- **Next run:** **LOOKS-02** again. The 23-10 23:35 run was void: `env-up --reseed`
  flushed the rows data migrations seed, so the switch didn't exist (fixed, see its
  audit). Dev client `qa/apk/dev-client.apk`, sha256 `c04a06c5…`, is still current. When it
  ends, audit the newest `qa/runs/LOOKS-02-*` against its report (the earlier audits in
  `qa/reports/*.md` show the method), commit, push `ck/quality-check`.
- **Queue after it**, one at a time with an audit each: DIARY-01, WEBBOOK-01, FIXES-01,
  NEW-01, NEW-02, STAFF-02. Before each, check the plan against upstream changes
  (testIDs, wording); the terms notice after sign-in is handled in BOOK-01 S3 / AGENTS §6.
- **Security:** `qa/bin/secscan <RUN>` is green apart from known xfails (F25, F36,
  F41–F47). Upstream issues #124–#129 are open (F41–F47); their fixes will show up as XPASS.
  All the code review's claims are now tested.
- **Phone (S23 Ultra):** the owner installed Yaw's Expo build; release-build checks
  (manifest, F37 from outside, logcat) need it plugged in with USB debugging.
- While an Antigravity run is up: static `secscan` and pytest are safe (own test
  database); `secscan --dynamic`, `env-up`/`env-down` and the emulators are not.
