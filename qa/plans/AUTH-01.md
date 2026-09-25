# AUTH-01: Sign in, sign up, email code, password reset

**Covers:** `app/index.tsx` (welcome), `app/auth/*`, the root auth guard in
`app/_layout.tsx`, and `backend/apps/accounts` (signup, login, logout, email code, reset).
**Needs:** the phone connected and unlocked, with the Yasante **dev-client** build installed.
**Time:** about 60–90 minutes. Parts A–D can be run on separate days; each starts from P.

Read `qa/AGENTS.md` first. Its rules override anything here that seems to conflict.

---

## Test data (use exactly these)

At the start, set `STAMP` to the laptop's current time as `HHMM` (e.g. `1432`) and
`RUN` to `AUTH-01-<YYYYMMDD>-<STAMP>`. Write both at the top of the report.

| Name | Value |
| :--- | :--- |
| Seeded account | `ama.achieng@yasante.dev` / `password123` (exists only in the local database) |
| New client | `a01.<STAMP>.client@example.com`, name `QA Client <STAMP>` |
| Second client | `a01.<STAMP>.two@example.com`, name `QA Two <STAMP>` |
| Corrected email | `a01.<STAMP>.fixed@example.com` |
| New stylist | `a01.<STAMP>.stylist@example.com`, name `QA Braids <STAMP>` |
| Password | `Qa-Test-2026!` |
| New password (reset) | `Qa-Reset-2026#` |

The server limits requests by rate: **sign-up 3 a minute, sign-in 5 a minute**. Where a
step says **wait 65 s**, really wait, or later steps fail for the wrong reason.

---

## P: Preflight and routing gate (run before every part)

**P1: Backend up.**
`qa/bin/env-up --reseed <RUN>` (reseed only on the first part of the day; later parts
use `qa/bin/env-up <RUN>`). Expect the last lines to be `backend: HTTP 200 …` and
`server log: …`. Paste them. No `qadb step` here, because the phone isn't involved yet.

**P2: Metro up.** `qa/bin/metro <RUN>`. Expect `metro: running on :8082`. Paste it.
Then **server check**: `cat .env.development.local` from the repo root. Expect
`EXPO_PUBLIC_API_BASE_URL=http://localhost:8765`. Paste it.

**P3: Device.** `qa/bin/qadb start <RUN>`. Paste the full JSON.
Expect `"dev_client": true`. **If it is false, or a WARNING is printed, stop the run
here**: that build can only talk to the live server. Report BLOCKED.

**P4: Fresh app.** `qa/bin/qadb clear`, then `qa/bin/qadb launch`. Wait 20 s for the
bundle (the first load can take a minute; the dev client shows a progress bar). Then
`qadb step P4 "welcome after clear"`.
Expect the welcome screen with these texts: `Get started`,
`I already have an account`, `Just look around`, and the three promises
(`Made for your texture`, `Plan every style`, `See your growth`).
If a dev-client menu or "Connect to Metro" screen shows instead, capture it and stop:
BLOCKED.

**P5: ROUTING GATE.** This proves the app talks to the laptop.
1. `qadb tapon "I already have an account"` → `qadb step P5a`
2. Tap the Email field, type `ama.achieng@yasante.dev`; tap the Password field, type
   `password123`; `qadb tapon "Sign in" --exact` (if several match, it's the button,
   not the footer link, so pick the one that is a button in the `find` output).
3. Wait 5 s, `qadb step P5b "after sign-in"`.
4. **Server check:** `grep -E '"POST /api/auth/login/' qa/runs/<RUN>/server.log | tail -3`

**Expect:** the server check shows a line ending `" 200 <number>` with a time from the
last minute (server log times are UTC), and the screen shows the app's home (the looks
feed), not the login screen.
**If the grep prints nothing, STOP THE WHOLE RUN.** The app is talking to some other
server. Do not sign up, do not continue. Report the gate as FAIL.

**P6: Back to signed out.** Open the Profile tab (`qadb find "Profile"`, tap it), open
settings (look for a gear or "Settings"), `qadb tapon "Sign out"`, and confirm the dialog
with `Sign out`. `qadb step P6`.
Expect: the welcome or sign-in screen. **Server check:**
`grep -E '"POST /api/auth/logout/' qa/runs/<RUN>/server.log | tail -1` shows `204`.
Record how you got to settings (the exact taps), because later plans will reuse it.

---

## A: Sign in and session

Start: signed out, on the welcome screen (after P6). `qadb tapon "I already have an account"`.

**A1: Empty form.** Tap `Sign in` (the button) with both fields empty. `qadb step A1`.
Expect: `Enter your email` and `Enter your password` under the fields. **Server check:**
no new `POST /api/auth/login/` line since P5 (paste the `grep -c` count before and after).

