# SITE-01: yasante.com: the public pages, a stylist's sign-up and studio on the web

**Device: browser**, plus **one emulator** for part X only. `qa/bin/qaweb` drives the
public site at `http://localhost:5173` (the same pages as yasante.com, served from this
laptop) and, for a few checks, the staff workspace.
**Covers:** upstream PRs #1 and #2 (yasante.com rebuilt; "Stylists sign up and run their
studio on the web"): home, waitlist, looks, a look, stylist pages, style and area pages,
policies, the delete-account page, not-found pages; a stylist's web sign-up, email code
and five-step set-up; the studio (Today, Menu, Working hours, Getting paid, Your work and
posting, Account); what staff see of it (waitlist entries, a flagged photo); and a request
made in the app and answered on the web.
**Time:** about 90 minutes.
**Status:** written from the site's code; Claude's dry run comes before the first run.
Where a step says **Record**, the wording wasn't checked live yet: write down what appears.

Read `qa/AGENTS.md` first (section 8 covers the browser). Its rules override anything
here. `qaweb step` (and `qadb step` in part X) opens each step's section in the report;
fill it in before the next step. **Only the tools in `qa/AGENTS.md` §3**: no `manage.py`,
`curl`, `adb`, `git`, your own browser or scripts, not even to read. If a step seems to
need one, write `NEEDS: …` in its section and move on.

---

## Notation and test data

| Prefix | Command | Who |
| :--- | :--- | :--- |
| `V:` | `qa/bin/qaweb -w visitor` | a visitor, who becomes the new stylist **Tola** in part A |
| `H:` | `qa/bin/qaweb -w helper` | **Efua**, an app client, trying the web studio (part C) |
| `W:` | `qa/bin/qaweb` (window `lead`) | **Esi**, staff lead, in the workspace |
| `C:` | `qa/bin/qadb -d client` | Efua's app on emulator-5554 (part X) |

Public pages are opened with `--site`: `V: open /looks --site` opens
`http://localhost:5173/looks`. Workspace pages without it, as in STAFF-01.

| Who | Account | Notes |
| :--- | :--- | :--- |
| Tola (new) | `qa.tola@yasante.dev`, password `Braids-Tola-2026` | made in part A, page `qatolabraids` |
| Efua Mensah | `client@yasante.dev`, `password123` | a client |
| Esi Boateng | `staff.lead@yasante.dev`, `password123` | staff superuser |

Seeded things (copy IDs exactly): **Braids by Ama** `braidsbyama` (Peckham); Efua's public
look `0c9028cd-f011-52a7-922e-a7a1b917c981` (`Wash day. My twist-out finally behaved.`);
Efua's **private** look `fbeeb843-1bd5-51a2-bc38-2d417349ba03`. Test photos
`qa-photo-1.jpg`, `qa-photo-2.jpg` are in `qa/fixtures/`.

**Links into the app** (`Request a booking`, `Open in the app`) go to `yasante://…`.
**Never click them**: read where they point from the step's `aria.txt` (the `/url:` line
under the link) and quote it.

**Pop-ups.** The studio asks some questions with the browser's own pop-up (`Remove … from
your menu?`). `qaweb` says **Cancel** to every pop-up unless the click has
`--accept-dialog`, which says **OK** to the next one. Use it only where a step says so.
`qaweb step` lists each pop-up's text under `console`.

**Server check** where a step says so: `grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3`.
A new `500` is a **FAIL** (paste the `server.log` lines above it). A `4xx` is OK only
where the step expects a refusal.

---

## S: Setup

**S1.**
```
qa/bin/env-down
qa/bin/env-up --reseed <RUN>
qa/bin/web-up <RUN>
qa/bin/qaweb start <RUN>
```
`RUN` = `SITE-01-<YYYYMMDD>-<HHMM>`. Paste all output. Expect the two `staff:` lines,
`web: … site http://localhost:5173`, and `browser up`. Anything else: stop, BLOCKED.

**S2: Routing gate.** `V: open / --site`, `V: step S2`. Expect the home page and the url
`http://localhost:5173/`. Then `V: open /braidsbyama --site`, `V: step S2b`: Braids by
Ama's page. **Server check:** `grep -E 'GET /api/stylists/by-handle/braidsbyama' qa/runs/<RUN>/server.log | tail -1`
shows `200`. No line: stop, the site isn't talking to the local backend.

