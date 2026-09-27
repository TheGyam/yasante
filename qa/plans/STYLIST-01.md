# STYLIST-01: Becoming a stylist, a page, a menu and hours (plus F4)

**Device: emulators only**: `client` (emulator-5554), `stylist` (emulator-5556).
One agent drives both **in turn**.
**Covers:** `app/stylist-setup`, `app/menu/*`, `app/availability`, `app/payment-methods`,
`app/portfolio/import`, `app/numbers`, the stylist tabs (Today, Requests, Portfolio,
Account), the public page `app/stylist/[handle]`, `app/invite/[code]`, and candidate
**F4** (the request screen mixing time zones).
**Time:** about 90 minutes.

Read `qa/AGENTS.md` first (again, since it changed). Its rules override anything here.
`qadb step` opens each step's section in the report; fill it in before the next step.
**Only the tools in `qa/AGENTS.md` §3**: no `manage.py`, `curl`, `adb` or `git`, not even
to read. If a step seems to need one, write `NEEDS: …` in its section and move on.

---

## Notation and test data

`C:` = `qa/bin/qadb -d client`, `S:` = `qa/bin/qadb -d stylist` (as in BOOK-01).

| Who | Account (password `password123`) | Device |
| :--- | :--- | :--- |
| New stylist | `new@yasante.dev` (Kojo Asante, a **client only** today) | stylist |
| Client | `naomi.grant@yasante.dev` (Naomi Grant) | client |

**Server check, every step that saves something:** after it, run
`grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3` and paste it. Any new
`5xx` is a **FAIL**. A `4xx` is only OK where the step expects a refusal.

**Photos.** On emulators, `qadb` may now tap Android's photo picker and camera. The
gallery holds two test photos, shown as `Photo taken on …`. To pick one:
`X: tapon "Photo taken on" --nth=0`. Never do this on the phone. `qadb` refuses it there.

---

## S: Setup

**S1.**
```
qa/bin/env-down
qa/bin/emus up --wipe 2
qa/bin/emus tz stylist America/New_York     # for F4; the client stays on London time
qa/bin/env-up --reseed <RUN>
qa/bin/metro <RUN>
qa/bin/qadb start <RUN> client=emulator-5554 stylist=emulator-5556
```
`RUN` = `STYLIST-01-<YYYYMMDD>-<HHMM>`. Paste the `emus tz` line: it must end in `EDT`
or `EST`. Expect `dev_client: true` twice, or stop: BLOCKED.

**S2.** BOOK-01 S2 for `client`, then `stylist`.
**S3.** BOOK-01 S3 with the accounts above (Naomi on client, Kojo on stylist). **Server
check:** 2 login `200`s, or stop: routing gate failed. Do **not** switch Kojo to stylist
mode: he isn't a stylist yet.

---

## A: Kojo sets up a page (the stylist device)

**A1: The way in.** `S: tapon Profile --exact`, wait 2 s, `S: step A1`. Expect
`Set up your stylist profile` / `A page for your bio, free for founding stylists`.
`S: tapon "Set up your stylist profile"`, wait 2 s, `S: step A1b`. Expect
`Your name and page` and a `Continue` button (`setup-next`).

**A2: Name and page.** Tap `Name clients know you by`, type `QA Braids Kojo`, wait 2 s,
`S: step A2`. **Record** the handle it suggests under `Your page address`. **F8:** it has
been freezing at the first letter (`q`, with `At least 3 characters`). If it shows `q`
(or anything under 3 characters), mark A2 **FAIL** and quote it, then carry on with the
workaround: `S: tapon "Your page address"`, `S: clearfield`, `S: type "qabraidskojo"`,
wait 3 s, `S: step A2b`. Expect `qabraidskojo is free`. Use **`qabraidskojo`** as the
handle from here on. Tap `A line about your work`, type `QA test page. Braids only.`,
`S: key BACK`, `S: step A2c`. `S: tapon setup-next`, wait 2 s. If it still doesn't move
to `Where you work`, stop the run: BLOCKED.

**A3: Where you work.** `S: step A3`. Expect `Where you work` with `At a salon`,
`From home` and `I travel`. `S: tapon "From home"`. Tap `Your area`, type `Peckham`,
`S: key BACK`. `S: step A3b`. `S: tapon setup-next`.

**A4: Your rules.** `S: step A4`. Expect `Cancelling is free up to` (`24 hours`, `2 days`,
`3 days`, `A week`) and `Deposit to hold a slot` (`None`, `A set amount`, `A share`).
`S: tapon "2 days" --exact`, `S: tapon "A set amount" --exact`, tap `Amount`, type `10`,
`S: key BACK`, `S: step A4b`. `S: tapon setup-next`.

**A5: Proof of your work.** `S: step A5`. `S: tapon "Add a photo of your work"`, wait 2 s,
`S: step A5b`. **Record** the choices offered (camera / library). Choose the library
option, then `S: tapon "Photo taken on" --nth=0`, wait 3 s, `S: step A5c`. Expect
`Photo added`. If Android asks for photo permission, allow it (`Allow`) and say so.
`S: tapon setup-next`.

**A6: Go live.** `S: step A6`. Expect `Ready to go live` with the name, the page link,
`Peckham` and the service model. `S: tapon setup-next` (`Put my page live`), wait 5 s,
`S: step A6b`. Expect the app to switch to **stylist mode** (tabs such as Today,
Requests, Portfolio). **Server check** as above.
**This is where F3 crashed after a stylist sign-up.** If the app restarts on its own (the
dev-client loading screen, or a cold start), mark **FAIL**, capture it, quote the first
`E/` lines of that step's `app.log`, run `S: launch` and carry on.

