# FIXES-01: Rechecking TheGyam's fixes (F1, F2, F4, F6–F10) and the open F11, F12

**Device: emulators only**: `client` (emulator-5554, **on New York time**), `stylist`
(emulator-5556), `client2` (emulator-5558). One agent drives all three **in turn**.
**Covers:** the fixes in upstream commit `2922dcb` ("bugs from the ck/quality-check QA
runs"), plus F11 (deleting an account) and F12 (policy screens), which aren't fixed yet.
**Time:** about 75 minutes.

Read `qa/AGENTS.md` first (again, since it changed). Its rules override anything here.
`qadb step` opens each step's section in the report; fill it in before the next step.
**Only the tools in `qa/AGENTS.md` §3**: no `manage.py`, `curl`, `adb` or `git`, not even
to read. If a step seems to need one, write `NEEDS: …` in its section and move on.

Each part names the finding it rechecks. `qa/findings.md` says what each one was; read it.
A fix that holds is a PASS; one that doesn't is a FAIL. Quote what you saw either way.

---

## Notation and test data

`C:`, `S:`, `K:` = `qa/bin/qadb -d client`, `-d stylist`, `-d client2` (as in BOOK-01).

| Who | Account (password `password123`) | Device |
| :--- | :--- | :--- |
| Naomi | `naomi.grant@yasante.dev` (Naomi Grant) | client (New York) |
| Yaa, page **Braided by Bisi** (`braidedbybisi`) | `yaa.addo@yasante.dev` | stylist (London) |
| Abena | `abena.kamara@yasante.dev` (Abena Kamara) | client2 |
| Efua | `client@yasante.dev` (Efua Mensah) | client, from part O on |
| Adwoa | `adwoa.diallo@yasante.dev` (Adwoa Diallo) | client, part D only |

Braided by Bisi works **Tue–Sat** (Tue–Fri 09:00–18:00, Sat 08:00–16:00, **UK time**).

Seeded look used below: `look_efua_2` = `0c9028cd-f011-52a7-922e-a7a1b917c981`
(Efua's public `Wash day. My twist-out finally behaved.`). Copy the ID exactly.

**Server check, every step that saves something:** after it, run
`grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3` and paste it. Any new
`5xx` is a **FAIL**. A `4xx` is only OK where the step expects a refusal, with one
exception: a `401` followed at once by `POST /api/auth/refresh-token/ 200` and the same
request succeeding is the app renewing its 15-minute sign-in, not a failure. Paste it and
say so.

**Keyboard.** `qadb tapon` now closes the keyboard itself when the button is under it,
and prints `closed the keyboard first`. That's expected; say nothing about it.

---

## S: Setup

**S1.**
```
qa/bin/env-down
qa/bin/emus up --wipe 3
qa/bin/emus tz client America/New_York
qa/bin/env-up --reseed <RUN>
qa/bin/metro <RUN>
qa/bin/qadb start <RUN> client=emulator-5554 stylist=emulator-5556 client2=emulator-5558
```
`RUN` = `FIXES-01-<YYYYMMDD>-<HHMM>`. Paste the `emus tz` line: it must end in `EDT` or
`EST`. Expect `dev_client: true` three times, or stop: BLOCKED.

**S2.** BOOK-01 S2 for `client`, `stylist`, then `client2`.

**S3: Sign in (F2).** BOOK-01 S3 with Naomi (client), Yaa (stylist) and Abena (client2).
**F2 is fixed if all three go straight into the app with no `Check your email` screen.**
If one shows `Check your email`, mark S3 **FAIL** (F2 is back), get the code with
`qa/bin/mailbox <RUN> --to <email> --last`, type it, and carry on.
**Server check:** 3 login `200`s, or stop: the routing gate failed.
`qa/bin/dbcheck naomi.grant@yasante.dev`: paste it (`verified=True` expected).

**S4.** BOOK-01 S4 (Yaa into stylist mode).

---

## F: A booking across time zones (F4) and moving it (F7)

**F1: Times on the booking screen.** `C: link "yasante:///book/braidedbybisi"`, wait 4 s.
`C: tapon "Take down and wash" --exact`, wait 3 s, `C: swipe up`, `C: step F1`.
**Record, word for word,** the day headings, the first day's times and any line saying
which time zone they're in. **Expect** the times marked as `UK time` (the stylist's
clock), because this phone is on New York time. No mark at all is a **FAIL**.

**F2: Send.** Pick the **first time on the first day**, call its label **T**. Tick the
terms, `C: tapon booking-send`, wait 4 s, `C: step F2`. Server: `POST /api/bookings/`
**201**. `qa/bin/bookings naomi.grant@yasante.dev` → the newest ID is **B1**.
**Views:** paste `qa/bin/bookings naomi.grant@yasante.dev <B1>`.

**F3: The stylist reads it (F4).** `S: link "yasante:///requests/<B1>"`, wait 3 s,
`S: step F3`, `S: swipe up`, `S: step F3b`. **Record, word for word:** `She asked for …`
(or `They asked for …`), `Answer by …`, and the `Start at` value.
**F4 is fixed if** the asked-for time and `Start at` show the **same** clock time, the
same as T without its `UK time` mark (this phone is on UK time, so no mark here).
If they differ, mark **FAIL** and quote both.

**F4: Confirm it with no deposit.** On the stylist, swipe to `Deposit to confirm`,
`S: tapon "Deposit to confirm"`, `S: clearfield`, `S: tapon request-accept`, wait 4 s,
`S: step F4`. **Views:** `status: "confirmed"`, `deposit: null`.
`C: link "yasante:///bookings/<B1>"`, wait 3 s, `C: step F4b`. **Record** the time
shown on Naomi's booking. **Expect** T's time with `UK time`.

**F5: Move to a Monday (F7).** `C: tapon booking-move`, wait 2 s, `C: step F5`.
**Record** the labels (`Day`, and whether `Start at` says `UK time`). Tap `Day`; in the
calendar that opens, pick the **Monday of next week** (the column headed `M`), `OK`.
Leave `Start at` as it is. `C: tapon move-send`, wait 3 s, `C: step F5b`.
**F7 is fixed if** it is refused with `The stylist doesn’t work that day. Pick another`
and the server shows `POST /api/bookings/<B1>/move/` **400**. If it's accepted
(`You asked to move it to …`, `200`), mark **FAIL**.

**F6: Outside her hours (F7).** Tap `Day`, pick the **Wednesday of next week**, `OK`.
Tap `Start at` and set **07:00** (the clock opens inside the app; if there's a keyboard
icon, use it to type the hour and minute; **record** how you set it), `OK`.
`C: tapon move-send`, wait 3 s, `C: step F6`. **Expect** `That’s outside the stylist’s
hours. Pick another time` and a **400**.

**F7: A move that's allowed.** Same Wednesday, `Start at` **10:00**, `C: tapon move-send`,
wait 3 s, `C: step F7`. Expect `You asked to move it to …` and **200**. **Record** the
sentence. **Views:** `move_request` with `by: "client"`; paste its `scheduled_for`.
Leave it unanswered.

---

## O: Signing out (F1), and a take-down seen from another phone (F10)

**O1: Sign out.** Count first:
`grep -cE 'POST /api/auth/logout/ HTTP/1.1" 200' qa/runs/<RUN>/server.log`.
`C: link "yasante:///settings"`, `C: swipe up`, `C: tapon "Sign out"`, confirm
(`dialog-confirm`), wait 5 s, `C: step O1`. Expect Home as a guest (`Hey there`).
**F1 is fixed if** the same `grep -c` has gone up by one. Paste both counts, and
`qa/bin/dbcheck naomi.grant@yasante.dev` (**record** what it says about sessions or
tokens). No new logout line is a **FAIL**.

**O2: Efua signs in on client.** BOOK-01 S3's steps as Efua on `client`, `C: step O2`.
Server: login `200`.

**O3: Abena has the look open.** `K: link "yasante:///looks/0c9028cd-f011-52a7-922e-a7a1b917c981"`,
wait 4 s, `K: step O3`. Expect Efua's `Wash day. My twist-out finally behaved.`

**O4: Efua takes it down.** `C: link "yasante:///looks/0c9028cd-f011-52a7-922e-a7a1b917c981"`,
wait 4 s, `C: tapon "Options for"`, `C: tapon "Take this look down"`, confirm
(`Take it down`), wait 3 s, `C: step O4`. Server check (the take-down `200`).

**O5: Abena opens it again (F10).**
`K: link "yasante:///looks/0c9028cd-f011-52a7-922e-a7a1b917c981"`, wait 6 s, `K: step O5`.
**F10 is fixed if** she sees `This look is gone` (no photo, no caption, no comments).
If the look still shows, mark **FAIL**. Server: `GET /api/looks/0c9028cd…/ 404`.

---

## L: Links to screens, not stylist pages (F9)

For each of `search`, `saved`, `insights`, `who/knotless`, `work/braidsbyama`:
`C: link "yasante:///<path>"`, wait 4 s, `C: step L-<first word>` (`L-search`, `L-saved`,
`L-insights`, `L-who`, `L-work`), then `C: key BACK`. **Record** each screen's title.
**Expect** its own screen (`Search looks, stylists and tips`, `Saved`, `Your hair`,
`Who does knotless braids?`, Braids by Ama's work photos), never `No page here`.
Afterwards: `grep -E 'by-handle/(search|saved|insights|who|work)/' qa/runs/<RUN>/server.log`
must print **nothing**. Paste it (empty is the pass).

---

## T: Policy screens (F12, not fixed yet)

For each of `terms`, `privacy`, `guidelines`, `stylist-terms`:
`C: link "yasante:///policy/<type>"`, wait **15 s**, `C: step T-<type>`, `C: key BACK`.
Expect the title (`Terms of use`, `Privacy policy`, `Community guidelines`,
`Stylist terms`) and a body, **or** `Not published yet` on the screen itself. A grey
placeholder with no text is F12: **FAIL**. A dev-build `API Error` toast doesn't count
either way. After all four:
`grep -E 'GET /api/policies' qa/runs/<RUN>/server.log | tail -8`, paste it.

---

## N: A new account: the code screen (F6), then a stylist page's handle (F8)

On `client2`, sign Abena out first: `K: link "yasante:///settings"`, `K: swipe up`,
`K: tapon "Sign out"`, `dialog-confirm`, wait 4 s.

**N1: Sign up.** `K: link "yasante:///auth/join"`, `K: tapon role-client`. Name
`QA Fix <HHMM>`, Email `fix.<HHMM>@example.com` (HHMM from the RUN name), Password and
Confirm `Qa-Test-2026!`, tick the 18+ box, `K: tapon signup-button`, wait 5 s,
`K: step N1`. Expect `Check your email`. `qa/bin/mailbox <RUN> --to fix.<HHMM>@example.com`:
**1** email. Note its code as CODE1.

**N2: Reopen the app (F6).** `K: stop`, `K: launch`, wait 20 s, `K: step N2`. Expect
`Check your email` again. `qa/bin/mailbox <RUN> --to fix.<HHMM>@example.com` again.
**F6 is fixed if** there is still **1** email. Paste
`grep -E 'POST /api/auth/email/start/' qa/runs/<RUN>/server.log | tail -3`. A second
email is a **FAIL**.

**N3: Resend.** Wait until `Resend code` shows (up to 60 s), `K: tapon "Resend code"`,
wait 3 s, `K: step N3`. Mailbox: now **2** emails. Note the new code as CODE2.

**N4: In.** Type CODE2, wait 5 s, `K: step N4`. Expect the app (Home).

**N5: The suggested handle (F8).** `K: tapon Profile --exact`,
`K: tapon "Set up your stylist profile"`, wait 2 s. Tap `Name clients know you by`,
type `QA Braids Kojo`, wait 2 s, `K: step N5`. **Record** the handle under
`Your page address`. **F8 is fixed if** it follows the whole name (`qabraidskojo` or
similar). Stuck on `q` is a **FAIL**.
**N6.** Tap the name field again, type ` Two` (with the space), wait 2 s, `K: step N6`.
**Record** the handle: it should follow again. Then tap `Your page address`,
`K: clearfield`, type `qafixhandle`, wait 2 s. Tap the name field, type `X`, wait 2 s,
`K: step N6b`. **Record** the handle: now it should **stay** `qafixhandle`.
Don't continue the setup. `K: key BACK` until you're out of it.

---

## D: Deleting an account (F11, not fixed yet)

**D1.** On `client`, sign Efua out (as in O1), then sign in as Adwoa (BOOK-01 S3's steps).
`qa/bin/dbcheck adwoa.diallo@yasante.dev`, paste it.
**D2.** `C: link "yasante:///settings/privacy"`, `C: tapon "Delete account"`, confirm the
delete, wait 6 s, `C: step D2`. **Record** the screen. Leaving settings, signed out, is a
PASS; staying on `Privacy and data` is F11: **FAIL**. Server check (the `DELETE … 204`).
`qa/bin/dbcheck adwoa.diallo@yasante.dev`: **record** it.

---

## Z

`qadb end`, `qa/bin/env-down`, `qa/bin/emus down`. Paste the `qadb end` output at the
bottom of the report. Report each step; no overall verdict.
