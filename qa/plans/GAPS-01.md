# GAPS-01: Two checks the last runs couldn't make

**Device: emulators only**: `client` (emulator-5554), `stylist` (emulator-5556).
One agent drives both **in turn**.
**Covers:** the reset link with no token (AUTH-01 C3, run with the wrong link last time)
and the attendance question more than 48 h ahead (BOOK-01 T1, spoiled by a 6-hour pause).
**Time:** about 30 minutes.

Read `qa/AGENTS.md` first (again, since it changed). Its rules override anything here.

**Two changes since the last runs:**
- **`qadb step` now writes the report for you.** The first step creates
  `qa/reports/<RUN>.md`; each step adds its own section with the summary already in it.
  Before the next step, fill in that section's verdict, checks and observations. Never
  edit the summary `qadb` wrote. Fill in the report header yourself.
- **Only the tools in `qa/AGENTS.md` §3.** The BOOK-01 run used `manage.py shell`, `curl`
  and direct API calls. **None of that, not even to read.** If a step seems to need
  something the tools can't do, stop that step, write `NEEDS: <what and why>` in its
  section, and carry on with the next.

Notation as in BOOK-01: `C:` = `qa/bin/qadb -d client`, `S:` = `qa/bin/qadb -d stylist`.

---

## S: Setup

**S1.**
```
qa/bin/env-down
qa/bin/emus up --wipe 2        # client and stylist only
qa/bin/env-up --reseed <RUN>
qa/bin/metro <RUN>
qa/bin/qadb start <RUN> client=emulator-5554 stylist=emulator-5556
```
`RUN` = `GAPS-01-<YYYYMMDD>-<HHMM>`. Expect `dev_client: true` twice, or stop: BLOCKED.

**S2.** BOOK-01 S2, for `client` then `stylist` only. Expect the welcome screen on both.

---

## G1: A reset link with no token (the client, **still signed out**)

Do this **before** signing the client in.

**G1.** `C: link "yasante:///auth/reset-password?uid=x"`. That's exactly this link: **no `token`**,
and the `yasante://` form, since the emulator's dev client ignores `https://yasante.com`
links. Wait 3 s, `C: step G1`.
Expect an alert `This link has expired` / `Request a new reset link and try again.`
**Record** the exact title and text. If there's no alert, **record** the screen that
appears instead. Do not type anything into it.

**G1b.** Dismiss the alert (`C: tapon OK --exact`, or the only button there is), wait 2 s,
`C: step G1b`. Expect `Reset your password` (the forgot-password screen).
**Server check:** `grep -cE 'reset-password|forgot-password' qa/runs/<RUN>/server.log`
should give **0**: nothing should reach the server for a link with no token.

---

## G2: The attendance question more than 48 h ahead

**G2a: Sign in.** BOOK-01 S3 for `client` (Naomi) and `stylist` (Yaa), then BOOK-01 S4
on the stylist. **Server check:** 2 login `200`s.

**G2b: Book at least 3 days ahead.** `C: link "yasante:///book/braidedbybisi"`, wait 4 s.
`C: tapon "Take down and wash" --exact`, wait 2 s, `C: swipe up`. Pick the **first time on
the first day that is at least 3 full days after today** (today is the laptop's date).
Scroll the days if needed. Write down the label as **T** and work out how many hours ahead
it is; it must be **more than 72**. Tick `I accept Braided by Bisi`,
`C: tapon booking-send`, wait 4 s, `C: step G2b`.
**Server check:** `POST /api/bookings/` **201**. Get the ID with
`qa/bin/bookings naomi.grant@yasante.dev` and call it **B1**.

**G2c: Confirm it.** `S: link "yasante:///requests/<B1>"`, wait 3 s, `S: swipe up`,
`S: tapon request-accept`, wait 4 s, then `S: tapon request-deposit-received`, wait 4 s,
`S: step G2c`.
**Views** (`qa/bin/bookings naomi.grant@yasante.dev <B1>`): `status: "confirmed"`.
If the accept screen differs from BOOK-01 A2–A4, say how in the section.

**G2d: The check.** `C: link "yasante:///bookings/<B1>"`, wait 3 s, `C: step G2d`.
Expect **no** `Still coming …?` question, with no `Yes, I’m coming` and no
`I can’t make it` buttons. **Views:** `attendance_confirmed_at: null`.
In the section, **state the hours between now and T**, as you worked them out in G2b.
If the question **does** show more than 48 h ahead, that's a **FAIL**.

---

## Z

`qadb end`, `qa/bin/env-down`, `qa/bin/emus down`. Paste the `qadb end` output at the
bottom of the report. Report each step; no overall verdict.
