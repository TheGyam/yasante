# BOOK-01: A booking from request to review, across three emulators

**Device: emulators only**: `client` (emulator-5554), `stylist` (emulator-5556),
`client2` (emulator-5558). One agent drives all three **in turn**; nothing here runs in
parallel.
**Covers:** `app/book/[handle]`, `app/bookings/*`, `app/requests/[id]`, `app/close-out`,
`app/review`, `app/check-in`, `app/waitlist`, and `backend/apps/bookings` (state machine,
clash check, lapses, cancellation types, address privacy, reviews, check-ins).
**Time:** 2–3 hours. Parts after S can be split across days, but each day starts with S.

Read `qa/AGENTS.md` first (again, since it changed). Its rules override anything here.

---

## Notation and test data

Commands below are written for one device at a time. `C:`, `S:` and `K:` mean
`qa/bin/qadb -d client`, `qa/bin/qadb -d stylist` and `qa/bin/qadb -d client2`. So
`C: step R1` means run `qa/bin/qadb -d client step R1`.

| Who | Account (password `password123`) | Device |
| :--- | :--- | :--- |
| Client | `naomi.grant@yasante.dev` (Naomi Grant) | client |
| Stylist | `yaa.addo@yasante.dev`, whose page is **Braided by Bisi** (handle `braidedbybisi`) | stylist |
| Second client | `new@yasante.dev` (Kojo Asante) | client2 |

Braided by Bisi: works **Tue–Sat** (Tue–Fri 09:00–18:00, Sat 08:00–16:00, London time),
**48 hours' notice** to cancel, a **15% deposit**. Menu: Knotless braids £160 (5 h; length
Shoulder / Mid-back +£20 +1 h / Waist +£40 +2 h; size Large / Medium +£20 +1 h /
Small +£40 +2 h), Boho knotless £200, Box braids £110, Take down and wash £30 (1 h).

**Booking IDs.** After each booking is created, get its ID with
`qa/bin/bookings naomi.grant@yasante.dev` (or `new@yasante.dev`); the newest is first.
Write each one in the report as `B1`, `B2`, … and use them in links:
the client opens `yasante:///bookings/<ID>`, the stylist `yasante:///requests/<ID>`.
Open booking screens by these links, not through the lists: the stylist's tab screens
animate constantly and usually can't be read.

**Two views check.** Wherever a step says **views**, run
`qa/bin/bookings naomi.grant@yasante.dev <ID>` (or the client2 address) and paste the
output. It prints what **each side's app is sent** for that booking.

**Time travel.** Some rules only apply after time passes. `qa/bin/timewarp <ID> <field>
<hours>` sets one clock on one booking to *now + hours* (negative means the past). Use it
**only** where a step says so, with exactly the values given. Paste its output.

---

## S: Setup (every session)

**S1: Clean start.**
```
qa/bin/env-down
qa/bin/emus up --wipe          # factory-resets all three emulators, reinstalls Yasante
qa/bin/env-up --reseed <RUN>
qa/bin/metro <RUN>
qa/bin/qadb start <RUN> client=emulator-5554 stylist=emulator-5556 client2=emulator-5558
```
`RUN` = `BOOK-01-<YYYYMMDD>-<HHMM>`. Paste the last lines of each. Expect `dev_client: true`
three times. If any is false, stop: BLOCKED.

**S2: Open the app on each device** (do all of this for `client`, then `stylist`, then
`client2`):
1. `X: launch`, then wait until `grep -i bundled qa/runs/<RUN>/metro.log` prints a line, plus 10 s.
2. Dev-menu intro: `X: tapon Continue --exact`, then `X: tapon Close --exact`.
3. Android's notification prompt comes up at some point in the first minute. Whenever
   `qadb` reports `OUTSIDE_APP … permissioncontroller`, run
   `X: tapon permission_deny_button`, then carry on.
4. `X: link "yasante:///"`, wait 3 s, `X: step S2`. Expect the welcome screen.

