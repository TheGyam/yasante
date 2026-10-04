# STAFF-01: The staff workspace: sign-in and two-factor, records, privacy, errors, push, a moderator's limits

**Device: browser** (no phone, no emulator). Everything happens in `qa/bin/qaweb`'s browser
against `http://admin.localhost:5173`, the staff workspace served from this laptop.
**Covers:** upstream's staff workspace (`2673777`, `6f75307`, `1822293`, `7ca23fb`,
`cfe66e9`, `ba4bb34`, `03ecbc0`, `9ecf1c0`, `df75f03`): staff sign-in with two-factor and
recovery codes, Today, search, people records (hidden personal details, edits, history,
export, delete preview), quick edit and new records, the Errors page, push notifications
(composer, audience, test, send, delivery health), the account page, what a moderator can
and can't reach, and the sign-in limits. Candidates F14–F16 and F18 are rechecked here.
**Time:** about 90 minutes.

Read `qa/AGENTS.md` first (again: **section 8 is new** and covers the browser). Its rules
override anything here. `qaweb step` opens each step's section in the report; fill it in
before the next step. **Only the tools in `qa/AGENTS.md` §3**: no `manage.py`, `curl`,
`git`, your own browser or scripts, not even to read. If a step seems to need one, write
`NEEDS: …` in its section and move on.

---

## Notation and test data

`W:` = `qa/bin/qaweb` (the `lead` window), `H:` = `qa/bin/qaweb -w helper`,
`V:` = `qa/bin/qaweb -w visitor` (signed out). Paths like `/errors` are opened with
`W: open /errors`.

| Who | Account (password `password123`) | What they can do |
| :--- | :--- | :--- |
| Esi Boateng | `staff.lead@yasante.dev` | superuser: everything |
| Kwame Asante | `staff.helper@yasante.dev` | moderator (group `QA moderators`): review queues for looks and reviews, view people and bookings. **Not**: show hidden details, edit people, push notifications, errors, products, stylist checks, staff activity |
| Efua Mensah | `client@yasante.dev` | an app user (not staff); her record is `4b7693c6-b615-5e49-b80f-dcd1d7e8d08d`, phone `+447700900111` |

`qa/bin/web-up` makes both staff accounts fresh each run: password `password123`, no
two-factor yet, no phones.

**Server check** where a step says so: `grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3`.
Any new `500` is a **FAIL** (paste the lines from `server.log` around it). A `4xx` is OK
only where the step expects a refusal. `qaweb step` also lists each request since the last
step with its status; quote the relevant lines.

**Sign-in limit.** Staff sign-ins are limited to 5 a minute from this laptop, shared by
every window. Where a step says **wait 60 s**, wait.

---

## S: Setup

**S1.**
```
qa/bin/env-down
qa/bin/env-up --reseed <RUN>
qa/bin/web-up <RUN>
qa/bin/qaweb start <RUN>
```
`RUN` = `STAFF-01-<YYYYMMDD>-<HHMM>`. Paste all output. Expect two `staff:` lines (Esi
superuser, Kwame staff in `QA moderators`, `two-factor not set up`), `web: staff workspace
http://admin.localhost:5173 …`, and `browser up`. Anything else: stop, BLOCKED.

**S2: Routing gate.** `W: open /`, `W: step S2`. Expect `Your staff workspace`,
`Sign in with your Yasante staff account.`, `Email`, `Password`, `Sign in`, and the url
`http://admin.localhost:5173/`. **Server check:**
`grep -E 'GET /data/session/' qa/runs/<RUN>/server.log | tail -1` shows `200`. No line:
stop, the page isn't talking to the local backend.

---

## A: Signing in, two-factor, recovery codes (Esi)

**A1: Not staff.** `W: fill Email client@yasante.dev`, `W: fill Password password123`,
`W: click "Sign in"`, `W: step A1`. Expect `Check your staff email and password.` and
`POST /data/session/ -> 403`. **Server check:** `grep "Staff sign-in failed" qa/runs/<RUN>/server.log | tail -1`
names `client@yasante.dev`.

