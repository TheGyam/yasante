# NEW-01: New in booking: book again, "Come to me", what's left to pay, add to calendar

**Device: emulators only**: `client` (emulator-5554), `stylist` (emulator-5556).
One agent drives both **in turn**.
**Covers:** upstream's `0fc5a2d` (book again, add to calendar, balance due) and `99e383d`
(a stylist who travels gets the client's address: street held back until confirmed).
**Time:** about 60 minutes.

Read `qa/AGENTS.md` first (again, since it changed). Its rules override anything here.
`qadb step` opens each step's section in the report; fill it in before the next step.
**Only the tools in `qa/AGENTS.md` §3**: no `manage.py`, `curl`, `adb` or `git`, not even
to read. If a step seems to need one, write `NEEDS: …` in its section and move on.

---

## Notation and test data

`C:` = `qa/bin/qadb -d client`, `S:` = `qa/bin/qadb -d stylist` (as in BOOK-01).

| Who | Account (password `password123`) | Device |
| :--- | :--- | :--- |
| Efua | `client@yasante.dev` (Efua Mensah) | client |
| Ama, page **Braids by Ama** (`braidsbyama`) | `ama@yasante.dev` (Ama Owusu) | stylist |

Braids by Ama: works from **home** and **travels** (up to 5 miles from Peckham), Tue–Sat,
48 hours' notice, a **fixed £20 deposit**. Menu: Knotless braids from £120, Cornrows from
£45, **Take down and wash £30** (1 h).

Seeded booking used below (copy the ID exactly):

| Name in this plan | ID | What it is |
| :--- | :--- | :--- |
| `bk_bisi_done` | `7fe7d4eb-0774-5dfb-a5cc-fde524da7976` | Efua's **finished** Knotless braids (£160) with Braided by Bisi, 4 Sep |

New bookings: `qa/bin/bookings client@yasante.dev`, newest first. **Views:**
`qa/bin/bookings client@yasante.dev <ID>` prints what each side's app is sent.

**Server check, every step that saves something:** after it, run
`grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3` and paste it. Any new
`5xx` is a **FAIL**. A `4xx` is only OK where the step expects a refusal, with one
exception: a `401` followed at once by `POST /api/auth/refresh-token/ 200` and the same
request succeeding is the app renewing its 15-minute sign-in, not a failure. Paste it and
say so.

**Keyboard.** `qadb tapon` closes the keyboard itself when the button is under it and
prints `closed the keyboard first`. That's expected.

---

## S: Setup

**S1.**
```
qa/bin/env-down
qa/bin/emus up --wipe 2
qa/bin/env-up --reseed <RUN>
qa/bin/metro <RUN>
qa/bin/qadb start <RUN> client=emulator-5554 stylist=emulator-5556
```
`RUN` = `NEW-01-<YYYYMMDD>-<HHMM>`. Expect `dev_client: true` twice, or stop: BLOCKED.
**S2.** BOOK-01 S2 for `client`, then `stylist`.
**S3.** BOOK-01 S3 with Efua (client) and Ama (stylist). 2 login `200`s, or stop.
**S4.** BOOK-01 S4 (Ama into stylist mode).

---

## R: Book again (Efua)

**R1.** `C: link "yasante:///bookings/7fe7d4eb-0774-5dfb-a5cc-fde524da7976"`, wait 4 s,
`C: swipe up`, `C: step R1`. Expect a section `Book Braided by Bisi again` with
`The same again` (under it, the service: `Knotless braids`) and `Something different`
(`Pick another style from their menu`).
**R2: The same again.** `C: tapon booking-again`, wait 4 s, `C: step R2`. Expect
`Book Braided by Bisi` with **Knotless braids already chosen**. **Record** what's
chosen (service, length, size), the price and the deposit. Send nothing. `C: key BACK`.
**R3: Something different.** `C: tapon booking-again-different`, wait 4 s, `C: step R3`.
Expect the same booking screen with **nothing chosen**. `C: key BACK`.

---

## A: "Come to me": a booking at the client's (Efua → Ama)

**A1: Where?** `C: link "yasante:///book/braidsbyama"`, wait 4 s,
`C: tapon "Take down and wash" --exact`, wait 3 s, `C: swipe up`, `C: step A1`. Expect a
`Where?` line with two choices, `At theirs · Peckham` and `Come to me`. **Record** which
one is selected.
**A2: Come to me, no address yet.** `C: tapon "Come to me"`, wait 2 s, `C: step A2`.
Expect `Your house number and street` and `Your postcode`, and under them
`They see your postcode area first (they travel up to 5 miles from Peckham), and your
street once they confirm.` Pick the **first time on the first day** (call it **T**),
`C: swipe up`, tick the terms, `C: step A2b`. **Expect** the send button to stay off,
with `Add your street and postcode so they can get to you.` under it. **Record** it.
**A3: With the address.** `C: tapon booking-street`, type `4 Choumert Grove`,
`C: tapon booking-postcode`, type `SE15 4RB`, then (new 04-10: long notes now show in
full) `C: tapon "Anything they should know"`, type
`QA long note: please bring the long-bristle brush and a spare pack of hair, ring the bell twice because the buzzer is broken, and park on the left side of the road.`,
`C: key BACK`, `C: step A3`. **Record**
the line under the button now. `C: tapon booking-send`, wait 4 s, `C: step A3b`. Server:
`POST /api/bookings/` **201**. The newest ID in `qa/bin/bookings client@yasante.dev` is
**B1**. **Views:** paste it. **Record** `at_client`, and the `address`/`area` each side
is sent. Ama's side **must not** contain `4 Choumert Grove` yet: if it does, **FAIL**.

**A4: Ama reads it.** `S: link "yasante:///requests/<B1>"`, wait 4 s, `S: step A4`.
Expect a row `At their place · <area>` with `You go to them. Their street arrives once
you confirm`. **Record** the area exactly. The street on screen is a **FAIL**.
`S: swipe up` until `What they said` shows, `S: step A4b`. **Expect** the whole note,
over several lines, ending `…park on the left side of the road.` Cut off with `…` after
one line is a **FAIL** (upstream `ba4bb34` makes notes wrap).
**A5: Accept, with the deposit.** `S: swipe up`, `S: step A5`. **Record** `Deposit to
confirm` (expect **20**). `S: tapon request-accept`, wait 4 s, `S: swipe up`,
`S: step A5b`. Server: `…/accept/` **200**. **Views:** `status: "awaiting_deposit"`, and
still no street on Ama's side. **Record** the line about what's left to pay (expect
`£10 left to pay on the day, after the deposit`).
**A6: What Efua is told.** `C: link "yasante:///bookings/<B1>"`, wait 4 s, `C: step A6`.
Expect `£20 deposit due` and `£10 left to pay on the day, after the deposit`
(`booking-balance`). **Record** the address row. `C: swipe up` until
`What you told them` shows, `C: step A6b`: **expect** the whole note, as in A4b.
**A7: The deposit arrives.** `S: link "yasante:///requests/<B1>"`,
`S: tapon request-deposit-received`, wait 4 s, `S: step A7`. **Views:**
`status: "confirmed"`. Expect Ama's where-row to show now `4 Choumert Grove, SE15 4RB`
with `You’re going to them. Tap for directions`. **Don't tap it** (it leaves the app).
**A8: Efua's side, confirmed.** `C: link "yasante:///bookings/<B1>"`, wait 4 s,
`C: step A8`. Expect `£20 deposit received`, `£10 left to pay on the day` (no
`after the deposit` any more), `Braids by Ama is coming to you`, and `Add to calendar`.
**Record** whether `Directions` shows (it shouldn't: Ama is going to her).

---

## K: Add to calendar

**K1.** On B1 (client), `C: fg` (expect `com.yasante.app`), `C: tapon booking-calendar`,
wait 4 s, then `C: fg`. **Record** the package it prints. On Android this should open
the phone's own calendar app with the event filled in (`com.google.android.calendar` on
these emulators). **This is the one planned exit from the app: don't tap, read or capture
anything there.** Run `C: recover`, wait 2 s, `C: step K1`. Expect B1 again.
If `fg` still says `com.yasante.app` and nothing opened, mark **FAIL**: the button does
nothing. If a dev-build error toast shows, quote it.

---

## H: The address is remembered (Efua)

**H1.** `C: link "yasante:///book/braidsbyama"`, wait 4 s,
`C: tapon "Take down and wash" --exact`, `C: tapon "Come to me"`, wait 2 s, `C: swipe up`,
`C: step H1`. **Record** what the street and postcode fields hold. Expect
`4 Choumert Grove` and `SE15 4RB`, filled in from B1. Send nothing. `C: key BACK`.

---

## Z

`qadb end`, `qa/bin/env-down`, `qa/bin/emus down`. Paste the `qadb end` output at the
bottom of the report. Report each step; no overall verdict.
