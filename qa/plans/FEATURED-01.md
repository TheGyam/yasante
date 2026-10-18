# FEATURED-01: Featured stylists, from staff's first click to the stylist's first booking

**Device: browser + one emulator.** `qa/bin/qaweb` runs the staff workspace and the public
site; one emulator (`client`, emulator-5554) runs the app for part P only. One agent drives
all of it **in turn**.
**Covers:** upstream tasks 009–011 (`tasks/featured-stylists.md` is the design; read its
"How it works" and "Words we use" first): staff build a page, record the stylist's yes, put
it live and make her link; a client joins the waitlist; the link refuses someone who already
has a page; a new account makes the page hers, prices her styles and sets her hours; the
page turns bookable and the waitlist is told; staff take a page down; a moderator is kept
out. Part P records what **today's app** shows for a featured page (its own version, task
012, isn't built yet).
**Time:** about 60 minutes.
**Status:** written 19-10-2026 from a full dry run by Claude (`SETUP-dry-1018`, parts W–T
and P); the steps below are the ones that worked there.

Read `qa/AGENTS.md` first (again: §8 now says **`qaweb --nth` counts from 1**). Its rules
override anything here. `qaweb step` and `qadb step` open each step's section in the same
report; fill it in before the next step. **Only the tools in `qa/AGENTS.md` §3**: no
`manage.py`, `curl`, `adb`, `git`, your own browser or scripts, not even to read. If a step
seems to need one, write `NEEDS: …` in its section and move on.

**The link is never opened as written.** The staff page shows the stylist's link as
`https://yasante.com/claim/<code>`. That is the **live** site. Copy only the code (the part
after `/claim/`) from the step's `visible.txt`, and open it locally with
`qaweb open /claim/<code> --site`. Typing or opening any `yasante.com` address breaks
`qa/AGENTS.md` §2 and §8: if you do it by accident, stop the run and say so.

---

## Notation and test data

| Short | Command | Who | Where |
| :--- | :--- | :--- | :--- |
| `W:` | `qa/bin/qaweb` (window `lead`) | Esi Boateng, `staff.lead@yasante.dev`, superuser | staff workspace (`qaweb open /…`) |
| `A:` | `qa/bin/qaweb` (window `lead`) **with `--site` pages** | the stylist making the page hers (made in part C) | public site (`qaweb open /… --site`) |
| `V:` | `qa/bin/qaweb -w visitor` | first signed out, then Efua Mensah, `client@yasante.dev` | public site |
| `H:` | `qa/bin/qaweb -w helper` | Kwame Asante, `staff.helper@yasante.dev`, moderator | staff workspace |
| `C:` | `qa/bin/qadb -d client` | Kojo Asante, `new@yasante.dev` | the app (part P only) |

`W:` and `A:` are the same browser window on two different sites, so they keep separate
sign-ins (`admin.localhost` and `localhost` share no cookies). Every `A:` command opens or
acts on a `--site` page; every `W:` command a staff page. Passwords are `password123`,
except the new account in part C.

**Made-up people, made-up handles.** Every name and Instagram handle below is test data that
belongs to nobody. Never type a real person's handle.

| Page | Instagram handle | Name | Area | Used for |
| :--- | :--- | :--- | :--- | :--- |
| page A | `qa.akua.test` | Akua Test | Peckham | the whole journey, made hers in part C |
| page B | `qa.esi.test` | Esi Test | Lewisham | stays featured, for part P |
| page C | `qa.yaa.test` | Yaa Test | Brixton | taken down in part T |

Photos come from `qa/fixtures/` (`qa-photo-1.jpg` … `qa-photo-7.jpg`, each numbered on the
picture). Use exactly the ones a step names.

**Server check, every step that saves something:** after it, run
`grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3` and paste it. Any new `5xx`
is a **FAIL**: also paste the `server.log` lines just above it. A `4xx` is OK only where the
step expects a refusal.
**Audit check** where a step says so: `qa/bin/staffaudit 5` and paste it.

