# STAFF-02: What staff decide, people see: reports, appeals, review reports, products, tips

**Device: emulators + browser.** Two emulators run the app (`efua` emulator-5554,
`abena` emulator-5556); `qa/bin/qaweb` runs the staff workspace. One agent drives all
three **in turn**.
**Covers:** the round trip between the app and the staff workspace: a look reported in
the app reaches the Reports queue, a moderator acts, the author sees it and appeals, the
appeal is decided and the look comes back; a product someone adds waits for approval,
then everyone can find it; a tip written in the workspace becomes the app's tip of the
day; a reported review is removed from a stylist's page. Rechecks F17, F19 and F20.
**Time:** about 75 minutes.

Read `qa/AGENTS.md` first (again: **section 8 is new** and covers the browser). Its rules
override anything here. `qadb step` and `qaweb step` open each step's section in the same
report; fill it in before the next step. **Only the tools in `qa/AGENTS.md` §3**: no
`manage.py`, `curl`, `adb`, `git`, your own browser or scripts, not even to read. If a step
seems to need one, write `NEEDS: …` in its section and move on.

---

## Notation and test data

`E:` = `qa/bin/qadb -d efua`, `A:` = `qa/bin/qadb -d abena` (the app);
`W:` = `qa/bin/qaweb` (Esi, staff lead), `H:` = `qa/bin/qaweb -w helper` (Kwame, moderator).

| Who | Account (password `password123`) | Where |
| :--- | :--- | :--- |
| Efua Mensah | `client@yasante.dev` | app, emulator-5554 (`efua`) |
| Abena Kamara | `abena.kamara@yasante.dev` | app, emulator-5556 (`abena`) |
| Esi Boateng | `staff.lead@yasante.dev` | workspace, superuser |
| Kwame Asante | `staff.helper@yasante.dev` | workspace, moderator (looks and reviews queues) |

Seeded things used below (copy IDs exactly):

| Name in this plan | ID | What it is |
| :--- | :--- | :--- |
| `look_efua_2` | `0c9028cd-f011-52a7-922e-a7a1b917c981` | Efua's public look `Wash day. My twist-out finally behaved.` |
| `rev_zainab` | `f1ed297b-d4b6-578e-bd01-3e40ed0fac43` | Zainab's review on **Braids by Ama** (`braidsbyama`) |