**S3: Sign in all three (this is also the routing gate).** For each device:
`X: link "yasante:///auth/login"`, `X: tapon email-input`, `X: type "<email>"`,
`X: tapon password-input`, `X: type "password123"`, `X: tapon login-button`, wait 5 s.
Seeded accounts go straight in (F2 fixed 28-09-2026). Since PR #89 a sheet `We’ve updated our
terms and privacy policy` comes up first after a fresh sign-in: `X: tapon OK --exact`, wait 3 s.
Then `X: step S3`. If `Check your email`
shows instead, F2 is back: say so, get the code with
`qa/bin/mailbox <RUN> --to <email> --last`, `X: type "<code>"`, wait 5 s, capture again.
**Server check:** `grep -cE '"POST /api/auth/login/ HTTP/1.1" 200' qa/runs/<RUN>/server.log`
gives **3**. If it's less, stop: the routing gate failed.

**S4: Stylist mode.** `S: tapon Profile --exact`, `S: tapon mode-switch`, wait 4 s,
`S: step S4`. Expect the stylist side (tabs such as Today, Requests, Portfolio). The UI
tree may be unavailable; describe the screenshot.

---

## R: The client asks (booking B1)

**R1: The booking screen.** `C: link "yasante:///book/braidedbybisi"`, wait 4 s,
`C: step R1`. Expect `Book Braided by Bisi` and the four services with their prices.
**Record** whether each service shows a duration. In a dry run, `Box braids` showed none.

**R2: The send button waits.** Without choosing anything, `C: step R2` and **record**
what the bottom of the screen says (`Pick a service to send a request.` expected).

**R3: The quote follows the options.** `C: tapon "Knotless braids" --exact`, wait 2 s,
`C: step R3`. Expect Length and Size choices, and the deposit **£24** (15% of £160).
Then `C: tapon "Mid-back · +£20" --exact`, `C: tapon "Medium · +£20" --exact`, wait 3 s,
`C: swipe up`, `C: step R3b`.
Expect: `Knotless braids · Mid-back · Medium`, `About 7 hrs`, `£200`, deposit `£30`, and
`When suits you? She works Tue–Sat.` with days that are **only Tue–Sat**.

**R4: Only real times.** On the first day shown, **record** the list of start times.
Expect nothing earlier than 09:00, and (for a 7-hour job on Tue–Fri) the last start is
**11:00**, so that it ends by 18:00. If Saturday is shown, **record** its last start
(expect 09:00, ending by 16:00).

**R5: Terms must be accepted.** Pick the **first time on the first day**:
`C: tapon "<Day date>, <time>" --exact` (the exact label is in `visible text`, e.g.
`Tuesday 29 September, 09:00`). Write it down as **T1**. `C: swipe up`. Tap
`Anything they should know`, `C: type "QA booking one"`, `C: key BACK`.
Do **not** tick the terms. `C: step R5`. **Record** the text under the button, and whether
`Send request` can be pressed (`C: tapon booking-send`, then
`grep -c '"POST /api/bookings/ ' qa/runs/<RUN>/server.log` should still be **0**).

**R6: Race for one time (client2 gets there second).** Before Naomi sends, open the same
choice on client2: `K: link "yasante:///book/braidedbybisi"`, pick `Knotless braids`,
`Mid-back`, `Medium`, the **same time T1**, tick `I accept Braided by Bisi`, and
`K: step R6` (don't send yet).
Now on the client: `C: tapon "I accept Braided by Bisi"`, `C: tapon booking-send`,
wait 4 s, `C: step R6b`. Then on client2: `K: tapon booking-send`, wait 4 s, `K: step R6c`.
Expect: the client's request is sent (`POST /api/bookings/` **201**), and client2 gets a
**409** with an alert `Couldn’t send that` / `Someone has just asked for that time. Pick
another`. After the alert, **record** whether T1 is gone from client2's times.
Dismiss the alert, then close client2's booking screen (`K: key BACK`).

**R7: The request as each side sees it.** Get **B1**'s ID. **Views** for B1.
Expect for both sides: `status: "requested"`, `price: 200.0`, `address: null`,
`expires_at` about 48 h from now. Expect `client_record` and `client_hair` **null on the
client side** and filled in on the stylist side.
`C: link "yasante:///bookings/<B1>"`, wait 3 s, `C: step R7`. **Record** the status text
(something like `With her now. She has until …`).

---

## A: The stylist answers (B1: accept with a deposit)

**A1: The request.** `S: link "yasante:///requests/<B1>"`, wait 4 s, `S: step A1`.
Expect: the client's name, `Knotless braids · Mid-back · Medium`, `£200`,
`First booking on Yasante` (Naomi has no history with anyone), her hair details, the note
`QA booking one`, and `Answer by …`.
**Record** two things exactly: the line `<client's first name> asked for …` (since #136; `She asked for` would be a FAIL) and the value next to
`Start at`. They should show the same time. If they differ, mark **FAIL** (candidate F4:
the time picker isn't in the stylist's time zone).