---

## S: Setup

**S1.**
```
qa/bin/env-down
qa/bin/emus up --wipe 1
qa/bin/env-up --reseed <RUN>
qa/bin/web-up <RUN>
qa/bin/metro <RUN>
qa/bin/qaweb start <RUN>
qa/bin/qadb start <RUN> client=emulator-5554
```
`RUN` = `FEATURED-01-<YYYYMMDD>-<HHMM>`. Paste the last lines of each. Expect `dev_client:
true`, `backend: HTTP 200`, `web: staff workspace http://admin.localhost:5173`. Anything
else: stop, BLOCKED.

**S2: Esi signs in (routing gate for the browser).** `W: open /`,
`W: fill "Email" "staff.lead@yasante.dev"`, `W: fill "Password" "password123"`,
`W: click "Sign in" --role=button`. Two-factor isn't set up yet (`web-up` reset it):
`qa/bin/totp staff.lead@yasante.dev` prints a line with a six-digit code; type **only the
six digits**: `W: fill "First six-digit code" "<digits>"`, `W: click "Verify code"`. The
recovery codes appear: `W: step S2`, copy them into the section, then
`W: click "I saved my codes"`.
**Server check:** `grep -E '"POST /data/(session|two-factor)/' qa/runs/<RUN>/server.log | tail -2`
shows two `200`s in the last minute. No line: stop the whole run (the gate failed).

**S3.** `W: open /featured`, wait 2 s, `W: step S3`. Expect `Featured stylists`,
`Add a featured stylist`, and the empty state `No featured stylists yet.` with
`Add one once they've said yes.`

---

## W: Staff build page A

**W1: The form.** `W: click "Add a featured stylist" --role=button`, wait 2 s, `W: step W1`.
Expect `Instagram handle` (with `Paste @handle or an instagram.com link.`), `Name`, `Area`,
`Photo (optional)`, `Bio (optional)`.

**W2: Add it.** `W: fill "Instagram handle" "https://www.instagram.com/qa.akua.test/"`,
`W: fill "Name" "Akua Test"`, `W: fill "Area" "Peckham"`,
`W: upload "Photo (optional)" qa-photo-3.jpg`. Two buttons now read `Add a featured
stylist`; `W: find "Add a featured stylist"` lists them; click the **submit** one
(`button[submit]`), for example `W: click "Add a featured stylist" --role=button --nth=N`
with its number. Wait 3 s, `W: step W2`.
**Expect:** the page `Akua Test`, `@qa.akua.test` (**only the handle kept from the link**),
`Peckham · Needs photos`, the next step `Add their first look`, the numbered steps `Their
looks`, `Their yes`, `Put the page live`, `Their link`, and on the side the preview `What
clients will see once it’s live` with `Featured`, `Not taking bookings on Yasante yet`,
`Book on Instagram`, `Join the waitlist`. **Record** the address from `qaweb url`: the
part after `/featured/` is **PAGE_A**. Audit check: `featured_page_created · qa.akua.test`.

**W3: Not live yet means not public.** `V: open /qa.akua.test --site`, wait 3 s,
`V: step W3`. Expect `No page here` and a `404` for `/api/stylists/by-handle/qa.akua.test/`
in the step's network list. Anything of Akua's showing is a **FAIL**.

**W4: A look of three photos.** `W: click "Add their first look" --role=button`, wait 2 s.
`W: upload "Choose photos" qa-photo-4.jpg`, then `qa-photo-5.jpg`, then `qa-photo-6.jpg`
(three separate `upload` commands, in that order, 1 s apart). `W: click "Knotless braids"`,
`W: click "Coily"`, `W: fill "Caption (optional)" "QA look one"`, `W: step W4`.
Expect `Drag to change the order. The first is the cover.`, `Cover`, `Remove photo 1` …
`Remove photo 3`, `1 of 3 picked`. **Record** the order of the three thumbnails from
`screen.png` (each photo shows its number).
`W: click "Save look"`, wait 3 s, `W: step W4b`. Expect `1 look · 3 photos` and the status
`Waiting for their yes`. **Server check:** one `POST /data/featured/<PAGE_A>/looks/` `201`.