**S3: Esi in the workspace** (for the staff checks later): `W: open /`,
`W: fill Email staff.lead@yasante.dev`, `W: fill Password password123`,
`W: click "Sign in"`, `qa/bin/totp staff.lead@yasante.dev`,
`W: fill "First six-digit code" <code>`, `W: click "Verify code"`,
`W: click "I saved my codes"`, `W: step S3`: Today.

---

## P: The public pages (visitor)

**P1: Home.** `V: open / --site`, `V: step P1`. Expect `Everything for your hair, in one
place.`, `Two sides, one app`, and buttons or links `See the looks`, `Join the waitlist`,
`Set up your page`. **Record** the headings in order.

**P2: Join the waitlist.** `V: fill Email qa.waitlist@yasante.dev`,
`V: select "I’m" "a stylist"`, `V: fill "Area (optional)" Peckham`,
`V: click "Join the waitlist" --role=button`, `V: step P2`. Expect `You’re on the list.`
and `We’ll email qa.waitlist@yasante.dev when Yasante opens near you.`
**Server check:** `grep 'POST /api/waitlist/' qa/runs/<RUN>/server.log | tail -1` → `201`.

**P3: The same email again.** `V: open / --site`, fill the form again exactly as P2,
submit, `V: step P3`. Expect the **same** answer (the site doesn't say whether you were
already on it). Then `W: open /records/web/waitlistentry`, `W: step P3b`. Expect **one**
row for `qa.waitlist@yasante.dev`; **record** its role, area and source.

**P4: From a stylist's page.** `V: open "/?from=braidsbyama#waitlist" --site`,
`V: fill Email qa.waitlist2@yasante.dev`, leave `I’m` as it is, submit, `V: step P4`.
`W: reload`, `W: step P4b`. **Expect** the new row's source to be `braidsbyama`.

**P5: Not an email.** `V: open / --site`, `V: fill Email not-an-email`,
`V: click "Join the waitlist" --role=button`, `V: step P5`. **Record** what stops it (the
browser's own check or a message). No `POST /api/waitlist/` may follow; quote the step's
requests.

**P6: The looks.** `V: open /looks --site`, `V: step P6`. **Record** the filters and the
first three looks' captions. Then
`V: open /looks/0c9028cd-f011-52a7-922e-a7a1b917c981 --site`, `V: step P6b`. Expect
Efua's `Wash day. My twist-out finally behaved.`, its style chips, and `Open in the app`.
From `aria.txt`, **quote** the `Open in the app` link's `/url:` (expect
`yasante://looks/0c9028cd-f011-52a7-922e-a7a1b917c981`).

**P7: A private look stays private.** `V: open /looks/fbeeb843-1bd5-51a2-bc38-2d417349ba03 --site`,
`V: step P7`. **Expect** `This look isn’t here any more` (or another not-found message)
and **not** `Length check before the big chop decision.` Seeing the caption is a **FAIL**.

**P8: A stylist's page.** `V: open /braidsbyama --site`, `V: step P8`. Expect
`Braids by Ama`, her area, a verification line, `Request a booking`,
`Booking happens in the Yasante app.`, a `Menu` with prices
(`Prices are theirs, and what you’d be quoted.`), her work, reviews, and `Their terms`
(`… hours’ notice to cancel`, the deposit, `Paid straight to them — Yasante never handles it`).
**Record** the menu items with prices and the terms. **Quote** `Request a booking`'s
`/url:` from `aria.txt` (expect `yasante://stylist/braidsbyama`). The page must show **no
street address** (her address is `12 …`; only the area is public): search `visible.txt`
for a house number and say what you found.

**P9: Nobody by that name.** `V: open /nobodyhere123 --site`, `V: step P9`. Expect
`No page here` and `Nobody on Yasante goes by @nobodyhere123. …`.

**P10: Words that aren't handles.** `V: open /manage --site`, `V: step P10`. **Record**
the page. (`manage` was just reserved so no stylist can take it.) It must **not** look up
a stylist called `manage`: quote any `GET /api/stylists/by-handle/manage/` from the step's
requests.

