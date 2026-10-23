# WEBBOOK-01: Booking on yasante.com, with no app at all

**Device: browser + one emulator.** Kojo books on the website (`qa/bin/qaweb`); Ama answers
in the app on the `stylist` emulator (emulator-5556). One agent drives both **in turn**.
**Covers:** upstream `eba2e4d` (clients book on yasante.com, see their bookings and manage
them), `f4f21c9` (booking updates are emailed to anyone with no phone signed in),
`0e8821a` (sign out from the site's header, and at the foot of Your bookings on a phone),
plus address privacy for "Come to me" on the web. None of this has been run before.
**Time:** about 60 minutes.
**Status:** written 19-10-2026 from the code; checked against upstream 24-10-2026 (the plait mark in A1; `Your postcode` stays, Ama is in the UK; the optional `Is it for something?` chips need no step; no terms sheet on the website). Claude dry-ran only the website's sign-in and
sign-out (`SETUP-dry-1018`); expect plan errors in parts B–M and say exactly what you saw.

Read `qa/AGENTS.md` first (again: §8 now says **`qaweb --nth` counts from 1**). Its rules
override anything here. **Only the tools in `qa/AGENTS.md` §3**. If a step seems to need
another, write `NEEDS: …` and move on.

---

## Notation and test data

| Short | Command | Who |
| :--- | :--- | :--- |
| `K:` | `qa/bin/qaweb -w visitor` | Kojo Asante, `new@yasante.dev`, **never signed in on a phone in this run** |
| `S:` | `qa/bin/qadb -d stylist` | Ama Owusu, `ama@yasante.dev`, page **Braids by Ama** (`braidsbyama`) |

Passwords are `password123`. Ama works Tue–Fri 09:00–18:00 and Sat 08:00–16:00 and
**travels** up to 5 miles from Peckham. Her `Take down and wash` costs £30 (1 hr).

**Mail check** where a step says so: `qa/bin/mailbox <RUN> --to new@yasante.dev --last`;
paste it. **Every email** Kojo gets must be checked for the street `4 Choumert Grove`
before Ama confirms (it's his own address, so it may be in his mail; the point is Ama's
side) and for anything that isn't his.

**Server check, every step that saves something:** after it, run
`grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3` and paste it. Any new
`5xx` is a **FAIL**. A `4xx` is OK only where the step expects a refusal.

---

## S: Setup

**S1.**
```
qa/bin/env-down
qa/bin/emus up --wipe 2
qa/bin/env-up --reseed <RUN>
qa/bin/web-up <RUN>
qa/bin/metro <RUN>
qa/bin/qaweb start <RUN>
qa/bin/qadb start <RUN> client=emulator-5554 stylist=emulator-5556
```
`RUN` = `WEBBOOK-01-<YYYYMMDD>-<HHMM>`. `client` isn't used. Expect `dev_client: true`.

**S2.** BOOK-01 S2 and S3 on `stylist` with Ama, then S4 (stylist mode). The login `200` is
the routing gate.

**S3: Kojo has no phone.** `qa/bin/dbcheck new@yasante.dev`: paste it. **Record** whatever
it says about devices or push tokens. `qa/bin/pushlog new@yasante.dev 3`: paste it.

---

## B: Kojo books on the website

**B1: Signed out.** `K: open /braidsbyama --site`, wait 3 s, `K: step B1`. Expect
`Request a booking` with `Right here, no app needed.` `K: click "Request a booking"`,
wait 3 s, `K: step B1b`. **Record** where it goes (`K: url`) and what it asks.

**B2: Sign in.** If B1b asked to sign in, follow it: `K: fill "Email" "new@yasante.dev"`,
`K: fill "Password" "password123"`, `K: click "Sign in" --role=button`, wait 3 s. Else
`K: open /auth/login?next=/book/braidsbyama --site` and sign in the same way. Wait 3 s,
`K: step B2`. **Expect** `/book/braidsbyama`, his name in the header, a `Sign out` in the
header.

**B3: The service and the time.** `K: click "Take down and wash"` (`K: find` first: the
service buttons read `<name>, <price>`), wait 2 s, `K: step B3`. **Record** the price, the
deposit, and the picker's ideas (`Soonest: …`). Pick the `Soonest` idea
(`K: click "Soonest"`), wait 2 s, `K: step B3b`. **Record** the time chosen; call it **T**.

**B4: Come to me, with no address.** `K: click "Come to me"`, `K: step B4`. Expect
`Your house number and street`, `Your postcode` and `Add your street and postcode so they
can get to you.`, with the send button off. **Record** the line under the address.

**B5: With the address.** `K: fill "Your house number and street" "4 Choumert Grove"`,
`K: fill "Your postcode" "SE15 4RB"`, tick the terms (`K: find "I accept"`, then
`K: check` it), `K: click "Send request"`, wait 4 s, `K: step B5`. **Expect** `They’ll reply
soon.` or the request's page. **Server check:** `POST /api/bookings/` `201`.
`qa/bin/bookings new@yasante.dev`: the newest ID is **B1**; `qa/bin/bookings
new@yasante.dev <B1>`: paste it. **Ama's side must not contain `4 Choumert Grove`**; if it
does, **FAIL**. Mail check: **Record** what arrived (subject and the line about the
request), and whether `4 Choumert Grove` is in it.

**B6: Your bookings.** `K: open /bookings --site`, wait 3 s, `K: step B6`. **Record** how
B1 is listed. `K: open /bookings/<B1> --site`, wait 3 s, `K: step B6b`. **Record**
`The time you asked for`, the deadline line (`If there’s no answer by then, it closes on
its own`), and the buttons (expect `Withdraw the request`).

---

## A: Ama answers in the app, Kojo hears by email

**A1: She reads it.** `S: link "yasante:///requests/<B1>"`, wait 4 s, `S: step A1`. **Expect**
`At their place` then the plait mark then `<area>` (the line reads like `At their placePeckham`; no ` · ` since #60) and no street. **Record** the area.

**A2: Accept, with the deposit.** `S: swipe up`, `S: tapon request-accept`, wait 4 s,
`S: step A2`. Server: `…/accept/` `200`. `qa/bin/bookings new@yasante.dev <B1>`: paste.
**Expect** `awaiting_deposit` and still no street on Ama's side. Mail check: **expect** an
email to Kojo that she accepted, with the deposit and where to send it. **Record** the
subject and body word for word. **No email** is a **FAIL** (he has no phone).
`qa/bin/pushlog new@yasante.dev 3`: paste; **Record** the delivery column (expect
`emailed`).

**A3: What the website shows.** `K: reload`, wait 3 s, `K: step A3`. **Record** the
status, the deposit line, and `If the deposit hasn’t arrived by then, the slot is
released` with its time.

**A4: Deposit received.** `S: link "yasante:///requests/<B1>"`,
`S: tapon request-deposit-received`, wait 4 s, `S: step A4`. **Expect** the street
`4 Choumert Grove, SE15 4RB` on Ama's side now. Mail check: **Record** the confirmation
email. `K: reload`, `K: step A4b`: **Record** what Kojo's page shows (`Add to calendar`,
`Braids by Ama is coming to you`, what's left to pay).

---

## M: Kojo manages it on the web

**M1: Ask to move it.** `K: click "Ask to move it"`, wait 2 s, `K: step M1`. **Record** what
opens. Pick the first time offered that isn't T, send, wait 3 s, `K: step M1b`. **Expect**
a `…/move/` `200` and the request shown as waiting for Ama. Mail check: nothing new is
fine; **Record** it.

**M2: Ama declines the move.** `S: link "yasante:///requests/<B1>"`, wait 4 s,
`S: step M2`. **Record** the move request. Decline it (`S: find "Keep"` or the decline
button as shown), wait 3 s, `S: step M2b`. Mail check: **expect** an email telling Kojo the
time stays T. **Record** it.

**M3: Cancel.** `K: reload`, `K: click "Cancel this booking"`, wait 2 s, `K: step M3`.
**Record** the dialog word for word (`Cancel this booking?`, and whether it says it costs
him or not: `You’re in good time, so this costs you nothing.` vs `Cancelling now counts
against you.`). `K: click "Cancel it"`, wait 3 s, `K: step M3b`. **Server check:**
`…/cancel/` `200`. Mail check (Kojo) and `qa/bin/pushlog ama@yasante.dev 3` (Ama): paste
both.

---

## O: Signing out

**O1: Header, desktop.** `K: click "Sign out" --role=button`, wait 2 s, `K: step O1`.
Expect the home page, signed out. **Server check:** `POST /api/auth/logout/` `204`.
`K: open /bookings --site`, wait 3 s, `K: step O1b`. **Expect** it asks him to sign in;
any booking of his showing is a **FAIL**.

**O2: On a phone-sized page.** `K: viewport phone`, sign in again as B2, `K: open /bookings
--site`, wait 3 s, `K: scroll bottom`, `K: step O2`. **Expect** `Sign out` at the foot of
`Your bookings`. **Record** whether the header still offers it at this width.
`K: click "Sign out" --role=button` (the one at the foot; `--nth` if two), wait 2 s,
`K: step O2b`: signed out, `204`.

---

## Z: End

1. `qa/bin/qadb -d stylist clear`.
2. `qa/bin/qaweb end`, then `qa/bin/qadb end`; paste its output at the bottom.
3. `qa/bin/env-down`.

---

## For Claude's audit (the executor can ignore this)

- Every email's HTML and text body for a header/CRLF injection and for anything not
  Kojo's (`backend/apps/bookings` email templates); the API answer to Ama before A4 for the
  street, field by field.
- Writes expected: B5 request, A2 accept, A4 deposit, M1 move, M2 decline, M3 cancel;
  sign-ins at S2, B2, O2; logouts O1, O2b.
- CSRF and access on `/book/<handle>`, `/bookings/<id>` belong to `qa/sec`'s route
  classification (mine), not this run.