**W5: A look of one photo.** `W: upload "Choose photos" qa-photo-7.jpg`,
`W: click "Box braids"`, `W: click "Save look"`, wait 3 s, `W: step W5`. Expect
`2 looks · 4 photos`.

**W6: Can it go live yet?** `W: find "Put the page live"`, `W: step W6`. **Record** whether
`Put it live` is offered before the yes is recorded (expect not: `Add a look and record
the yes before putting the page live.`).

**W7: Their yes.** `W: fill "Where and when did they say yes?" "QA test: said yes in our
Instagram chat, to Esi"`, `W: click "They said yes" --role=button`, wait 3 s, `W: step W7`.
Expect `Said yes on <date>, <time> UK: QA test: said yes …` and the status `Ready to go
live`. Audit check: `featured_page_yes`.

**W8: Their link, before it's live.** `W: click "Make a new link" --role=button`, wait 3 s,
`W: step W8`. Expect `Paste this into your Instagram chat with them`, a line
`https://yasante.com/claim/<code>`, `The link works once and runs out on <date>`, and
`Making a new link stops this one working. It’s only shown now, so copy it before you
leave.` **Record** the expiry date (expect 7 days from today). Copy the code from
`visible.txt` into the section: this is **CODE_1**.

**W9: A second link replaces the first.** `W: click "Make a new link" --role=button`, wait
3 s, `W: step W9`. Copy the new code: **CODE_2**. It must differ from CODE_1.
`V: open /claim/<CODE_1> --site`, wait 3 s, `V: step W9b`. **Expect** `This link has
already been used or has run out. Message @yasantebeauty on Instagram for a new one.` and a
`410` in the network list. The page opening is a **FAIL** (an old link must stop working).

**W10: The preview she'd see.** `V: open /claim/<CODE_2> --site`, wait 3 s, `V: step W10`.
Expect `This is your page, Akua Test`, `Your page isn't public yet. This is how it will
look.`, `Sign up or sign in, then this page is yours.`, `Sign up`, `Sign in`. **Record**
whether the photos show (from `screen.png`).

**W11: Live.** `W: click "Put it live" --role=button`, wait 3 s, `W: step W11`. Expect
`Live · 0 on the waitlist` and `Live at yasante.com/qa.akua.test`. **Record** whether a
confirmation was asked first. Audit check: `featured_page_live`.

---

## V: A client finds it and joins the waitlist (Efua, website only)

Efua must **not** sign in on the app during this plan: part V checks what reaches someone
with no phone signed in.

**V1: Signed out.** `V: open /qa.akua.test --site`, wait 3 s, `V: step V1`. Expect, in this
order: `Akua Test`, `Featured`, `@qa.akua.test`, `Not taking bookings on Yasante yet`,
`Book on Instagram`, `Sign in to join the waitlist`, `We'll let you know when Akua Test
takes bookings.`, `Peckham`, `THEIR WORK`, and `Is this you? Make this page yours.`
**Expect no** price, `Request a booking`, review or rating anywhere. **Record** what
`THEIR WORK` shows (from `screen.png`: how many tiles, and any marker on the 3-photo look).

**V2: Is this you?** `V: click "Is this you? Make this page yours."`, wait 1 s,
`V: step V2`. Expect exactly `Message @yasantebeauty on Instagram from @qa.akua.test and
we'll send you a link to make this page yours.` **Expect** no form, code box or button
that hands the page over.

**V3: Book on Instagram.** `V: find "Book on Instagram"`, `V: step V3`. Don't click it (it
leaves the laptop). **Record** where it points from `aria.txt`
(`grep -n -A2 'Book on Instagram' qa/runs/<RUN>/steps/*-V3/aria.txt`). Expect
`instagram.com/qa.akua.test`.