**A2: Malformed email.** Type `ama.achieng` in Email, `x` in Password, submit.
`qadb step A2`. Expect: `That email doesn’t look right`. No new login request.

**A3: Wrong password.** Clear both fields (`qadb stop` + `qadb launch` is acceptable,
then navigate back to Sign in). Email `ama.achieng@yasante.dev`, password `wrongpass1`,
submit. `qadb step A3`.
Expect: a red message reading exactly `Incorrect email or password.` The fields keep
their contents. **Server check:** the last login line shows `400`.

**A4: Rate limit (Record).** Without waiting, submit the same wrong password 5 more times
(tap `Sign in` 5 times, 2 s apart). `qadb step A4` after the last.
**Server check:** `grep -E '"POST /api/auth/login/' qa/runs/<RUN>/server.log | tail -7`.
Expect: at least one `429` line. **Record** the exact message shown on screen for the
429. It should be plain words, with no number code, no "429" and no "Request failed".
Quote it.

**A5: Correct sign-in after the limit.** **Wait 65 s.** Replace the password with
`password123` (clear the field with `qadb key DEL` ×15, then type), submit, wait 5 s.
`qadb step A5`. Expect: the looks feed. Server: last login line `200`.

**A6: Session survives a restart.** `qadb stop`, `qadb launch`, wait 20 s. `qadb step A6`.
Expect: straight into the feed, with no welcome and no sign-in screen.
**Server check:** `grep -cE '"POST /api/auth/login/' …` is unchanged from A5.

**A7: Sign out.** Sign out as in P6. `qadb step A7`. Then `qadb stop`, `qadb launch`,
wait 20 s, `qadb step A7b`. Expect: still signed out after the restart (welcome or
sign-in screen, no feed with an account). Server: `logout` line `204`.
**db check:** `qa/bin/dbcheck ama.achieng@yasante.dev`. Paste it. The `revoked` count
should be at least 1.

---

## B: Client sign-up and the email code

Start: signed out on the welcome screen. **Wait 65 s** if Part A just ran.

**B1: Role choice.** From welcome, `qadb tapon "Get started"`. **Record** where it
lands (it may be the hair quiz, not sign-up). Capture `qadb step B1`. If it's the quiz,
go back (`qadb key BACK`) and find another route to "Join" / "Create an account": the
sign-in screen's footer has `Create an account`. Capture the screen with the two role
cards (`I’m here for my hair`, `I’m a stylist`) as `qadb step B1b`.

**B2: Pick client.** `qadb tapon "I’m here for my hair"`. Wait 2 s. `qadb step B2`.
Expect: title `Create your account`, fields Name, Email, Password, Confirm password, the
18+ checkbox, and a `Create account` button.

**B3: Empty submit.** `qadb tapon "Create account" --exact` (the button). `qadb step B3`.
Expect all of: `Tell us your name`, `Enter your email`, `Use at least 8 characters`,
`Confirm your password`, `Confirm you’re 18 or over to continue`. No
`POST /api/auth/signup/` in the server log.

**B4: Password rules.** Type Name `QA Client <STAMP>`, Email
`a01.<STAMP>.client@example.com`, Password `abcdefgh`. `qadb step B4` (the strength
checklist should be visible). **Record** which of `8+ characters`, `Uppercase`,
`Lowercase`, `Number`, `Symbol` appear ticked or unticked, as far as `ui.xml` or the
screenshot shows. Then submit (confirm empty, box unticked) and `qadb step B4b`.
Expect: the password error `Add an uppercase letter`.

**B5: Mismatch.** Clear the password (DEL ×10). Type `Qa-Test-2026!`, confirm
`Qa-Test-2026?`, tick the checkbox (`qadb tapon "I’m 18 or over"`), submit.
`qadb step B5`. Expect: `Passwords don’t match`. No signup request.

**B6: Email already used.** Clear Email (DEL ×40), type `ama.achieng@yasante.dev`; fix
Confirm to `Qa-Test-2026!`; submit. Wait 3 s. `qadb step B6`.
**Server check:** last signup line `400`.
**Record** the on-screen message exactly. The server says
`An account with this email already exists.`. If the screen instead shows
`We couldn’t create your account. Try again in a moment.`, mark it **FAIL** (the real
reason was swallowed).

