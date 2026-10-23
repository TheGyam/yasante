# Handoff: where QA stands (updated 24-10-2026)

Read `qa/AGENTS.md`, `qa/README.md`, then the open items at the top of `qa/task.md`.

- **Next:** audit `LOOKS-02-20261024-0005` (Antigravity window, Gemini 3.8 Flash, started
  00:05 24-10; the first run with the reseed fix: fresh database, switches present). The
  earlier audits in `qa/reports/*.md` show the method; its plan's audit notes are at the
  bottom of `qa/plans/LOOKS-02.md` (server-side switch gate is already covered by
  `backend/tests/test_looks.py::test_multi_photo_switch_gates_more_than_one_photo`). Commit
  the report with the audit, push `ck/quality-check`. Then start the unattended queue with
  `qa/bin/agy-run DIARY-01` (plan checked against upstream 24-10). Dev client
  `qa/apk/dev-client.apk`, sha256 `c04a06c5…`, is still current.
- **Backend pytest:** use `--create-db` (as CI does). `pytest.ini` has `--reuse-db`, and a
  reused test database can have lost the data-migration rows: three false failures on 24-10.
- **Queue after it**, one at a time with an audit each: DIARY-01, WEBBOOK-01, FIXES-01,
  NEW-01, NEW-02, STAFF-02. Before each, check the plan against upstream changes
  (testIDs, wording); the terms notice after sign-in is handled in BOOK-01 S3 / AGENTS §6.
- **Security:** `qa/bin/secscan <RUN>` is green apart from known xfails (F25, F36,
  F41–F47). Upstream issues #124–#129 are open (F41–F47); their fixes will show up as XPASS.
  All the code review's claims are now tested.
- **Phone (S23 Ultra):** release-build checks done 24-10 (task.md): F37 closed, manifest
  and logcat clean. Still to do on a device: F31, F32 with a build that has their fixes.
- **Unattended queue (from 24-10-2026):** `qa/bin/agy-run <PLAN>` starts a plan headless
  (fresh Gemini 3.8 Flash conversation, `--dangerously-skip-permissions`, allowed by the
  owner for QA runs only). Claude's loop: start one plan; wait for `agy-run status` to go
  inactive (30-min wake-ups as a backstop); audit, and also check `agy-run commands`
  against `qa/AGENTS.md` §3; commit, push; next plan only if the run was valid. A void run
  with a small harness cause: fix, rerun. Anything bigger: stop the queue and write it at
  the top of this file. Phone-only steps wait for the owner.
- While an Antigravity run is up: static `secscan` and pytest are safe (own test
  database); `secscan --dynamic`, `env-up`/`env-down` and the emulators are not.