**A2: The deposit.** `S: swipe up`, `S: step A2`. Expect `Deposit to confirm` pre-filled
with **30**, and a `How they pay you` choice. **Record** the saved payment methods shown.
If none is saved, fill the form with the label `Bank transfer` and details
`QA test account 00-00-00 12345678`.

**A3: Accept.** `S: tapon request-accept`, wait 4 s, `S: step A3`.
**Server check:** `grep -E '"POST /api/bookings/[^ ]+/accept/' … | tail -1` shows **200**.
**Views:** `status: "awaiting_deposit"`, `deposit` has `amount: 30.0` and
`status: "awaiting"`, `address: null` **on both sides** (not confirmed yet),
`expires_at` about 24 h from now.
`C: link "yasante:///bookings/<B1>"`, `C: step A3b`. **Record** what the client is told
about the deposit and how to pay.

**A4: The deposit arrives.** `S: link "yasante:///requests/<B1>"`,
`S: tapon request-deposit-received`, wait 4 s, `S: step A4`.
**Views:** `status: "confirmed"`, `deposit.status: "received"`, and **now** the `address`
is filled in for the client, with a `calendar_url`.
`C: link "yasante:///bookings/<B1>"`, `C: step A4b`. Expect the address and
`Add to calendar` / `Directions` on the client's screen. **Don't tap either:** they
leave the app.

---

## T: "Still coming?" (B1)

**T1: Not yet.** On the client's B1 screen now, **record** whether a
`Still coming …?` question shows. It should **not** show while the appointment is more than
48 h away.

**T2: The day before.** `qa/bin/timewarp <B1> scheduled_for 20`.
`C: link "yasante:///bookings/<B1>"`, wait 3 s, `C: step T2`. Expect
`Still coming …?` with `Yes, I’m coming` and `I can’t make it`.
`C: tapon attendance-yes`, wait 3 s, `C: step T2b`. Expect `You said you’re coming`.
**Views:** `attendance_confirmed_at` is set.

---

## M: Moving it (B1)

**M1: Put it back in the future.** `qa/bin/timewarp <B1> scheduled_for 100`
(about four days away).

**M2: The client asks to move; the stylist says no.** `C: link "yasante:///bookings/<B1>"`,
`C: tapon booking-move`, wait 2 s, `C: step M2`. Expect `Move it`, with Day and
`Start at`. Keep the day, change nothing, `C: tapon move-send`, wait 3 s,
`C: step M2b`. **Record** what happens when asking to move to the same time.
Then change `Start at` to one hour later (the time picker opens inside the app; set the
hour, confirm with `OK`), `C: tapon move-send`, wait 3 s, `C: step M2c`.
Expect `You asked to move it to …`. **Views:** `move_request.by: "client"`.
`S: link "yasante:///requests/<B1>"`, `S: step M2d`, then `S: tapon "Keep the original time"`,
wait 3 s, `S: step M2e`. **Views:** `move_request: null`, `moves: 0`, and
`scheduled_for` is unchanged.

**M3: The stylist moves it; the client agrees.** On the stylist's B1 screen,
`S: tapon request-move`, pick the **next day she works**, **same start time**, send.
`S: step M3`. Then `C: link "yasante:///bookings/<B1>"`, `C: step M3b`. Expect
`Braided by Bisi asked to move it to …`. `C: tapon move-accept`, wait 3 s, `C: step M3c`.
**Views:** `moves: 1`, `scheduled_for` is the new day, and `attendance_confirmed_at: null`
(a new day needs a new "yes").

**M4: Only one free move.** `C: tapon booking-move`, pick any later time, send.
`C: step M4`. Expect it refused: `It’s been moved once already. Cancel it and book again
instead` (server **409**). **Record** the exact message.

**M5: A move to a day she doesn't work (Record).** Use **client2** for this, so B1 stays
clean. Make booking **B2** for client2 the same way as R3–R6 (Take down and wash, first
free time), and have the stylist accept it **with the deposit field emptied**
(`S: tapon "Deposit to confirm"`, `S: clearfield`), which should confirm it straight away
(**views**: `status: "confirmed"`, `deposit: null`). Then on client2's B2 screen, ask to
move it to a **Monday** at 10:00. `K: step M5`, and **server check** for the `move` call.
Then on the stylist, `S: link "yasante:///requests/<B2>"`, `S: step M5b`, and
`S: tapon request-move-accept`. **Record** whether the server let a booking move onto a
day she doesn't work, or into a time already taken. There's no fixed expectation; the
server doesn't check either today.