**V4: Sign in to join.** `V: click "Sign in to join the waitlist"`, wait 2 s, `V: url`
(expect `/auth/login?next=…waitlist…`), `V: fill "Email" "client@yasante.dev"`,
`V: fill "Password" "password123"`, `V: click "Sign in" --role=button`, wait 4 s,
`V: step V4`. **Expect** back on Akua's page with `On the waitlist` (she joined in the same
move). **Server check:** `grep 'by-handle/qa.akua.test/waitlist' qa/runs/<RUN>/server.log`
shows one `PUT … 200`.

**V5: Leave and join again.** `V: click "On the waitlist"`, wait 2 s, `V: step V5`. Expect
`Join the waitlist` and a `DELETE …/waitlist/` in the server log.
`V: click "Join the waitlist"`, wait 2 s, `V: step V5b`. Expect `On the waitlist` again.

**V6: Staff see the count.** `W: open /featured/<PAGE_A>`, wait 2 s, `W: step V6`. Expect
`1 on the waitlist`. **Expect** Efua's name or email **nowhere** on the page (who waits is
never shown): `grep -ci -E 'efua|client@' qa/runs/<RUN>/steps/*-V6/visible.txt` gives `0`.

---

## C: Making the page hers

**C1: Someone who already has a page is refused.** `A: open /claim/<CODE_2> --site`, wait
2 s, `A: click "Sign in" --role=link`, `A: fill "Email" "ama@yasante.dev"`,
`A: fill "Password" "password123"`, `A: click "Sign in" --role=button`, wait 3 s. Expect
back on `This is your page, Akua Test` with `1 person is waiting to book you`.
`A: click "Make it yours"`, wait 3 s, `A: step C1`. **Expect** `You already have a page on
Yasante. Message @yasantebeauty on Instagram and we'll put the two together.` and a `409`
for `/api/featured/claim/…`. Ama getting the page is a **FAIL**: stop part C and say so.

**C2: Sign out from the header.** `A: click "Sign out" --role=button`, wait 2 s,
`A: step C2`. Expect the home page, signed out. **Server check:**
`grep '"POST /api/auth/logout/' qa/runs/<RUN>/server.log | tail -1` gives `204`.

**C3: A new account from her link.** `A: open /claim/<CODE_2> --site`, wait 2 s,
`A: click "Sign up" --role=link`, wait 2 s, `A: step C3`. **Record** the title (in the dry
run: `Set up your stylist account`). Then:
`A: fill "Your name or business name" "Akua Test"`,
`A: fill "Email" "akua.claim@yasante.dev"`,
`A: fill "Password" "qa-Claim-2026" --exact`,
`A: fill "Confirm password" "qa-Claim-2026"`,
`A: check "I’m 18 or over"`, `A: click "Create stylist account"`, wait 4 s,
`A: step C3b`. Expect `Check your email` / `We sent a 6-digit code to
akua.claim@yasante.dev.`

**C4: The code.** `qa/bin/mailbox <RUN> --to akua.claim@yasante.dev --last`; paste it.
`A: type "<the six digits>"` (the box submits itself), wait 4 s, `A: step C4`. **Expect**
back on her link: `This is your page, Akua Test`, `1 person is waiting to book you`,
`Make it yours`. **Record** if it lands anywhere else.

**C5: Make it yours.** `A: click "Make it yours"`, wait 4 s, `A: step C5`. **Expect** `Finish
your page`, `It's yours. Next, add your prices.`, `Price your styles`, and two questions:
`3 of your photos are Knotless braids. What do you charge?` and `1 of your photos is Box
braids. What do you charge?` **Server check:** `POST /api/featured/claim/<CODE_2>/` `200`.
Audit check: `featured_page_claimed`.

**C6: The link is spent.** `V: open /claim/<CODE_2> --site`, wait 3 s, `V: step C6`. Expect
the `already been used or has run out` message (`410`).