**P11: Style and area pages.** `V: open /styles/knotless --site`, `V: step P11`;
`V: open /areas/peckham --site`, `V: step P11b` (expect `Braiders in Peckham` with Braids
by Ama among them); `V: open /areas/atlantis --site`, `V: step P11c`. **Record** each
title and the first few names; P11c should be a not-found page.

**P12: Policies.** For each of `/terms` (P12a), `/privacy` (P12b), `/stylist-terms`
(P12c), `/guidelines` (P12d): `V: open <path> --site`, wait 10 s, `V: step P12x`.
**Record** what each shows. A fresh seed has no published policies: a clear `not
published yet`-style message is a PASS; a loading placeholder that never ends is a
**FAIL** (the app had the same, F12).

**P13: Deleting an account without the app.** `V: open /delete-account --site`,
`V: step P13`. **Record** the instructions word for word.

**P14: Not found.** `V: open /this/does/not/exist --site`, `V: step P14`. Expect
`There’s nothing at this address`.

**P15: Phone width.** `V: viewport phone`, `V: open / --site`, `V: step P15`,
`V: open /braidsbyama --site`, `V: step P15b`. **Record** anything cut off, overlapping or
needing sideways scrolling. `V: viewport desktop`.

---

## A: Tola signs up and sets up her page on the web (visitor window)

**A1: Empty form.** `V: open /auth/signup --site`, `V: step A1`. Expect
`Set up your stylist account`, `Your page, menu and bookings in one place. Free for
founding stylists.`, fields `Your name or business name`, `Email`, `Password`,
`Confirm password`, an 18-or-over tick, links to terms, stylist terms and privacy, and
`Create stylist account`. `V: click "Create stylist account"`, `V: step A1b`. Expect
`Add the name clients know you by`, `Enter your email`, `Confirm your password` and
`Confirm you’re 18 or over to continue` (**record** exactly which show). No
`POST /api/auth/…` may be sent: quote the step's requests.

**A2: Passwords that differ.** `V: fill "Your name or business name" "QA Web Braids Tola"`,
`V: fill Email qa.tola@yasante.dev`, `V: fill Password Braids-Tola-2026 --exact`,
`V: fill "Confirm password" Braids-Tola-2026x`, `V: click "Create stylist account"`,
`V: step A2`. Expect `Passwords don’t match`. **Record** the password-strength hint shown.

**A3: Create it.** `V: fill "Confirm password" Braids-Tola-2026`, tick the 18-or-over box
(`V: find "18"`, then `V: check "<its label>"`), `V: click "Create stylist account"`,
`V: step A3`. Expect `Check your email` and the url `/auth/verify-email`. Server check
(the sign-up request and its status). `qa/bin/dbcheck qa.tola@yasante.dev`: paste it
(expect `verified=False`, roles including `stylist`).

**A4: A wrong code.** `qa/bin/mailbox <RUN> --to qa.tola@yasante.dev --last`: paste it and
note the six-digit code. `V: fill "The code from the email" 000000`,
`V: click "Confirm email"`, `V: step A4`. **Record** the message (expect a refusal).

**A5: The right code.** `V: fill "The code from the email" <code>`,
`V: click "Confirm email"`, `V: step A5`. Expect `/stylist-setup`, `Set up your page`,
`Step 1 of 5`, `Your name and page`. `qa/bin/dbcheck qa.tola@yasante.dev`:
`verified=True`.