**B7: Real sign-up.** Clear Email, type `a01.<STAMP>.client@example.com`, submit. Wait 5 s.
`qadb step B7`.
Expect: title `Check your email`, a subtitle containing
`a01.<STAMP>.client@example.com`, six code boxes, `Resend code in 0:2x` counting down,
`Wrong email?`, `Sign out`.
**Server check:** `grep -E '"POST /api/auth/(signup|email/start)/' … | tail -2` shows
signup `201` and email/start `200`.
**Mailbox:** `qa/bin/mailbox <RUN> --to a01.<STAMP>.client@example.com`. Exactly 1 email with a
code. Note the code as CODE1 and paste the output.
**db check:** `dbcheck a01.<STAMP>.client@example.com`: `verified=False`,
`roles=['client']`, one open challenge with `attempts=0`.

**B8: Wrong code.** Type a six-digit code that is **not** CODE1 (use CODE1 with its last
digit changed: +1, 9→0). Wait 3 s. `qadb step B8`.
Expect: `That code isn’t right. 4 tries left.`; the boxes clear themselves.
db check: `attempts=1`.

**B9: Leaving mid sign-up.** `qadb stop`, `qadb launch`, wait 20 s. `qadb step B9`.
Expect: the app opens on `Check your email` again, not the feed. **Record** whether a
new email was sent (`mailbox --to …` count) and what the resend line says.

**B10: Resend.** Wait until the screen shows `Resend code` (up to 30 s; capture the
countdown once as `B10a`). `qadb tapon "Resend code"`. Wait 3 s. `qadb step B10b`.
Mailbox: a new email; note its code as CODE2. **Record**: is CODE2 different from CODE1?
**Server check:** `grep -E '"POST /api/auth/email/start/' … | tail -4`. If the screen
went back to a countdown but the last email/start line is `429` and the mailbox got **no**
new email, mark **FAIL**: the app told her a code was sent when none was. Say so plainly.
In that case wait 65 s, resend again, and continue with that code as CODE2.
db check: paste it and **record** the `attempts` value on the open challenge.

**B11: The old code after a resend (Record).** Type CODE1 (unless it equals CODE2, in
which case skip and say so). `qadb step B11`. **Record** the result. A secure app
rejects it. If CODE1 is accepted and you land in the app, write that down clearly,
because it is important, and skip B12.

**B12: Correct code.** Type CODE2. Wait 3 s. `qadb step B12`.
Expect: a short success state, then the client app (feed). **db check:**
`verified=True`, no open challenge. Server: `POST /api/auth/email/verify/` `200`.

**B13: Signed in after restart.** `qadb stop`, `qadb launch`, wait 20 s. `qadb step B13`.
Expect: the feed, not `Check your email`.

### B-lock: five wrong codes (second account)

Sign out (as P6). **Wait 65 s.** Sign up the **second client**
(`a01.<STAMP>.two@example.com`, `QA Two <STAMP>`, `Qa-Test-2026!`) the same way as B7,
capturing `qadb step BL1` on `Check your email`.

**BL2: Wrong email flow.** `qadb tapon "Wrong email?"`. `qadb step BL2`. Expect: title
`Fix your email` with the current address pre-filled. Clear it (DEL ×40), type
`not-an-email`, tap `Send the code there`. `qadb step BL2b`. Expect:
`That email doesn’t look right`, and no email/start request.
Clear it, type `a01.<STAMP>.fixed@example.com`, send. Wait 3 s. `qadb step BL2c`.
Expect: back on `Check your email`, with the subtitle now naming the `.fixed` address.
Mailbox `--to a01.<STAMP>.fixed@example.com`: 1 email. db check on the **fixed**
address: the account exists with `name='QA Two <STAMP>'`, `verified=False`.
db check on `a01.<STAMP>.two@example.com`: `no account`.

**BL3: Lockout.** Enter 5 wrong codes, one at a time, waiting 3 s after each, and capture
each result as `BL3-1` … `BL3-5`. Expect the messages to count down
(`4 tries left` … `1 try left` or `1 tries left`, so **record** the exact wording),
and the 5th to say `Too many tries. Ask for a new code.`
Then type the **correct** code from the mailbox. `qadb step BL3-6`. Expect: still
refused (`Too many tries…`). db check: `attempts=5` and `verified=False`.

**BL4: Recover by resending.** Wait for `Resend code`, tap it, type the new code from
the mailbox. `qadb step BL4`. Expect: into the app. db check: `verified=True`.

---

## C: Forgot and reset password

Start: signed out. Uses the account from Part B (`a01.<STAMP>.client@example.com`).
If Part B wasn't run today, use `ama.achieng@yasante.dev` and say so.

**C1: Unknown address.** Sign-in screen → `qadb tapon "Forgot password?"`.
`qadb step C1`. Expect: `Reset your password`. Type `nobody.<STAMP>@example.com`, tap
`Send reset link`. `qadb step C1b`.
Expect: `Check your email` with the text
`If there’s an account for nobody.<STAMP>@example.com, a reset link is on its way…`.
Server: `forgot-password` `200`. Mailbox `--to nobody.<STAMP>@example.com`: **0** emails.