**C7: Still not bookable.** `V: open /qa.akua.test --site`, wait 3 s, `V: step C7`. Expect
it unchanged from V4 (`Featured`, `On the waitlist`): she has no prices or hours yet.

**C8: Price one style.** `A: open /finish --site`, wait 2 s. Two `Price (£)` fields:
`A: fill "Price (£)" "120" --nth=1`, `A: select "How long it takes" "4 hrs" --nth=1`,
`A: click "Save price" --nth=1`, wait 3 s, `A: step C8`. Expect `Knotless braids · 3
photos` in place of the first question. **Server check:**
`POST /api/stylists/me/finish/price/` `200`.

**C9: Still not bookable with a price and no hours.** `V: reload`, wait 3 s, `V: step C9`.
**Record** the label and buttons. (In the dry run: still `Featured`, `On the waitlist`.)

**C10: Hours.** `A: click "Set your hours" --role=link`, wait 3 s, `A: step C10`.
**Record** what's filled in already (in the dry run: `Tue–Sat, 09:00–18:00`, unsaved).
`A: click "Save hours"`, wait 4 s, `A: step C10b`. Expect `Saved.` **Server check:**
`PATCH /api/stylists/me/` `200`.

**C11: Bookable, and the waitlist told.** `V: open /qa.akua.test --site`, wait 3 s,
`V: step C11`. **Expect** no `Featured`, no `Book on Instagram`; `Request a booking` instead,
and her menu with `Knotless braids`, `4 hrs`. Then, read-only:
`qa/bin/pushlog client@yasante.dev 3` and `qa/bin/mailbox <RUN> --to client@yasante.dev`;
paste both. **Expect** one notification `Akua Test is taking bookings.` /
`You joined the waitlist for Akua Test. Book now on Yasante.` **Record** its delivery column
word for word, and whether **any email** reached Efua. (Efua has no phone signed in. Booking
updates are emailed to people in her position; if this one wasn't, she was promised `We'll
let you know` and told nothing. Say so plainly.)

**C12: Staff side after the claim.** `W: reload`, wait 2 s, `W: step C12`. **Record** what the
page says now (claimed, by whom, the link, the waitlist count). Expect the waitlist count
at `0` (it's emptied once she takes bookings).

---

## T: Taking a page down (page C)

**T1: A second page.** `W: open /featured`, `W: click "Add a featured stylist"
--role=button`, then as W2 with `@qa.yaa.test`, `Yaa Test`, `Brixton`, no photo. Then
`W: click "Add their first look" --role=button`, `W: upload "Choose photos"
qa-photo-2.jpg`, `W: click "Locs" --exact`, `W: click "Save look"`, wait 3 s,
`W: step T1`. Expect `1 look · 1 photo`.

**T2: The confirmation.** `W: click "Take the page down" --role=button`, wait 2 s,
`W: step T2`. Expect a dialog `Take the page down`, `Their page, 1 look and 1 photo are
deleted for good. The waitlist is emptied.`, `Type qa.yaa.test to confirm`. **Expect** its
`Take the page down` button to do nothing until the handle is typed:
`W: find "Take the page down"` lists the page's button first and the dialog's after it.

**T3: Take it down.** `W: fill "Type qa.yaa.test to confirm" "qa.yaa.test"`, then click
the **dialog's** button (the higher `--nth` from T2's `find`), wait 3 s, `W: step T3`.
Expect the list again, with Yaa Test gone. Audit check: `featured_page_take_down`.
`V: open /qa.yaa.test --site`, wait 3 s, `V: step T3b`: `No page here`.

**T4: A moderator can't.** `H: open /`, sign Kwame in as S2 (with
`staff.helper@yasante.dev` and `qa/bin/totp staff.helper@yasante.dev`), `H: click "I saved
my codes"`. `H: open /featured`, wait 3 s, `H: step T4`. **Expect** `Your account does not
have permission for this action.` and a `403` for `/data/featured/`. **Record** whether
`Add a featured stylist` is still offered to him. If it is: `H: click "Add a featured
stylist" --role=button`, fill `@qa.kwame.test`, `Kwame Test`, `Hackney`, submit as W2,
wait 3 s, `H: step T4b`: **expect** a refusal (`403`) and no page made.

---

## P: What today's app shows for a featured page (Record)

The app's own featured page is task 012, not built yet, so this part has **no right
answer**: record what a client sees, word for word. Nothing here is a FAIL on its own.

**P1: Page B, live.** As W1–W2 with `@qa.esi.test`, `Esi Test`, `Lewisham`, no photo; one
look with `qa-photo-1.jpg`, `Cornrows`; the yes `QA test page, no real person`;
`Put it live`. `W: step P1`: `Live · 0 on the waitlist`.

**P2: Open the app.** BOOK-01 S2 for `client` (launch, dev-menu intro, notification prompt:
`C: tapon "Don’t allow" --exact` if the app asks, `permission_deny_button` if Android
does). Sign in as BOOK-01 S3 with `new@yasante.dev`. `C: step P2`. **Server check:** a
login `200` in the last minute, or stop (routing gate).

**P3: Esi Test in the app.** `C: link "yasante:///qa.esi.test"`, wait 5 s, `C: step P3`.
**Record** every line, and from `ui.xml` whether `stylist-page-book` is enabled
(`grep -o 'resource-id="stylist-page-book"[^>]*enabled="[a-z]*"'
qa/runs/<RUN>/steps/*-P3/ui.xml`). Note anything that promises what Esi hasn't said
(`Request a booking`, terms, `Tell me if a slot opens`), and anything missing compared
with V1 (`Featured`, `Book on Instagram`, the waitlist).

**P4: Tell me if a slot opens.** Only if P3 shows it: `C: tapon stylist-page-waitlist`,
wait 3 s, `C: step P4`, then `C: tapon waitlist-save`, wait 3 s, `C: step P4b`.
**Record** the message word for word and the server's answer
(`grep 'slot-interests' qa/runs/<RUN>/server.log | tail -2`). **Do not press BACK in
between**: on the dry run a BACK closed Esi's page and the next tap landed on another
stylist's. If the message names any stylist other than Esi Test, say so and paste
`qa/bin/bookings new@yasante.dev`.

---

## Z: End

1. `C: link "yasante:///"`, `qa/bin/qadb -d client clear`.
2. `qa/bin/qaweb end`, then `qa/bin/qadb end`; paste its output at the bottom of the report.
3. `qa/bin/env-down`.

---

## For Claude's audit (the executor can ignore this)

- Writes expected: pages A, B, C created (`POST /data/featured/` ×3, plus T4b's refusal if
  run), looks (A ×2, B ×1, C ×1), yes ×2, two links on A, live ×2, waitlist PUT, DELETE,
  PUT; claim 409 (Ama) then 200; one price; one hours PATCH; take-down of C; sign-ins
  only at S2, V4, C1, C4's sign-up, T4, P2. Anything else is undisclosed.
- Check myself, not by the executor: `curl -sI localhost:8000/claim/<code>` sends
  `Referrer-Policy: no-referrer`; featured pages are `noindex` and absent from
  `/sitemap.xml` while featured; the stand-in account can't sign in (unusable password,
  `@yasante.invalid`); a link past 7 days is refused (no executor tool moves its clock).
- Dry run `SETUP-dry-1018`: C11's notification was `no_device` and **no email** reached
  Efua, while booking updates email people with no phone (`f4f21c9`). If the run shows the
  same, it's a finding: the waitlist promise isn't kept for website-only clients.
- Dry run P3: `Request a booking` disabled (no menu), `Tell me if a slot opens` enabled; the
  server refuses the slot wait (`Esi Test isn't taking bookings on Yasante yet. Join the
  waitlist and we'll let you know.`) but the app has no waitlist to join: a dead end until
  task 012. No `Featured` label, no Instagram button, terms `24 hours' notice to cancel`
  shown for a stylist who set none. Report against task 012, not as a regression.