**Server check, every step that saves something:** after it, run
`grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3` and paste it. Any new
`5xx` is a **FAIL**: also paste the `server.log` lines just above it (the error's last
line says what went wrong). A `4xx` is OK only where the step expects a refusal, with one
exception: a `401` followed at once by `POST /api/auth/refresh-token/ 200` and the same
request succeeding is the app renewing its sign-in, not a failure.

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
qa/bin/web-up <RUN>
qa/bin/qadb start <RUN> efua=emulator-5554 abena=emulator-5556
qa/bin/qaweb start <RUN>
```
`RUN` = `STAFF-02-<YYYYMMDD>-<HHMM>`. Paste all output. Expect `dev_client: true` twice,
the two `staff:` lines, `web: staff workspace …` and `browser up`. Anything else: stop,
BLOCKED.

**S2: Open the app on both** (do all of this for `efua`, then `abena`; `X:` is that
device):
1. `X: launch`, then wait until `grep -i bundled qa/runs/<RUN>/metro.log` prints a line, plus 10 s.
2. Dev-menu intro: `X: tapon Continue --exact`, then `X: tapon Close --exact`.
3. Whenever `qadb` reports `OUTSIDE_APP … permissioncontroller`, run
   `X: tapon permission_deny_button`, then carry on.
4. `X: link "yasante:///"`, wait 3 s, `X: step S2`. Expect the welcome screen.

**S3: Sign in both (routing gate).** For each: `X: link "yasante:///auth/login"`,
`X: tapon email-input`, `X: type "<email>"`, `X: tapon password-input`,
`X: type "password123"`, `X: tapon login-button`, wait 5 s, `X: step S3`. Expect the app's
home. **Server check:** `grep -cE '"POST /api/auth/login/ HTTP/1.1" 200' qa/runs/<RUN>/server.log`
gives **2**. Less: stop, the routing gate failed.

**S4: Staff sign in** (see STAFF-01 A3–A6 for what each screen looks like; no need to
test them again). Esi: `W: open /`, `W: fill Email staff.lead@yasante.dev`,
`W: fill Password password123`, `W: click "Sign in"`, `qa/bin/totp staff.lead@yasante.dev`,
`W: fill "First six-digit code" <code>`, `W: click "Verify code"`,
`W: click "I saved my codes"`, `W: step S4`: Today, `Good …, Esi.`, `Every queue is clear.`
Then the same for Kwame with `H:` and `staff.helper@yasante.dev`, `H: step S4b`.

---

## R: A reported look, hidden, appealed, restored

**R1: Abena reports Efua's look.** `A: link "yasante:///looks/0c9028cd-f011-52a7-922e-a7a1b917c981"`,
wait 3 s, `A: step R1`. Expect Efua's `Wash day. My twist-out finally behaved.`
`A: tapon "Options for"`, wait 2 s, `A: step R1b`. Expect `Report this look` with reasons.
`A: tapon reason-not-their-work`, `A: tapon "What happened?"`,
`A: type "QA report for the staff test"`, `A: tapon look-report-send`, wait 3 s,
`A: step R1c`. Expect `Thanks for telling us`. Server check:
`POST /api/looks/0c9028cd-…/report/ 201`.

**R2: It reaches the queue (F17).** `H: open /`, `H: step R2`. Expect `Needs you` no
longer clear: **record** what it says. `H: open /review/reports`, `H: step R2b`. Expect
one item: the reason (**record** its wording), `Reported by Abena Kamara`, `First report`,
`QA report for the staff test`, the look (`Efua Mensah`, `Wash day. My twist-out finally
behaved.`), `Note for the log (optional)`, and buttons `Hide`, `Remove`, `Dismiss`.
`H: fill "Note for the log (optional)" "QA: hidden while we check"`,
`H: click Hide --exact --role=button`, `H: step R2c`. Expect a dialog `Hide?` with
`This acts on the content itself and can’t be undone from here…`.
`H: click Hide --exact --role=button`, `H: step R2d`.
**Expect** the item to leave the queue with a confirmation, and the look hidden.
**If you see `Something went wrong. It has been logged.`**: mark R2d **FAIL** (F17),
paste the server check and the `server.log` line that starts `django.db.utils`, then do
**R2e**. Otherwise skip R2e.

**R2e: Hide it from the Looks list instead (only if R2d failed).**
`H: open "/records/looks/look?q=twist-out"`, `H: step R2e`. Expect one row by
`Efua Mensah (client@yasante.dev)` with `Wash day. My twist-out finally behaved.` (if
there are several, use `H: find "Select Efua"` and pick the `--nth` for that row).
`H: check "Select Efua Mensah (client@yasante.dev)"`,
`H: click "Hide (the author can appeal)"`, `H: step R2f`. Expect `Review your action`,
`This applies to 1 selected records…`, `Apply action`. `H: click "Apply action"`,
`H: step R2g`. Expect a message like `Hide: 1` (**record** it), the row's status `Hidden`.
`H: open /review/reports`, `H: step R2h`: **record** whether the report is still listed.

**R3: Gone for Abena.** `A: link "yasante:///looks/0c9028cd-f011-52a7-922e-a7a1b917c981"`,
wait 3 s, `A: step R3`. **Expect** the look no longer shown (e.g. `This look is gone`);
**record** the wording. Seeing the photo and caption is a **FAIL**.

**R4: Efua is told.** `E: link "yasante:///settings/reports"`, wait 3 s, `E: step R4`.
Expect `Reports and appeals` with a `Your posts` section: a row like `Hidden: your look`
with the date and a reason, and the footer `If you think we got it wrong, you can appeal
once. A person reads every appeal.` **Record** the row word for word.
`qa/bin/pushlog client@yasante.dev 3`: **record** whether the server made a notification
about it.

**R5: Efua appeals.** `E: tapon "your look"` (the row from R4; use `E: find "your look"`
if needed), wait 2 s, `E: step R5`. Expect `Appeal`, the row's words and reason, and
`Why should it come back?`. `E: tapon "Why should it come back?"`,
`E: type "QA appeal: this is my own wash day photo."`, `E: tapon "Send appeal"`, wait 3 s,
`E: step R5b`. **Record** what shows. Server check:
`POST /api/moderation/<id>/appeal/ 201` (paste the line).

**R6: Appealed, once.** `E: link "yasante:///settings/reports"`, wait 3 s, `E: step R6`.
**Record** the row's new subtitle. `E: tapon "your look"`, wait 2 s, `E: step R6b`:
**expect** nothing opens (one appeal only).

**R7: The Appeals queue (F19).** `H: open /review/appeals`, `H: step R7`. Expect one
item with Efua's appeal text `QA appeal: this is my own wash day photo.`, what was done
and why, `Efua Mensah`, the look, and buttons `Overturn` and `Uphold`. **Record** the
item's title and the facts line word for word. A title like `Appeal object (…)` or a bare
`hide` is F19: mark **FAIL** for that and carry on.

**R8: Overturn.** `H: click Overturn --exact --role=button`, `H: step R8`. Expect
`Overturn?`. `H: click Overturn --exact --role=button`, `H: step R8b`. Expect a
confirmation (**record** it) and the queue empty. Server check.
`qa/bin/staffaudit 4`: paste it.

**R9: Back for everyone.** `A: link "yasante:///looks/0c9028cd-f011-52a7-922e-a7a1b917c981"`,
wait 3 s, `A: step R9`: the look is back. `E: link "yasante:///settings/reports"`,
wait 3 s, `E: step R9b`. **Record** what Efua's row says now, word for word (does it say
the appeal succeeded? does any wording contradict it?). `qa/bin/pushlog client@yasante.dev 3`:
**record**.

---

## P: A product someone adds waits for approval

**P1: Efua adds one.** `E: link "yasante:///shelf"`, wait 3 s, `E: tapon shelf-add`,
`E: tapon shelf-search`, `E: type "QA Brand"`, wait 2 s, `E: tapon shelf-add-own`,
wait 2 s, `E: step P1`. Expect `Add a product`. `E: tapon product-brand`,
`E: type "QA Brand"`, `E: tapon product-name`, `E: type "QA Staff Curl Cream"`, pick the
first product kind shown, `E: tapon product-save`, wait 3 s, `E: step P1b`. Expect it on
her shelf and `Thanks for adding it. We’ll check it over, then everyone can find it too.`
Server check.

**P2: Abena can't find it yet.** `A: link "yasante:///shelf"`, wait 3 s,
`A: tapon shelf-add`, `A: tapon shelf-search`, `A: type "QA Brand"`, wait 3 s,
`A: step P2`. **Expect** no `QA Staff Curl Cream` (only Efua sees it while it waits).

**P3: Kwame can't approve products.** `H: open /review/products`, `H: step P3`. Expect
`Your account does not have permission for this action.`

**P4: Esi sees it waiting.** `W: open /review/products`, `W: step P4`. Expect one item:
`QA Staff Curl Cream`, `QA Brand`, `Added by Efua Mensah`, and `Approve` / `Reject`.

**P5: Approve, undo, approve.** `W: click Approve --exact --role=button`, `W: step P5`.
Expect a confirmation with an `Undo` (**record** it; there should be no extra
confirmation dialog, since this one can be undone). **At once** (it lasts about 8 s)
`W: click Undo --exact`, `W: step P5b`. Expect `Undone` and the product back in the queue
(`W: reload`, `W: step P5c` if it isn't shown yet). Then `W: click Approve --exact --role=button`
again, `W: step P5d`, and leave it.
`qa/bin/staffaudit 4`: paste it (approve, undo, approve).

**P6: Now everyone can find it.** On Abena: `A: tapon shelf-search`, `A: clearfield`,
`A: type "QA Brand"`, wait 3 s, `A: step P6`. **Expect** `QA Staff Curl Cream` listed.
On Efua: `E: link "yasante:///shelf"`, wait 3 s, `E: step P6b`. **Record** whether her
product still shows a `pending`/waiting mark.

---

## T: A tip written in the workspace

**T1: Write it.** `W: open /records/content/tip/new`,
`W: fill Text "QA staff tip: rinse with cool water to finish." --exact`, leave `Active`
on and `Sort order` `0`, `W: click Save --exact --role=button`, `W: step T1`. Expect
`Created the new tip`. (A fresh seed has no tips on the server, so this is the only one.)

**T2: The app shows it.** On Abena: `A: stop`, `A: launch`, wait until the app is back
(about 10 s; if the dev-menu intro shows again, close it as in S2), `A: link "yasante:///"`, wait 4 s, `A: step T2`. Expect `TIP OF THE DAY`
with `QA staff tip: rinse with cool water to finish.` **Server check:**
`grep -E 'GET /api/tips/' qa/runs/<RUN>/server.log | tail -1` shows `200`.

**T3: Switch it off.** `W: open /records/content/tip`, `W: click More --exact`,
`W: click "Quick edit this page" --role=menuitem`, `W: uncheck Active`,
`W: click "Save quick edits"`, `W: step T3`. Expect the tip with `Active` `No`.

**T4: The app drops it.** `A: stop`, `A: launch`, wait 10 s, `A: link "yasante:///"`,
wait 4 s, `A: step T4`. **Record** the tip shown. **Expect** it is **not** the QA tip any
more. Still showing it is a **FAIL** unless the server log shows no new `GET /api/tips/`
(then say the app kept its copy, and paste the log line).

---

## V: A reported review, removed (last: in the dry run, one review report broke the workspace)

**V1: Before.** `A: link "yasante:///stylist/braidsbyama"`, wait 4 s, `A: swipe up` until
reviews show, `A: step V1`. **Record** the reviews you can see (author, first words) and
any review count. Expect one by Zainab.

**V2: Abena reports Zainab's review.** Open the review's report option (`A: find Report`;
**record** how it's reached). If you can't find it on the page, use
`A: link "yasante:///review/report?id=f1ed297b-d4b6-578e-bd01-3e40ed0fac43&author=Zainab"`
and say so. Wait 2 s, `A: step V2`. Expect `Report this review`.
`A: tapon reason-other`, `A: tapon "What happened?"`, `A: type "QA review report for staff"`,
`A: tapon review-report-send`, wait 3 s, `A: step V2b`. **Record** the confirmation.
Server check (the report request and its status).

**V2c: The workspace still opens (F20).** `W: open /`, `W: step V2c`. **Expect** Today,
now with `Needs you` showing the review report. A blank page, or `Something went wrong`,
is a **FAIL** (F20): paste the step's requests (`GET /data/overview/ -> 500`) and the
`server.log` line that starts `AttributeError`. Then do V3 anyway and record what happens.

**V3: The Review reports queue.** `H: open /review/review-reports`, `H: step V3`. Expect
one item: the reason, `QA review report for staff`, the rating, `Zainab`, `Braids by Ama`,
and buttons `Remove` and `Dismiss`. `H: click Remove --exact --role=button`,
`H: step V3b` (expect a confirmation dialog; **record** it),
`H: click Remove --exact --role=button`, `H: step V3c`. Expect a confirmation and the
queue empty. Server check: a new `500` here is a **FAIL**; paste the `django.db.utils`
line if there is one.

**V4: Gone from the page.** `A: link "yasante:///stylist/braidsbyama"`, wait 4 s,
`A: swipe up` until reviews show, `A: step V4`. **Expect** Zainab's review gone and any
count one lower than V1. **Record** what you see.

---

## Z: End

`qa/bin/staffaudit 20`: paste it under Other observations. Then `qa/bin/qaweb end`,
`qa/bin/qadb end`, `qa/bin/env-down`, `qa/bin/emus down`. Paste the `qadb end` output at
the bottom of the report. Report each step; no overall verdict.
