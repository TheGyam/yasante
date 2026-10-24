# Handoff: where QA stands (updated 24-10-2026)

Read `qa/AGENTS.md`, `qa/README.md`, then the open items at the top of `qa/task.md`.

- **Next (24-10, 14:50):** Yaw merged **#149** (14:26), closing #124–#147; merged here,
  suites green, static secscan green (F41–F47, F64 XPASS, marks off; only F36 xfail, kept by
  design). Rechecked already: F25, F41–F47, F64 (secscan), F52, F59, F60
  (`qa/sec/test_rechecks_149.py`), F50, F56 (code read). **Running:** `DIARY-01` full rerun
  (`agy-run`, started 14:44, transcript `qa/runs/agy/DIARY-01-20261024-1444.jsonl`): audit it
  for F49 (B4–B5), F51 (B7 confirm, R5 `--accept-dialog`) and F65 (plait mark in the
  studio's chips, look at the screenshots). **Then, one at a time:** POLICY-01 N plus the
  hand-run X steps (F63 #145: Efua `Allow` with the backend frozen, sign out, Abena signs in,
  no consent row for Abena); NEW-02 P and W2 (F57, F58: `GET /api/places/postcode/` in the
  server log, F61); website post wording (F62, LOOKS-02 H or SITE-01 B7); app photo ✕ (F48);
  website booking page (F53); `<name> asked for` (F54) and `UK time` marks (F55) in FIXES-01 F.
- **Earlier (24-10, 13:00):** the ungated queue was empty: the "NEW-02 P rerun" was already
  done in `NEW-02-20261024-0749` (P1–P4, valid, F61 #143).
- **Earlier (24-10, 12:25):** **LOOKS-02 part H done** (`LOOKS-02-20261024-1148`, unattended,
  valid: the 3-photo work shows and pages right in app and site); qadb's re-tap works. New
  **F65 #147** (website plait mark is an empty box: `@font-face` weight).
- **Earlier (24-10, 09:05):** upstream `master` unchanged since #123; #124–#145 open. Done today by
  Claude (owner: "do one or two tests on your own"): **POLICY-01** (`POLICY-01-20261024-0830`:
  real policies right in app and site, server tips; **F63 #145** consent hand-over at sign-out)
  and **STAFF-02 T** (`STAFF-02-20261024-0851`, holds). Static secscan green (no XPASS).
  F62 #144 (wording). **Still to do:** LOOKS-02 part H (`agy-run LOOKS-02 "parts S, K3, W1, W2,
  W3, H and Z only…"`): the 08:20 attempt was void, **Gemini quota out until ~11:44 CEST**;
  Dynamic secscan done (F64 #146); security layer 1 for #82–#123 closed. NEW-02 V1c withdrawn
  (owner's swipe pages). DIARY-01 B4–B5 waits on #131. Waiting on Yaw: app-posted stylist work on her
  page; F60 legally.
- **Reporting upstream:** the owner said (24-10) to report findings as needed. File each
  confirmed finding as an issue on `TheGyam/yasante` (label `bug`), in the style of #127/#130:
  plain English, file and line, what the test showed, the fix. Never an AI-authorship line.
- **Backend pytest:** use `--create-db` (as CI does). `pytest.ini` has `--reuse-db`, and a
  reused test database can have lost the data-migration rows: three false failures on 24-10.
- **Queue after it**, one at a time with an audit each:
  DIARY-01 B4–B5 once #131 is fixed, POLICY-01 N/X once #145 is (NEW-02 P rerun done 08:20; LOOKS G rerun done as part H, 12:16). Before each, check the plan against upstream changes
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