---

## C: The appointment, close-out, review, check-ins (B1)

**C1: Close-out only after it starts.** `S: link "yasante:///requests/<B1>"`,
`S: step C1`. Expect **no** `Close it out` button yet (the appointment is in the future).

**C2: It happened.** `qa/bin/timewarp <B1> scheduled_for -2`.
`S: link "yasante:///requests/<B1>"`, wait 3 s, `S: step C2`. Expect `Close it out`.
`S: tapon request-close-out`, wait 2 s, `S: step C2b`. Expect `They came` and
`They didn’t turn up`.

**C3: Close it out.** `S: tapon "They came" --exact`. Answer `How did the time go?` with
the option meaning it **ran over**, then the size `1–2 hours` (or its nearest label), then
a reason from the list (**record** the one you chose). For `What were you paid?`, type
`200`. `S: tapon close-out-submit`, wait 3 s, `S: step C3`.
**Server check:** `close` **200**. **Views:** `status: "completed"`, `completed_at` set,
`timing` with `outcome: "over"`, `actual_price: 200.0`, and `client_record` for the stylist
now shows `attended: 1`.

**C4: Did it start on time? (client).** `C: link "yasante:///bookings/<B1>"`, wait 3 s,
`C: step C4`. Expect `Did it start on time?`. `C: tapon on-time-yes`, wait 2 s,
`C: step C4b`. **Views:** `started_on_time: true`.

**C5: The timing record can be contested once.** On the same screen, **record** whether
`How they recorded it` shows the stylist's timing. `C: tapon contest-timing`, confirm with
`Contest it`, wait 2 s, `C: step C5`. **Views:** `contested.timing: true`.
If the button is still there, tap it again and **record** the result (the server should
answer 409 `You’ve already contested it`).

**C6: Review.** `C: tapon booking-review`, wait 2 s, `C: step C6`. Tap the 5th star
(`review-stars`; if `tapon` can't reach one star, use `qadb find review-stars` and tap the
right-hand end of its bounds, and say so). Type
`QA review: neat and on time` into `Tell the next person (optional)`,
`C: tapon review-send`, wait 3 s, `C: step C6b`.
**Server check:** `review` **201**. **Views:** client side `review: {"rating": 5, …}`,
stylist side `review: null` (a stylist isn't sent the client's review state on the
booking).

**C7: One review per booking.** `C: link "yasante:///bookings/<B1>"`, `C: step C7`. Expect
`Your review`, and no `Leave a review`. **Record** the rating shown.

**C8: Check-ins open after two weeks.** **Views:** `check_in_due: null` now.
`qa/bin/timewarp <B1> completed_at -340` (just over two weeks ago).
**Views:** `check_in_due: 2`. `C: link "yasante:///bookings/<B1>"`, wait 3 s,
`C: step C8`. Expect a check-in row (`How it's holding up, in three taps`).
`C: tapon booking-check-in`, `C: step C8b`, answer all three questions (any answers;
**record** them) and send. `C: step C8c`. **Server check:** `check-in` **204**.
**Views:** `check_in_due: null` (week 2 answered, week 4 not open yet).
`qa/bin/timewarp <B1> completed_at -680` (four weeks ago). **Views:** `check_in_due: 4`.

---

## P: Suggesting another time, and saying no (client2)

**P1: The stylist suggests another time.** client2 makes **B3** (`Box braids`, Length
`Shoulder`, the first free time on the **second** day shown). On the stylist's B3 screen,
change `Start at` to one hour later. The button should now read `Suggest this time`
(**record** it, and the line `That’s not the time they picked…`). Tap it. `S: step P1`.
**Views:** `status: "requested"`, `proposal.scheduled_for` is the new time.

**P2: The client turns it down.** `K: link "yasante:///bookings/<B3>"`, `K: step P2`.
Expect `Braided by Bisi suggested …` with `That works` / `It doesn’t`.
`K: tapon "It doesn’t" --exact`, wait 3 s, `K: step P2b`.
**Views:** `status: "declined"`, `reason: "The suggested time didn’t work"`.

**P3: The stylist declines outright.** client2 makes **B4** (`Take down and wash`, first
free time). On the stylist's B4 screen, `S: tapon request-decline`; if it asks for a
reason, type `QA decline test`, confirm `Decline`. `S: step P3`.
`K: link "yasante:///bookings/<B4>"`, `K: step P3b`. **Record** what client2 is told.
**Views:** `status: "declined"`.