---

## M: Menu, hours, payment, portfolio (stylist)

**M1: Empty menu.** `S: link "yasante:///menu"`, wait 3 s, `S: step M1`. Expect
`Nothing on your menu yet`, `Add a service` and `Paste a price list`.

**M2: Add a service.** `S: tapon menu-add`, wait 2 s, `S: step M2`. Expect `Add a service`.
Tap `What you call it`, type `QA Knotless`. Tap `Price`, type `90`. Tap
`How long it takes`, type `4 hrs`. `S: key BACK`, `S: step M2b`. `S: tapon menu-item-save`,
wait 3 s, `S: step M2c`. Expect `QA Knotless` on the menu with £90. Server check.

**M3: Paste a price list.** `S: tapon menu-paste`, wait 2 s. Tap `Your price list` and
type `QA Cornrows 45 (2 hrs)`, `S: key BACK`, `S: step M3`. **Record** the preview it
shows. `S: tapon paste-save`, wait 3 s, `S: step M3b`. **Record** what was added. Server
check.

**M4: Edit and remove.** Open `QA Cornrows` (tapon its name), change the price to `50`,
save, `S: step M4`. Expect £50. Open it again, `S: tapon "Remove from my menu"`, confirm
(`dialog-confirm`), wait 3 s, `S: step M4b`. Expect only `QA Knotless` left.

**M5: Working hours.** `S: link "yasante:///availability"`, wait 3 s, `S: step M5`.
**Record** the days and hours shown by default. Switch **Monday off**
(`S: tapon "Open on Monday"`), leave the other days as they are, then `S: tapon availability-save`, wait 3 s,
`S: step M5b`. Server check. **Record** exactly what you changed.

**M6: Getting paid.** `S: link "yasante:///payment-methods"`, wait 3 s, `S: step M6`.
`S: tapon payment-add`, `S: tapon "Bank transfer" --exact`, tap
`Name, sort code and account`, type `QA test account 00-00-00 12345678`, `S: key BACK`, `S: tapon payment-save`, wait 3 s,
`S: step M6b`. Expect it listed. Server check.

**M7: Portfolio import.** `S: link "yasante:///portfolio/import"`, wait 3 s, `S: step M7`.
**Record** what it offers. If it opens the photo picker, pick `Photo taken on`
(`--nth=1`). Leave `Also post to Looks` as it is and **record** its setting, then
`S: tapon import-save` (`Add 1 photo`), wait 3 s, `S: step M7b`. Server check.

**M8: The tabs.** Capture each stylist tab once: `S: tapon Today --exact` →
`S: step M8a`, `Requests` → `M8b`, `Portfolio` → `M8c`, `Account` → `M8d`. **Record**
what each shows for a brand-new page, and any blank screen or error.
`S: link "yasante:///numbers"`, `S: step M8e`. Expect `Nothing to show yet`.

---

## P: The public page (client device)

**P1.** `C: link "yasante:///stylist/<the handle from A2/A2b>"`, wait 4 s, `C: step P1`. Expect
`QA Braids Kojo`, `Peckham` with `District only — the address comes with a confirmed
booking`, the menu with `QA Knotless` £90, and terms showing the notice and the £10
deposit. **Record** anything missing or different from what Kojo entered.
**P2.** `C: swipe up`, `C: step P2`. **Record** `Their work` and `Their terms`.

---

## F: F4, the request screen across time zones

The stylist emulator is on New York time and the client on London time.

**F1: Naomi asks.** `C: tapon stylist-page-book` (`Request a booking`), wait 3 s.
`C: tapon "QA Knotless" --exact`, wait 2 s, `C: swipe up`. Pick the **first time on the
first day** shown, and call it **T** (the label, e.g. `Tuesday 29 September, 10:00`).
Tick the terms, `C: tapon booking-send`, wait 4 s, `C: step F1`. Server: `POST
/api/bookings/` **201**. Get the ID with `qa/bin/bookings naomi.grant@yasante.dev` → **B1**.

**F2: Kojo reads it.** `S: link "yasante:///requests/<B1>"`, wait 3 s, `S: step F2`,
`S: swipe up`, `S: step F2b`. **Record, word for word:** the `She asked for …` line and the
`Start at` value. **Views:** paste `qa/bin/bookings naomi.grant@yasante.dev <B1>`
(`requested_times`, in UTC).
- If `She asked for` shows T in **London time** but `Start at` shows it 5 hours earlier
  (**New York** time), **F4 is confirmed**: mark FAIL and quote both.
- If both agree, mark PASS and say which time zone they're in.
Do **not** accept the request.

---

## I: An invite (stylist device)

**I1.** `S: link "yasante:///invite/FOUNDING50"`, wait 3 s, `S: step I1`. Kojo is
already a stylist now. **Record** what the screen offers (`Go to stylist mode`,
`Add stylist mode to my account`, `This invite doesn't work`, …). Tap nothing.
**I2.** `S: link "yasante:///invite/NOPE123"`, wait 3 s, `S: step I2`. Expect
`This invite doesn't work`.

---

## Z

`qadb end`, `qa/bin/env-down`, `qa/bin/emus down`. (`emus up` puts the stylist emulator
back on London time next time.) Paste the `qadb end` output at the bottom of the report.
Report each step; no overall verdict.