**C2: Real address.** Go back to `Reset your password` (`Back to sign in` → `Forgot
password?`). Enter the Part B client address, send. `qadb step C2`. Expect the same
screen as C1b (no hint that this one exists). Mailbox `--to …`: 1 reset email with a
`link:`. Paste it and call it LINK1.

**C3: Broken link.** `qadb link "https://yasante.com/auth/reset-password?uid=x"` (no token).
Wait 3 s. `qadb step C3`. Expect: an alert `This link has expired` /
`Request a new reset link and try again.`. Dismiss it (`qadb tapon "OK"` or the only
button), then `qadb step C3b`. Expect the `Reset your password` screen.

**C4: Real link.** `qadb link "<LINK1>"` (quote it: it contains `&`). Wait 3 s.
`qadb step C4`. Expect: `Set a new password`. **If the link opens a browser, a chooser,
or anything other than Yasante, `qadb` will refuse to capture. Mark BLOCKED, run
`qadb recover`, and continue at C8.**

**C5: Weak and mismatched.** Type new password `short`, submit (`Update password`).
`qadb step C5`. Expect `Use at least 8 characters`. Clear it; type `Qa-Reset-2026#` and
confirm `Qa-Reset-2026`. Submit. `qadb step C5b`. Expect `Passwords don’t match`.
No `reset-password` request in the server log yet.

**C6: Reset.** Fix the confirmation to `Qa-Reset-2026#`, submit. Wait 3 s. `qadb step C6`.
Expect: `Password updated` and a `Sign in` button. Server: `reset-password` `200`.
db check: `revoked` now equals `issued` (every session ended).

**C7: The same link again.** `qadb link "<LINK1>"`, set `Qa-Other-2026$` twice, submit.
`qadb step C7`. Expect: refused, with a message like
`This reset link has expired. Request a new one.`. **Record** it exactly. If it says
`Password updated`, that is a **FAIL** (a reset link that works twice).

**C8: Old password is dead.** Sign in with the client address and `Qa-Test-2026!`.
`qadb step C8`. Expect `Incorrect email or password.`

**C9: New password works.** **Wait 65 s** if you've made 4+ sign-in attempts in the last
minute. Sign in with `Qa-Reset-2026#`. `qadb step C9`. Expect: the feed.

**C10: A reset link while signed in (Record).** Still signed in, send yourself another
reset (you must sign out to reach the screen, so do it through the server instead):
**server check** `curl -s -X POST localhost:8000/api/auth/forgot-password/ -H 'Content-Type: application/json' -d '{"email":"a01.<STAMP>.client@example.com"}'`
then take the new link from `mailbox --last`. Sign back in if you signed out. Then
`qadb link "<that link>"`, wait 3 s, `qadb step C10`. **Record** what screen appears.
There is no fixed expectation; the owner wants to know.

---

## D: Stylist sign-up (short)

Start: signed out. **Wait 65 s** after any other sign-up.

**D1.** From the join screen, `qadb tapon "I’m a stylist"`. `qadb step D1`. Expect: title
`Set up your stylist account`, name label `Your name or business name`, button
`Create stylist account`.

**D2.** Fill it in with the stylist test data, tick the box, submit, and verify the
email with the mailbox code as in B7/B12, capturing `D2` (Check your email) and `D3`
(after the code).
Expect after D3: the **stylist** side of the app, with its own tabs (e.g. Today,
Requests, Portfolio, Account); **record** the tab names you see. It should not be the
client feed. db check: `roles=['stylist']`, `verified=True`.

**D4.** `qadb stop`, `qadb launch`, wait 20 s, `qadb step D4`. Expect: still the stylist
side.

---

## Z: Teardown (always, even after a STOP)

1. `qa/bin/qadb end`, and paste its output into the report.
2. `qa/bin/env-down`.
3. Finish `qa/reports/<RUN>.md`. List every step ID from this plan, including NOT RUN.

---

## For Claude's audit (the executor can ignore this)

- `journal.jsonl`: step order and timestamps match the report; every reported step has a
  capture; there are no `REFUSED` entries the report doesn't mention; the hashes match
  `MANIFEST.json` and the files.
- Pasted `visible text` blocks equal `steps/*/visible.txt`.
- Server log lines quoted in the report exist verbatim in `server.log`.
- Re-run `dbcheck` for every account.
- Look at the screenshots for B6, B11, BL3-*, C6, C7 and C10 myself.
- Candidate code findings to confirm or clear with this run:
  `ForgotPasswordView` has no throttle (C1/C2 could be repeated to flood a mailbox);
  whether the old code still works after a resend (B11); whether the signup field
  error survives `errorMessage` (B6).
