# AUTH-01 rerun: the whole plan again, on one emulator, from scratch

**Device: emulator** `client` (emulator-5554) only.
Run **every part of `qa/plans/AUTH-01.md`** (P, A, B, BL, C, D, Z) in order, with the
changes below. Where this file and AUTH-01 disagree, this file wins; where either
disagrees with `qa/AGENTS.md`, AGENTS.md wins. Read AGENTS.md again first, since it
changed.

Why again: the last emulator run (`AUTH-01-20260926-0508`) submitted scrambled text
(`maa.achieng…`, `…@example.come.dev`) and created an account it didn't report, and it
marked a crash as a PASS. `qadb type` now checks what landed in the field, so that
shouldn't recur, but the results need redoing cleanly.

## Changes to AUTH-01

**Setup, replacing P1–P3.** Wipe everything first:
```
qa/bin/env-down
qa/bin/emus down
qa/bin/emus up --wipe 1        # just the first emulator, factory-reset, Yasante reinstalled
qa/bin/env-up --reseed <RUN>
qa/bin/metro <RUN>
qa/bin/qadb start <RUN> client=emulator-5554
```
`RUN` = `AUTH-01-<YYYYMMDD>-<HHMM>`. With one device in the run, `qadb` needs no `-d`.
Expect `"dev_client": true`.

**P4.** Same, plus Android's notification prompt: whenever `qadb` answers
`OUTSIDE_APP … permissioncontroller`, run `qadb tapon permission_deny_button` and continue.
A "save password" prompt shouldn't appear (autofill is off on the emulators); if one
does, stop and say so.

**Typing, everywhere.** `qadb type` now reads the field back.
- `typed '…': field reads back correctly`: fine.
- `REFUSED: TYPE_MISMATCH`: **do not submit.** Run `qadb clearfield`, type again, and
  note it under Other observations.
- To empty a field, use `qadb clearfield` instead of `key DEL` repeated.

**Test data.** Use exactly the addresses in AUTH-01 (`a01.<STAMP>.client@example.com`,
and so on). If an account appears in `mailbox` or `dbcheck` that the plan didn't ask for,
say so in the step where it happened.

**Every request you didn't mean to make.** After B3, B4, B5 and B6, run
`grep -cE '"POST /api/auth/signup/' qa/runs/<RUN>/server.log` and paste the count.
It must match the number of sign-ups the plan has asked for so far.

**C3/C4 (reset links).** On the emulator, the dev client doesn't take
`https://yasante.com/…` links. Try the https link first and capture it (expected to fail;
that's fine, and it's a phone-plan item). Then open the **same link as
`yasante:///auth/reset-password?uid=…&token=…`** (copy `uid` and `token` from the
mailbox link) and continue. Say which form worked. Do the same in C7 and C10.

**D2/D3 (stylist sign-up).** A crash here is a finding (F3), **not** a PASS. If the app
restarts on its own (a new cold start, a new process ID, or the dev-client loading
screen), mark the step **FAIL**, capture it, run `qadb launch` to carry on, and quote the
first `E/` lines of that step's `app.log`.

**Z.** `qadb end`, `qa/bin/env-down`, `qa/bin/emus down`.

## The report

`qa/reports/<RUN>.md` from the template, written as you go. Don't write a summary
verdict for the whole run ("certified", "victory", "100%"). Report each step; Claude
decides what the run shows.
