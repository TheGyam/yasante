# Handoff: where QA stands (updated 24-10-2026)

Read `qa/AGENTS.md`, `qa/README.md`, then the open items at the top of `qa/task.md`.

- **Next:** the queue is done (24-10). Reruns: NEW-02 P done (`NEW-02-20261024-0749`, F61 #143;
  V1c still a candidate: owner to swipe by hand); next LOOKS-02's G after W3, STAFF-02 T; DIARY-01 B4–B5 once #131 is fixed.
  Audited 24-10: DIARY-01 (F49–F51), WEBBOOK-01 (F52–F54), FIXES-01 (every fix holds, F55),
  NEW-01 (F56), NEW-02 (F57, F58 privacy; P void), STAFF-02 (F59, F60: authors never told
  of moderation). `emus` boots `en-GB` and stops cleanly; `qadb type` flags pre-filled
  fields. Dev client sha256 `c04a06c5…` still current. Waiting on Yaw: whether app-posted
  stylist work should also go on her page; whether F60 matters legally (EU platform rules).
- **Reporting upstream:** the owner said (24-10) to report findings as needed. File each
  confirmed finding as an issue on `TheGyam/yasante` (label `bug`), in the style of #127/#130:
  plain English, file and line, what the test showed, the fix. Never an AI-authorship line.
- **Backend pytest:** use `--create-db` (as CI does). `pytest.ini` has `--reuse-db`, and a
  reused test database can have lost the data-migration rows: three false failures on 24-10.
- **Queue after it**, one at a time with an audit each:
  the NEW-02 P/V1c rerun, then a short LOOKS G rerun after W3, and DIARY-01 B4–B5 once #131 is fixed. Before each, check the plan against upstream changes
  (testIDs, wording); the terms notice after sign-in is handled in BOOK-01 S3 / AGENTS §6.
- **Security:** `qa/bin/secscan <RUN>` is green apart from known xfails (F25, F36,
  F41–F47). Upstream issues #124–#129 are open (F41–F47); their fixes will show up as XPASS.
  All the code review's claims are now tested.
- **Phone (S23 Ultra):** release-build checks done 24-10 (task.md): F31 and F37 closed,
  manifest and logcat clean, scrolling smooth, push works. Still to do: F32 (needs test data).
- **Unattended queue (from 24-10-2026):** `qa/bin/agy-run <PLAN>` starts a plan headless
  (fresh Gemini 3.8 Flash conversation, `--dangerously-skip-permissions`, allowed by the
  owner for QA runs only). Claude's loop: start one plan; wait for `agy-run status` to go
  inactive (30-min wake-ups as a backstop); audit, and also check `agy-run commands`
  against `qa/AGENTS.md` §3; commit, push; next plan only if the run was valid. A void run
  with a small harness cause: fix, rerun. Anything bigger: stop the queue and write it at
  the top of this file. Phone-only steps wait for the owner.
- While an Antigravity run is up: static `secscan` and pytest are safe (own test
  database); `secscan --dynamic`, `env-up`/`env-down` and the emulators are not.
