# SETTINGS-01: Settings, privacy, policies, reports, sign-out, delete account

**Device: emulator only**: `client` (emulator-5554).
**Covers:** `app/settings/*` (index, notifications, privacy, faqs, report a problem,
reports and appeals, appeal), `app/policy/[type]`, `app/review/report`, sign-out (F1
again), and deleting an account.
**Time:** about 45 minutes.

Read `qa/AGENTS.md` first (again, since it changed). Its rules override anything here.
`qadb step` opens each step's section in the report; fill it in before the next step.
**Only the tools in `qa/AGENTS.md` §3**: no `manage.py`, `curl`, `adb` or `git`, not even
to read. If a step seems to need one, write `NEEDS: …` in its section and move on.

---

## Test data

One device, so `qadb` needs no `-d`.

| Who | Account (password `password123`) | Used for |
| :--- | :--- | :--- |
| Efua | `client@yasante.dev` | everything except the last part |
| Adwoa | `adwoa.diallo@yasante.dev` (Adwoa Diallo) | **deleting her account**, part D only |

**Server check, every step that saves something:** after it, run
`grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3` and paste it. Any new
`5xx` is a **FAIL**. A `4xx` is only OK where the step expects a refusal.

**Never tap `Write email`** (Report a problem). It opens a mail app outside Yasante.

---

## S: Setup

**S1.**
```
qa/bin/env-down
qa/bin/emus up --wipe 1
qa/bin/env-up --reseed <RUN>
qa/bin/metro <RUN>
qa/bin/qadb start <RUN> client=emulator-5554
```
`RUN` = `SETTINGS-01-<YYYYMMDD>-<HHMM>`. Expect `dev_client: true`, or stop: BLOCKED.
**S2.** BOOK-01 S2. **S3.** BOOK-01 S3 as Efua. 1 login `200`, or stop.

---

## T: Settings

**T1.** `qadb link "yasante:///settings"`, wait 3 s, `qadb step T1`. Expect `Settings` with
`Notifications`, `Privacy and data`, `Help and privacy` (`Questions`,
`Report a problem`, `Reports and appeals`, `Privacy policy`, `Terms of use`) and
`Sign out`. **Record** anything else.
**T2: Notifications.** Tap `Notifications`, wait 2 s, `qadb step T2`. **Record** every
category and whether it's on. Turn the **first** one off, wait 2 s, `qadb step T2b`.
Server check. Leave the screen and come back (`qadb key BACK`, tap `Notifications`),
`qadb step T2c`: **record** whether it stayed off. Turn it back on.
**T3: Privacy.** `qadb link "yasante:///settings/privacy"`, wait 3 s, `qadb step T3`.
Expect `What you share` (`Personalisation`, `Hair research` off, `Usage analytics`) and
`Your data` (`Download my data`, `Delete account`). **Record** each switch's state.
Turn `Hair research` on, `qadb step T3b`, server check, then off again.
**T4: Download my data.** `qadb tapon "Download my data"`, confirm if asked, wait 3 s,
`qadb step T4`. Expect `Request sent` / `We'll email you a download link when your data
is ready.` Server check. `qa/bin/mailbox <RUN> --to client@yasante.dev`: **record**
whether an email arrived.
**T5: Questions.** `qadb link "yasante:///settings/faqs"`, `qadb step T5`. Tap
`How do I book a stylist?`, `qadb step T5b`. **Record** whether the answer opens.
**T6: Policies.** For each of `terms`, `privacy`, `guidelines`, `stylist-terms`:
`qadb link "yasante:///policy/<type>"`, wait 3 s, `qadb step T6-<type>`. Expect the title
(`Terms of use`, `Privacy policy`, `Community guidelines`, `Stylist terms`) and a body,
**or** `Not published yet`. **Record** which.
**T7: Report a problem.** `qadb link "yasante:///settings/report"`, `qadb step T7`.
Expect `Report a problem` with `Subject`, `What happened` and `Write email`.
**Do not tap `Write email`.** Go back.

---

## R: Reports and appeals

**R1: Nothing yet.** `qadb link "yasante:///settings/reports"`, `qadb step R1`. Expect
`Reports and appeals` and `Nothing reported`.
**R2: Report a look.** `qadb link "yasante:///looks/d46e7f35-f68a-52a2-abd5-22136862b09c"` (Zainab's silk press), wait 3 s,
`qadb tapon "Options for"`, `qadb tapon reason-hate`, type `QA settings report` in
`What happened?`, `qadb tapon look-report-send`, wait 3 s, `qadb step R2`. Expect
`Thanks for telling us`. Server check.
**R3: Report a review.** `qadb link "yasante:///stylist/braidsbyama"`, wait 4 s,
`qadb swipe up` until a review shows, `qadb step R3`. Open the review's report option
(`find Report`; **record** how it's reached), pick `reason-other`, type
`QA review report`, `qadb tapon review-report-send`, wait 3 s, `qadb step R3b`. Server
check. If you can't find the report control on the page, open the screen directly with
`qadb link "yasante:///review/report?id=f1ed297b-d4b6-578e-bd01-3e40ed0fac43&author=Zainab"` and say so.
**R4: Listed.** `qadb link "yasante:///settings/reports"`, `qadb step R4`. Expect
`What you reported` listing the look (`A look: Hateful or abusive`) and, if R3 worked,
the review.
**R5: Appeal screen.** `qadb link "yasante:///settings/appeal"`, `qadb step R5`.
**Record** what it shows with nothing to appeal. Send nothing.

---

## O: Sign out (F1 again)

**O1.** Count first: `grep -cE 'POST /api/auth/logout' qa/runs/<RUN>/server.log`.
`qadb link "yasante:///settings"`, `qadb swipe up`, `qadb tapon "Sign out"`, wait 2 s,
`qadb step O1`. Expect `Sign out?` / `Your collections and bookings stay safe in your
account.` Confirm (`dialog-confirm`), wait 4 s, `qadb step O1b`. Expect the welcome
screen. **Server check:** the same `grep -c` again. **If it hasn't gone up, F1 is still
there**: mark FAIL and say so.

---

## D: Delete an account (Adwoa)

**D1.** Sign in as Adwoa (BOOK-01 S3's steps, with the email code). Server: login `200`.
`qa/bin/dbcheck adwoa.diallo@yasante.dev`, paste it (`active=True`).
**D2.** `qadb link "yasante:///settings/privacy"`, `qadb tapon "Delete account"`, wait 2 s,
`qadb step D2`. Expect `Delete your account?` with the text starting `This removes your
profile, hair profile, looks, comments, collections and shelf.` and `Keep my account`.
`qadb tapon "Keep my account"`, `qadb step D2b`: nothing deleted (`dbcheck` again).
**D3.** `Delete account` again, and this time confirm the delete, wait 5 s,
`qadb step D3`. Expect the welcome screen. Server check.
`qa/bin/dbcheck adwoa.diallo@yasante.dev`: **record** the output (gone, or
`active=False`).
**D4.** Try to sign in as Adwoa again, `qadb step D4`. **Record** the message. It must
**not** sign her in.

---

## Z

`qadb end`, `qa/bin/env-down`, `qa/bin/emus down`. Paste the `qadb end` output at the
bottom of the report. Report each step; no overall verdict.