**A2: Wrong password.** `W: fill Email staff.lead@yasante.dev`, `W: fill Password wrongpass1`,
`W: click "Sign in"`, `W: step A2`. Expect the same message, `403`.

**A3: Right password → set up two-factor.** `W: fill Password password123`,
`W: click "Sign in"`, `W: step A3`. Expect `Set up two-factor authentication`,
`Add this secret to your authenticator app, with account name Yasante.`, a secret in eight
groups of four, an `otpauth://totp/Yasante%3Astaff.lead%40yasante.dev?…` line,
`First six-digit code` and `Verify code`.

**A4: Wrong code.** `W: fill "First six-digit code" 000000`, `W: click "Verify code"`,
`W: step A4`. Expect `That code is invalid or has already been used.`, still on the set-up
screen, `POST /data/two-factor/ -> 403`.

**A5: Right code → recovery codes.** `qa/bin/totp staff.lead@yasante.dev` (paste its
output; it may wait up to 30 s), then at once `W: fill "First six-digit code" <code>`,
`W: click "Verify code"`, `W: step A5`. Expect `Save your recovery codes`,
`Each code works once. Store these somewhere safe. They will not be shown again.`, **ten**
codes like `4d33-8a3c-491e-7bb1`, and `I saved my codes`. **Copy all ten codes** into
this step's section, numbered R1–R10 in the order shown; later steps use them.
`qa/bin/mailbox <RUN> --last`: expect an email to `staff.lead@yasante.dev`,
`Yasante staff security: 2FA enrolled`. Paste it.

**A6: Today.** `W: click "I saved my codes"`, `W: step A6`. Expect the Today page:
the date, `Good morning, Esi.` (or afternoon/evening), `Needs you`, `Every queue is clear.`,
`Queues` (seven, each `Clear`), and `New people`, `Booking requests`, `Confirmed bookings`,
`New looks`. **Record** the greeting and the four numbers.
`qa/bin/staffaudit 4`: expect `2FA enrolled` and `Staff sign-in` for Esi.

**A7: A reload keeps you in.** `W: reload`, `W: step A7`. Expect Today again, not the
sign-in page.

**A8: Sign out.** `W: click "Account and settings"`, `W: step A8`. Expect a menu with
`Password and two-factor`, `Match my device`, `Light`, `Dark`, `Keyboard shortcuts`,
`Sign out`. **Record** it as shown. `W: click "Sign out" --role=menuitem`, `W: step A8b`.
Expect the sign-in page. **Server check:** `grep "Staff sign-out" qa/runs/<RUN>/server.log | tail -1`.

**A9: Signed out means out.** `W: open /records/accounts/user`, `W: step A9`. Expect the
sign-in page, no list of people. Quote the `/data/…` requests and their statuses.

**Wait 60 s.**

**A10: Sign in with a recovery code.** `W: fill Email staff.lead@yasante.dev`,
`W: fill Password password123`, `W: click "Sign in"`, `W: step A10`. Expect
`Verify your sign-in`, `Authenticator or recovery code`. `W: fill "Authenticator or recovery code" <R1>`,
`W: click "Verify code"`, `W: step A10b`. Expect Today. `qa/bin/mailbox <RUN> --last`:
expect `Yasante staff security: a recovery code was used`.

**A11: One fewer.** `W: open /account`, `W: step A11`. Expect `Two-factor sign-in` and
`On since <date>. 9 recovery codes left.` **Record** the line.