**P4: A declined time is free again.** `K: link "yasante:///book/braidedbybisi"`, choose
`Take down and wash`, and check the B4 time is offered again. `K: step P4`. Close it without
sending.

---

## L: A request nobody answers (client2)

**L1.** client2 makes **B5** (`Take down and wash`, first free time); note its time T5.
**Views:** `status: "requested"`.
**L2.** `qa/bin/timewarp <B5> expires_at -1`. **Views:** `status: "expired"` (the lapse is
applied on read). `K: link "yasante:///bookings/<B5>"`, `K: step L2`. **Record** what
client2 sees.
**L3.** `S: link "yasante:///requests/<B5>"`, `S: step L3`. Expect no Accept button.
**L4.** client2's booking screen offers T5 again. `K: step L4`.

---

## X: Cancelling, and the waitlist

**X1: The waitlist.** First a booking to cancel: the **client** makes **B6** (`Take down and wash`, first free time on
the **third** day shown; note the day D6). The stylist accepts it with no deposit
(clear the deposit field), so it's `confirmed`.
Then client2 joins the waitlist for that day: `K: link "yasante:///waitlist/braidedbybisi"`, set From and To both to D6,
`K: tapon waitlist-save`, `K: step X1`. Expect `You’re on the list`.
`K: link "yasante:///bookings"`, `K: step X1b`. **Record** the `Waiting for a slot` row.

**X2: Cancel in time.** D6 is more than 48 h away. `C: link "yasante:///bookings/<B6>"`,
`C: tapon booking-cancel`, `C: step X2` (the warning: **record** it), confirm
`Cancel it`, wait 3 s, `C: step X2b`.
**Views:** `status: "cancelled_in_time"`. Stylist side: `client_record.late_cancellations`
unchanged.

**X3: The waitlist hears about it.** `K: link "yasante:///bookings"`, wait 3 s,
`K: step X3`. Expect `A slot opened with Braided by Bisi` for D6.
**Server check:** `grep -c "A slot opened" qa/runs/<RUN>/server.log` (the push notice is
logged there; there's no push on emulators). **Record** the count.

**X4: Cancel late.** The client makes **B7** (`Take down and wash`, any free time); the
stylist accepts with no deposit. Then run
`qa/bin/timewarp <B7> scheduled_for 24`, which puts it inside the 48-hour notice.
`C: link "yasante:///bookings/<B7>"`, `C: tapon booking-cancel`, `C: step X4`, and
**record** the warning. It should say plainly that it's late. Confirm, `C: step X4b`.
**Views:** `status: "cancelled_late"`, and the stylist's `client_record.late_cancellations`
is now **1**.

---

## N: A no-show, and contesting it

**N1.** The client makes **B8** (`Take down and wash`, any free time); the stylist accepts
with no deposit. `qa/bin/timewarp <B8> scheduled_for -1`.
**N2.** `S: link "yasante:///requests/<B8>"`, `S: tapon request-close-out`,
`S: tapon close-out-no-show` (or `They didn’t turn up`, then `Mark as a no-show`),
wait 3 s, `S: step N2`. **Views:** `status: "no_show"`, stylist's
`client_record.no_shows: 1`.
**N3.** `C: link "yasante:///bookings/<B8>"`, `C: step N3`. Expect `I wasn’t a no-show`.
`C: tapon contest-no-show`, confirm `Contest it`, `C: step N3b`.
**Views:** `contested.no_show: true`. A second contest (if the button is still there) should
be refused. **Record** it.
**N4: No review after a no-show.** **Record** whether `Leave a review` appears on B8
(it shouldn't).

---

## Z: Teardown

1. `qa/bin/qadb end` (paste the output).
2. `qa/bin/env-down`, then `qa/bin/emus down`.
3. In the report, list B1–B8 with their IDs and final status (from `qa/bin/bookings`).

---

## For Claude's audit

- Every `timewarp` line in `timewarp.log` matches a step that asked for it, with the value
  given.
- Server lines quoted in the report exist in `server.log`, and every state change in the
  report has its server call.
- Views outputs re-run by Claude for B1–B8.
- Server-side probes Claude runs directly, not the executor: accepting at a time the client
  didn't ask for, closing a booking "attended" before it starts (then reviewing it), and a
  move that clashes with another booking.
- Candidate F4 (time picker in device time, labels in London time): confirm from A1, then
  on the phone, which isn't on London time.