**A6: Step 1, the page address.** `V: step A6` and **record** the `Your page address`
value and any suggestion chips. (In the app the suggestion once froze at one letter, F8.)
`V: fill "Name clients know you by" "QA Web Braids Tola"` (if it isn't already),
`V: fill "A line about your work" "Knotless and cornrows, gentle on edges."`,
`V: fill "Your page address" qatolabraids`, `V: click Continue --exact`, `V: step A6b`.
Expect `Where you work`.

**A7: The draft survives a reload.** `V: reload`, `V: step A7`. **Expect** still on
`Where you work` (the set-up is saved in the browser). Back on step 1 or empty fields:
**FAIL**.

**A8: Step 2, where.** `V: fill "Your area" Peckham`, choose `From home`
(`V: click "From home"`), `V: step A8` (expect the hint `Clients come to you. Only your
area is shown until you confirm a booking`), `V: click Continue --exact`.

**A9: Step 3, your rules.** `V: step A9`. **Record** the defaults (notice, deposit).
Choose deposit `None` (`V: click None --exact`), `V: click Continue --exact`.

**A10: Step 4, proof.** `V: step A10`. Expect `Proof of your work` and
`Add a photo of your work`. `V: find "photo"` to see the file control's label, then
`V: upload "<that label>" qa-photo-1.jpg`, `V: step A10b` (expect `Photo added`).
Leave Instagram empty. `V: click Continue --exact`.

**A11: Step 5, go live.** `V: step A11`. Expect `Ready to go live`, a summary with
`QA Web Braids Tola` and her page address. `V: click "Put my page live"`, `V: step A11b`.
Expect `Your page is live` and `It’s at yasante.com/qatolabraids.` with
`Go to your studio` and `See your page`. Server check.

**A12: Her public page.** `W` stays signed in as Esi; use the visitor window:
`V: open /qatolabraids --site`, `V: step A12`. Expect her name, `Peckham`, her line about
her work. **Record** what the menu and terms sections say with nothing added yet.

---

## B: Tola's studio on the web (visitor window)

**B1: Today.** `V: open /today --site`, `V: step B1`. Expect `Today`,
`Nothing booked today`, and `Get ready for clients · N of 5 done` with the steps left
(`Add your services and prices`, `Set your working hours`, `Post your work`, …).
**Record** the list and N.

**B2: A service.** `V: open /menu --site`, `V: step B2` (expect `No services yet`).
`V: click "Add your first service"`, `V: step B2b`. **Record** the fields and any presets.
`V: fill "What you call it" "QA Knotless"`, `V: fill "Price (£)" 90`, pick a length in
`How long it takes` (`V: select "How long it takes" "<an option shown>"`; record it),
`V: click "Add to my menu"`, `V: step B2c`. Expect `/menu` listing `QA Knotless` with
`£90`. Server check.

**B3: Edit it.** `V: click "QA Knotless"`, `V: fill "Price (£)" 95`, `V: click Save --exact`,
`V: step B3`. Expect `£95`.

**B4: Remove one, asked first.** Add a second service `QA Cornrows`, `£40`, the same way,
`V: step B4`. Open it, `V: click "Remove from my menu"` (no flag: the pop-up gets
**Cancel**), `V: step B4b`: expect it **still** there and the pop-up text
`Remove QA Cornrows from your menu?` under console. Then
`V: click "Remove from my menu" --accept-dialog`, `V: step B4c`: expect `/menu` with only
`QA Knotless`. Server check.

**B5: Working hours.** `V: open /availability --site`, `V: step B5`. **Record** how days
and times are set. Make **Tuesday to Saturday** working days, **09:00–17:00**, with the
controls shown (`V: find Tuesday` etc.; say exactly what you clicked), then
`V: click "Save hours"`, `V: step B5b`. Expect `Saved.` and a summary of the week.
Server check.

**B6: Getting paid.** `V: open /payment-methods --site`, `V: step B6`.
`V: click Monzo --exact`, fill its `Details` with `monzo.me/qatola`,
`V: click Save --exact`, `V: step B6b`. Expect `Saved.`

**B7: Post work.** `V: open /looks/new --site`, `V: step B7`. Expect `Post your work` and
`Choose photos of your work`. `V: find "photos"` for the file control's label, then
`V: upload "<that label>" qa-photo-2.jpg`, `V: step B7b`. Pick a style
(`V: select Style "<the first style>"`), service `QA Knotless`, caption
`QA web post: knotless, mid-back.`, `V: click "Post 1 photo"`, `V: step B7c`. Expect
`/portfolio`, `Posted 1 photo. They’re in the feed now.`, `In the feed · 1`.
Server check.

**B8: The same photo again (a duplicate).** `V: open /looks/new --site`, upload
**`qa-photo-1.jpg`** (the proof photo from A10), pick a style, caption
`QA web post: same photo as my proof.`, post it, `V: step B8`. **Record** what the
studio says. Then in the workspace: `W: open /review/photos`, `W: step B8b`. **Record**
whether a `Photo by QA Web Braids Tola` with `Possible duplicate` is waiting. If it is,
`W: click Approve --exact --role=button`, `W: step B8c`, and record the message.

**B9: Account and the private address.** `V: open /account --site`, `V: step B9`. Expect
`Edit your page`, `Working hours` (with the week from B5), `Getting paid`, and
`Your address`. `V: fill "Your address" "12 QA Road, Peckham, SE15 4QA"`,
`V: click "Save address"`, `V: step B9b` (expect `Saved.`). Then
`V: open /qatolabraids --site`, `V: step B9c`. **Expect** `Peckham` but **not**
`12 QA Road` anywhere (search `visible.txt`). The street on the public page is a **FAIL**.

**B10: Today again.** `V: open /today --site`, `V: step B10`. **Record** `N of 5 done` and
what's left. Expect the checklist shorter than B1 (or gone).

**B11: The workspace sees her.** `W: open "/records/stylists/stylistprofile?q=qatolabraids"`,
`W: step B11`. **Record** the row. Open it, `W: step B11b`: her `Address` should be hidden
(`••••••••` with `Show`).

---

## C: A client tries the web studio (Efua, helper window)

**C1.** `H: open /auth/login --site`, `H: step C1`. Expect `Sign in` and
`To your studio: your page, menu, work and requests.` `H: fill Email client@yasante.dev`,
`H: fill Password password123`, `H: click "Sign in" --role=button`, `H: step C1b`.
**Record** where she lands and what it offers. She is a client, not a stylist: she must
see **nothing of Tola's or anyone else's studio**. `H: open /requests --site`,
`H: step C1c`, and record it.

---

## X: A request from the app, answered on the web (Efua's app + Tola's studio)

**X1: Setup.**
```
qa/bin/emus up --wipe 1
qa/bin/metro <RUN>
qa/bin/qadb start <RUN> client=emulator-5554
```
Paste the output; expect `dev_client: true`. Then BOOK-01 S2 for `client` (launch, the
dev-menu intro, the notification prompt), and BOOK-01 S3 with Efua (`client@yasante.dev`)
only: one login `200`, or stop (routing gate).

**X2: Efua asks Tola.** `C: link "yasante:///book/qatolabraids"`, wait 4 s, `C: step X2`.
Expect `QA Knotless` `£95` and times on Tuesday–Saturday only. Pick it, pick the first
time (**record** it as T1), tick the terms, `C: tapon booking-send`, wait 4 s,
`C: step X2b`. Server: `POST /api/bookings/ 201`. `qa/bin/bookings client@yasante.dev`:
the newest ID is **B1**.

**X3: Tola sees it on the web.** `V: open /requests --site`, `V: step X3`. Expect
`Waiting for your answer` with `Efua Mensah · QA Knotless` and `Answer by …`.
`V: click "Efua Mensah · QA Knotless"`, `V: step X3b`. Expect `Who’s asking`
(`First booking on Yasante` or her record), the service, the asked-for time (same clock
time as T1), and `Accept` / `Decline`. **Record** the time line.

**X4: Accept on the web.** `V: click Accept --exact`, `V: step X4`. Expect `/requests`
with B1 under `Booked`. Server: `…/accept/ 200`. On the app:
`C: link "yasante:///bookings/<B1>"`, wait 3 s, `C: step X4b`. Expect it confirmed (no
deposit), at T1.

**X5: Decline one.** Efua asks again (X2's steps with the **second** time; call it **B2**),
`C: step X5`. On the web: `V: open /requests --site`, open the new request,
`V: click Decline --exact --accept-dialog`, `V: step X5b`. Expect the pop-up text
`Decline Efua’s request?` under console, and B2 gone from `Waiting for your answer`.
Server: `…/decline/ 200`. `C: link "yasante:///bookings/<B2>"`, wait 3 s, `C: step X5c`:
**record** what Efua is told.

---

## Z: End

`qa/bin/qaweb end`, `qa/bin/qadb end`, `qa/bin/env-down`, `qa/bin/emus down`. Paste the
`qadb end` output at the bottom of the report. Report each step; no overall verdict.