**A12: A used recovery code is refused.** Sign out (A8's two clicks, no captures),
sign in with the password (A10's three commands, no capture), then
`W: fill "Authenticator or recovery code" <R1>` (the one already used),
`W: click "Verify code"`, `W: step A12`. Expect `That code is invalid or has already been
used.` Then `qa/bin/totp staff.lead@yasante.dev`, fill that code, `W: click "Verify code"`,
`W: step A12b`: Today. **Write down the code you used here: call it T1.**

**A13: A used authenticator code is refused.** Sign out, sign in with the password again,
`W: fill "Authenticator or recovery code" <T1>` (the same six digits as A12b),
`W: click "Verify code"`, `W: step A13`. Expect `That code is invalid or has already been
used.` Then a fresh `qa/bin/totp` code, `Verify code`, `W: step A13b`: Today.
(`totp` waits for a new code by itself; that's expected.)

---

## K: The account page (Esi)

**K1.** `W: open /account`, `W: step K1`. Expect `Password settings` (`Old password`,
`New password`, `New password confirmation`, `Save password settings`) and
`Two-factor sign-in`, `On since … 8 recovery codes left.`, `Make new recovery codes`.
**Record** the password help text **exactly**, including where sentences run together.

**K2: Wrong old password.** `W: fill "Old password" wrongpass1`,
`W: fill "New password" "QaStaff-2026-x!"`, `W: fill "New password confirmation" "QaStaff-2026-x!"`,
`W: click "Save password settings"`, `W: step K2`. Expect a refusal about the old
password; **record** it word for word. The password must **not** change: no
`Password changed` anywhere. (A later sign-in with `password123` proves it.)

**K3: New recovery codes.** `W: click "Make new recovery codes"`, `W: step K3`. Expect a
field `Current code from your authenticator` with `Make new codes` and `Cancel`.
`qa/bin/totp staff.lead@yasante.dev`, `W: fill "Current code from your authenticator" <code>`,
`W: click "Make new codes"`, `W: step K3b`. Expect `Your new recovery codes. Each works once.
Save them now: they won’t be shown again, and your old ones no longer work.`, ten codes,
and `10 recovery codes left`. **Copy them** as N1–N10. `qa/bin/mailbox <RUN> --last`:
expect an email that says new recovery codes were made; paste it.

**Wait 60 s.**

**K4: The old codes are dead, the new ones work.** Sign out, sign in with the password,
`W: fill "Authenticator or recovery code" <R2>` (an **old** code, never used),
`W: click "Verify code"`, `W: step K4`. Expect `That code is invalid or has already been
used.` Then `<N1>`, `Verify code`, `W: step K4b`: Today.

---

## T: Today, search, shortcuts, theme, phone width (Esi)

**T1: Search everything.** `W: press Control+k`, `W: type "Efua"`, `W: step T1`. Expect a
`Search everything` dialog with groups `PEOPLE` (`Efua Mensah (client@yasante.dev)`),
`BOOKINGS` and `LOOKS`. **Record** the groups and how many items each has.

**T2: Open a result.** `W: click "Efua Mensah (client@yasante.dev)" --role=option`,
`W: step T2`. Expect Efua's record, url ending `/records/accounts/user/4b7693c6-b615-5e49-b80f-dcd1d7e8d08d`.

**T3: Shortcuts.** `W: click "Account and settings"`, `W: click "Keyboard shortcuts" --role=menuitem`,
`W: step T3`. **Record** the list. `W: press Escape`.

**T4: Dark theme.** `W: click "Account and settings"`, `W: click "Dark" --role=menuitem`
(or `--role=menuitemradio` if `qaweb` says nothing matches; use `W: find Dark`),
`W: open /`, `W: step T4`. **Record** what the screenshot shows (dark or not, anything
unreadable). Then set `Match my device` the same way.

**T5: Phone width.** `W: viewport phone`, `W: open /`, `W: step T5`. **Record** how the
sidebar is reached (a menu button? a sheet?). `W: open /records/accounts/user`,
`W: step T5b`. **Record** whether long values (emails) wrap or are cut with `…`
(upstream says they wrap on phones and end in `…` on desktop). `W: viewport desktop`,
`W: step T5c`, and record the same for desktop.

---

## P: People records and hidden details (Esi)

**P1: The list.** `W: open /records/accounts/user`, `W: step P1`. Expect `People`,
`Accounts in your community · 84 records`, views `All`, `Stylists`, `Staff`,
`Unconfirmed email`, `Filter`, columns `Email Name Email confirmed Roles Is active Created at`.

**P2: The Staff view.** `W: click Staff --exact --role=tab`, `W: step P2`. Expect
`2 records`: `staff.helper@yasante.dev` and `staff.lead@yasante.dev`, url ending
`?is_staff__exact=1`.

**P3: A hidden phone number.** `W: open /records/accounts/user/4b7693c6-b615-5e49-b80f-dcd1d7e8d08d`,
`W: step P3`. Expect `Efua Mensah (client@yasante.dev)`, under `Stylist checks`:
`Phone` `••••••••`, a `Show` button, `Showing it is recorded in staff activity.`, and
`Email confirmed` `Yes`, `Is active` `Yes`. **Record** every Yes/No field and its value.

**P4: Show it.** `W: click Show --exact`, `W: step P4`. Expect `+447700900111`.
`qa/bin/staffaudit 1`: expect Esi, `user`, `Viewed phone`.

**P5: Edit the name (F14).** `W: reload` (the phone is hidden again), `W: click Edit --exact`,
`W: step P5`. Expect `Editing. Changes save when you press Save.` and the fields as
inputs. `W: fill Name "Efua Mensah QA" --exact`, `W: click Save --exact --role=button`,
`W: step P5b`. Expect the title `Efua Mensah QA (client@yasante.dev)`.
`qa/bin/dbcheck client@yasante.dev`: `name='Efua Mensah QA'`, `roles=['client']`.
`W: scroll bottom`, `W: step P5c`. **Record** the `History` entries word for word.
**Expect** `Changed Name.` If it says `Changed Name and Roles.` (or names anything else
you didn't touch), mark **FAIL**: that's F14.

**P6: A hidden value survives an edit.** Still on Efua's record, with the phone **not**
shown: `W: click Edit --exact`, `W: fill Name "Efua Mensah" --exact`,
`W: click Save --exact --role=button`, `W: click Show --exact`, `W: step P6`. Expect the
name back to `Efua Mensah` and the phone still `+447700900111` (not empty).

**P7: Export.** `W: open "/records/accounts/user?is_staff__exact=1"`, `W: click More`,
`W: click "Export as CSV" --role=menuitem`, `W: step P7`. `qaweb` prints the saved file
(`qa/runs/<RUN>/downloads/…-user.csv`); `cat` it into the section. Expect a header
`Email,Name,Email confirmed,Roles,Is active,Created at` and two rows (the staff).
`qa/bin/staffaudit 1`: `Exported 2 rows as CSV (is_staff__exact=1)`.

**P8: A formula in a name is defused.** Open Efua's record, `Edit`,
`W: fill Name "=1+2" --exact`, `Save`, `W: step P8`. Then
`W: open "/records/accounts/user?q=client%40yasante.dev"`, `W: step P8b` (expect one row),
`W: click More`, `W: click "Export as CSV" --role=menuitem`, `cat` the new file.
**Expect** her name written as `'=1+2` (a leading apostrophe) so a spreadsheet won't run it.
Plain `=1+2` is a **FAIL**. If the form refuses the name, record the message and say so
(also fine). Then set her name back to `Efua Mensah` (`Edit`, `fill`, `Save`), `W: step P8c`.

**P9: Delete preview, never delete.** On Efua's record, `W: scroll bottom`,
`W: click "Delete…"`, `W: step P9`. Expect a dialog listing what would go with her
account. **Record** it. `W: click Cancel --exact`. **Never confirm a delete.**
`qa/bin/dbcheck client@yasante.dev`: she still exists.

**P10: Related records.** On Efua's record, `W: step P10` and **record** the `Related`
list with counts. `W: click Bookings --role=link --nth=…` (use `W: find Bookings` to pick
the one in `Related`), `W: step P10b`. Expect a bookings list filtered to her, with the
same count as `Related` said.

---

## Q: New records and quick edit (Esi)

**Q1: Tips.** `W: open /records/content/tip`, `W: step Q1`. **Record** the count (a fresh
seed has none).

**Q2: A new tip.** `W: click "New tip" --nth=1`, `W: step Q2`. Expect `New tip` with
`Text`, `Active` (a switch, on) and `Sort order` (`0`).
`W: fill Text "QA tip one: finish with a cool rinse." --exact`,
`W: click Save --exact --role=button`, `W: step Q2b`. Expect `Created the new tip` and the
tip's page. Make a second: `W: open /records/content/tip/new`,
`W: fill Text "QA tip two: sleep on satin." --exact`, `W: fill "Sort order" 1`,
`Save` as before, `W: step Q2c`.

**Q3: Quick edit.** `W: open /records/content/tip`, `W: click More --exact`,
`W: click "Quick edit this page" --role=menuitem`, `W: step Q3`. Expect
`Quick edit · tips`, each tip with `Active` and `Sort order`, and `Save quick edits`.
`W: uncheck Active --nth=2` (the second tip), `W: click "Save quick edits"`,
`W: step Q3b`. Expect the list: `QA tip one…` `Yes 0`, `QA tip two…` `No 1`.
`qa/bin/staffaudit 1`: `Changed Active.` on tip two.

**Q4: History of a new record.** Open `QA tip one`, `W: scroll bottom`, `W: step Q4`.
**Record** the history (expect an `Added` entry by Esi Boateng).

---

## E: The Errors page (Esi)

**E1: An app error arrives.** Run, exactly:
```
qa/bin/staff-fixtures clienterror "QA fixture: booking screen crashed"
qa/bin/staff-fixtures clienterror "QA fixture: booking screen crashed"
```
(each prints `HTTP 204`). `W: open /errors`, `W: step E1`. Expect `Errors`, filters
`Open Resolved Ignored All` and `Everywhere iPhone app Android app Website Staff Server`,
and one item: `Android app`, `QA fixture: booking screen crashed`, `2 times · qa-1.0.0`.
`qa/bin/mailbox <RUN> --last`: expect an email to Esi, `Yasante: QA fixture: booking screen crashed`.

**E2: The detail.** `W: click "QA fixture: booking screen crashed"`, `W: step E2`. Expect
`Times 2`, `People affected 0`, `Latest version qa-1.0.0`, a stack with
`at QaFixture (qa/bin/staff.py:1:1)`, and two `Recent occurrences` rows: `Anonymous`,
`/qa-fixture`, `Pixel 8 (emulator) · 14`. **Record** the `Latest stack trace` time line.

**E3: Resolve.** `W: click Resolve --exact --role=button`, `W: step E3`. Expect
`Marked as resolved. You’ll hear if it comes back.` and the status `Resolved`, `Reopen`.
`W: open /errors`, `W: step E3b`: the `Open` list no longer shows it. `W: click Resolved --exact --role=tab`,
`W: step E3c`: it's there.

**E4: It comes back.** `qa/bin/staff-fixtures clienterror "QA fixture: booking screen crashed"`.
`W: open /errors`, open the item again, `W: step E4`. Expect `Open`,
`Came back after being resolved`, `Times 3`.

**E5: Ignore.** `W: click Ignore --exact --role=button`, `W: step E5`. Then
`qa/bin/staff-fixtures clienterror "QA fixture: booking screen crashed"`, `W: reload`,
`W: step E5b`. **Record** the status and `Times`. Expect it to stay `Ignored` (with
`Times 4`) and **no** new email (`qa/bin/mailbox <RUN> --last` still shows E1's alert or
an older email; paste it).

**E6: Filters.** `W: open /errors`, `W: click All --exact --role=tab`, `W: click Website --exact --role=tab`,
`W: step E6` (expect nothing listed), `W: click "Android app" --exact --role=tab`, `W: step E6b`
(expect the item).

---

## N: Push notifications (Esi)

Push delivery is off on this laptop: the server only **logs** each notification, which
`qa/bin/pushlog` shows. Nothing reaches a phone.

**N1: The page.** `W: open /notifications`, `W: step N1`. Expect `Push notifications`,
`Notifications aren’t leaving the server` with the explanation that the server is set
to log, `0 people with a phone signed in · 0 iPhone, 0 Android`,
`Your own account has no phone signed in, so a test has nowhere to go…`, and
`Nothing sent yet`.

**N2: Nothing written (F15).** `W: open /notifications/new`, `W: step N2`. **Record** the
three numbered parts. `W: click "Important update" --role=radio`, leave `Title` and
`Message` empty, `W: click "Send a test to me"`, `W: step N2b`. **Expect** a message
asking for a title and a message (the server's is `Write a title and a message first.`).
If it says `That search, filter, or page is not valid.` instead, mark **FAIL** (F15).

**N3: No phone of your own.** `W: fill Title "QA: planned maintenance" --exact`,
`W: fill Message "Bookings pause for ten minutes at 22:00 tonight." --exact`,
`W: fill "Opens (optional)" "/looks"`, `W: click "Send a test to me"`, `W: step N3`.
Expect `Your account has no phone signed in to the app, so there's nowhere to send a test.`
and the preview showing the title and message.

**N4: A link outside the app (F15).** `W: fill "Opens (optional)" "https://example.com/promo"`,
`W: click "Send a test to me"`, `W: step N4`. **Expect**
`The link must be a page in the app, starting with /, like /looks.` If it says
`That search, filter, or page is not valid.` mark **FAIL** (F15). **Record** what the
`people will get it` box shows now. (The address is only typed into the field. Never open it.)

**N5: Pretend phones.** Run, exactly:
```
qa/bin/staff-fixtures phones naomi.grant@yasante.dev abena.kamara@yasante.dev staff.lead@yasante.dev
```
`W: open /notifications/new` (a fresh form), `W: click "Important update" --role=radio`,
title and message as in N3, `Opens` `/looks`, `W: step N5`. Expect the preview and
`3 people will get it`, `Everyone: 84 people in all. 81 have no phone signed in.`, and a
button `Send to 3 people`. `W: click "Send a test to me"`, `W: step N5b`. Expect
`Sent to your phone. Check it looks right.` `qa/bin/pushlog staff.lead@yasante.dev 1`:
expect `account logged 'QA: planned maintenance'` with `"url": "/looks"`. **Record**
whether anything on screen says the test was only logged.

**N6: The audience grows while you confirm (F18).** `W: click "Send to 3 people"`,
`W: step N6`. Expect a dialog `Send to 3 people?` with `Send now` and `Cancel`. **With the
dialog open**, run `qa/bin/staff-fixtures phones client@yasante.dev`, then
`W: click "Send now"`, `W: step N6b`. Expect
`The audience changed: it now reaches 4. Check and send again.` and **no** notification
for Naomi (`qa/bin/pushlog naomi.grant@yasante.dev 1`: `no notifications`).
**Record** what the count and the button say now. Then `W: click "Send to"` (whatever
number it shows), `W: click "Send now"`, `W: step N6c`. **Expect** it to send to 4. If
it's refused again with the same message and the button still says 3, mark **FAIL**
(F18) and carry on with N7.

**N7: Send it.** If N6c didn't send: `W: click Clients --exact --role=tab`, `W: click Everyone --exact --role=tab`
(this refreshes the count), `W: step N7` (expect `4 people will get it`),
`W: click "Send to 4 people"`, `W: click "Send now"`. Expect `Sending to 4 people`.
`W: step N7b`. Then `qa/bin/pushlog naomi.grant@yasante.dev 1` and
`qa/bin/pushlog abena.kamara@yasante.dev 1`: each `account logged 'QA: planned maintenance'`.
`qa/bin/staffaudit 1`: `Sent a push notification to 4 people: QA: planned maintenance`.

**N8: History and health.** `W: open /notifications`, `W: step N8`. Expect the sent item:
`Important update`, `Everyone · Esi Boateng · …`, the title and message,
`0 of 4 delivered`, `4 only logged, not sent`; and the health line
`4 people with a phone signed in · 0 iPhone, 4 Android`, `Last day: 0 delivered, 5 only logged`.
`W: click "Check delivery now"`, `W: step N8b`. **Record** the message.

**N9: Chosen people.** `W: open /notifications/new`, `Important update`, title
`QA: just for Naomi`, message `A test for one person.`,
`W: click "Chosen people" --exact --role=tab`, `W: step N9`. Expect a `Find people` box
and `Add people to see who it reaches.` `W: fill "Find people" Naomi`. Two people are
called Naomi Grant: pick **`naomi.grant@yasante.dev`**, not `naomi.grant2`:
`W: click "Naomi Grant (naomi.grant@yasante.dev)"`, `W: step N9b`. Expect
`1 person will get it` and `Send to 1 person`; **record** the summary line under it word
for word. `W: click "Send to 1 person"`, `W: click "Send now"`, `W: step N9c`.
`qa/bin/pushlog naomi.grant@yasante.dev 1` shows `QA: just for Naomi`;
`qa/bin/pushlog abena.kamara@yasante.dev 1` still shows `QA: planned maintenance`.

**N10: News needs a yes.** `W: open /notifications/new`, `W: click "News or offer" --role=radio`,
title `QA: new stylists near you`, message `Three new stylists joined in Peckham.`,
`W: step N10`. Expect `0 people will get it` (nobody has switched news on) and **record**
the explanation. If a send button is enabled, click it and `Send now`, `W: step N10b`,
and record the message (expected: `Nobody in this audience can receive it yet.`).

---

## M: What a moderator can and can't do (Kwame, then Esi)

**Wait 60 s.**

**M1: Kwame signs in.** `H: open /`, `H: fill Email staff.helper@yasante.dev`,
`H: fill Password password123`, `H: click "Sign in"`, then `qa/bin/totp staff.helper@yasante.dev`,
`H: fill "First six-digit code" <code>`, `H: click "Verify code"`, `H: step M1`
(the recovery codes: copy them as K1–K10), `H: click "I saved my codes"`, `H: step M1b`.
Expect `Good …, Kwame.`. **Record the whole sidebar** from `visible.txt`, in order.
**Expect** only `Today`; `Reports`, `Review reports`, `Appeals`, `Reviews to publish`;
`People`; `Bookings`, `Reviews`; `Looks`, `Comments`; `Insights`. **Not** expected:
`Push notifications`, `Errors`, `Stylist checks`, `Flagged photos`, `Products to approve`,
`Staff activity`, `Groups and permissions`. Note any group heading with nothing under it.

**M2: A person, read-only (F16).** `H: open /records/accounts/user/4b7693c6-b615-5e49-b80f-dcd1d7e8d08d`,
`H: step M2`. Expect `Phone` `••••••••` with `Hidden for your role` and **no** `Show`;
`H: find Edit` and `H: find Show` both find nothing. **Record** every Yes/No field and
its value. **Expect** the same values Esi saw in P3 (`Email confirmed Yes`,
`Is active Yes`…). `—` where Esi saw `Yes` is a **FAIL** (F16).

**M3: Doors that stay shut.** For each path, `H: open <path>`, `H: step M3<x>`, and
expect `Your account does not have permission for this action.` and a `403` in the
step's requests:
`/notifications` (M3a), `/errors` (M3b), `/review/products` (M3c),
`/records/admin/logentry` (M3d), `/metrics` (M3e), `/records/shelf/product` (M3f),
`/notifications/new` (M3g: also, nothing must be sendable).
A page that shows data instead is a **FAIL**.

**M4: Insights.** `H: open /insights`, `H: step M4`. **Record** the section headings.
**Expect** no `MONEY` section (money is for superusers). Compare with Esi:
`W: open /insights`, `W: step M4b` (Esi should see `MONEY`).

**M5: What Kwame's Today shows.** `H: open /`, `H: step M5`. **Record** the
`Staff activity` list (names and what it says they did).

**M6: Kwame's export is logged.** `H: open /records/accounts/user`, `H: click More`,
`H: click "Export as CSV" --role=menuitem`, `H: step M6`. **Record** whether it was allowed
and the file's header line (`cat` it). If it worked, `qa/bin/staffaudit 1 --who staff.helper@yasante.dev`
shows the export.

**M7: Esi takes away Kwame's two-factor.** In Esi's window:
`W: open "/records/accounts/user?is_staff__exact=1"`,
`W: click "staff.helper@yasante.dev" --role=link` (his record opens in a side panel),
`W: click More --exact --nth=2` (the panel's menu, not the list's),
`W: step M7`. Expect `Change password` and `Reset two-factor`.
`W: click "Reset two-factor" --role=menuitem`, `W: step M7b`. Expect
`Reset their two-factor?` and `Their current sign-ins stop working, and they set up an
authenticator again next time. They’ll get an email about it.`
`W: click "Reset two-factor" --role=button`, `W: step M7c`. Expect
`Two-factor reset. They’ve been emailed.` (it may have faded; then say so).
`qa/bin/mailbox <RUN> --to staff.helper@yasante.dev --last`: expect
`Yasante staff security: 2FA was reset by a superuser`.

**M8: Kwame is out.** `H: reload`, `H: step M8`. **Expect** Kwame no longer in the
workspace (the sign-in or two-factor set-up screen), and his `/data/…` requests refused.
Still seeing Today with data is a **FAIL**. `H: open /records/accounts/user`,
`H: step M8b`: the sign-in page again.

---

## Z: Sign-in limits (visitor window; last, because it locks sign-in for a minute)

**Wait 60 s.**

**Z1: Six wrong passwords in a row.** Five times in a row:
`V: open /`, `V: fill Email staff.helper@yasante.dev`, `V: fill Password wrongpass1`,
`V: click "Sign in"` (no captures). Then once more and `V: step Z1`. **Expect**
`Too many attempts. Try again later.` and `429`. **Server check:**
`grep -E "Staff sign-in (failed|throttled)" qa/runs/<RUN>/server.log | tail -7`.

**Z2: The right password is refused too, for now.** At once:
`V: fill Password password123`, `V: click "Sign in"`, `V: step Z2`. Expect the same
`Too many attempts` message (the limit doesn't care which password).

**Wait 60 s.**

**Z3: It lifts.** `V: fill Email staff.helper@yasante.dev`, `V: fill Password password123`,
`V: click "Sign in"`, `V: step Z3`. Expect the two-factor screen (set-up, if M7 reset his
factor; `Verify your sign-in` if not). **Record** which.

**Z4: Too many codes.** On that screen, six times in a row:
fill the code field with `000000` and click `Verify code` (no captures for the first
five), then `V: step Z4`. **Expect** `Too many codes. Try again in a minute.` on the sixth.
**Record** the messages you saw for attempts 1–5 from the last capture's requests
(`403`s, then a `429`).

---

## Z: End

`qa/bin/qaweb end`, then `qa/bin/env-down`. Paste the `qaweb end` output at the bottom of
the report. Report each step; no overall verdict.
