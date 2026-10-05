# SEC-01: hostile text where visitors, stylists and staff read it

**Device: browser.** `qa/bin/qaweb` drives the public site (`http://localhost:5173`), a
stylist's web studio, and the staff workspace (`http://admin.localhost:5173`).
**Covers:** text that people write (names, bios, captions, comments, reviews, menu items,
booking notes, reports, appeals, product submissions, app error reports, waitlist entries)
shown back to other people. It must appear exactly as written and never act as markup.
**Time:** about 45 minutes.
**Status:** Claude's dry runs `SETUP-sec01-dry` and `SETUP-sec01-dry2` (05-10-2026) went
through every step here: each code was on its page as text, and the only hits were `C00`.

Read `qa/AGENTS.md` first (section 8 covers the browser). Its rules override anything
here. **Only the tools in `qa/AGENTS.md` §3, plus `qa/bin/canary` where a step says so**:
no `manage.py`, `curl`, `git`, your own browser or scripts. If a step seems to need one,
write `NEEDS: …` in its section and move on.

---

## How this plan decides PASS or FAIL

`qa/bin/canary plant` (step S3) writes **canaries** into the local test data: text with a
code (`XC01`, `XC02`, …) followed by pieces of HTML and script. Each piece, if a page ever
ran it, would make the browser fetch `canary.invalid/<code>…`. `qaweb`'s browser blocks
that request and writes it in the run's journal, and `qa/bin/canary hits` lists those
lines and every browser pop-up. **You don't judge whether anything "ran"; the journal says so.**

A step **PASSES** when both hold:
1. every code the step names is on the page **as text**: quote one line from the step's
   `visible.txt` (or `aria.txt` where the step says) that shows `XCnn <img src=//canary.invalid/…`
   written out; and
2. at the next checkpoint, `canary hits` shows nothing new except `C00` lines (below).

A code missing from the page is **FAIL** (quote what is there instead). The text
`{{7*7}}${7*7}` must also show as written: `49` anywhere is a **FAIL**.

**The control, C00.** Ama's profile photo is set to an address on `canary.invalid`. The
site loads it on purpose, so opening her page **must** add a `HIT … C00m` line. If C00
never appears, nothing in this run can be trusted: stop and say so.

**Checkpoints** (`K1`–`K3`): run `qa/bin/canary hits <RUN>` and paste its full output.

## Notation and test data

| Prefix | Command | Who |
| :--- | :--- | :--- |
| `V:` | `qa/bin/qaweb -w visitor` | a signed-out visitor |
| `W:` | `qa/bin/qaweb` (window `lead`) | **Esi**, staff lead (`staff.lead@yasante.dev`, `password123`) |
| `H:` | `qa/bin/qaweb -w helper` | **Ama**, stylist, in her web studio (`ama@yasante.dev`, `password123`) |

Public pages are opened with `--site`. Fixed IDs: Efua (`client@yasante.dev`) is
`4b7693c6-b615-5e49-b80f-dcd1d7e8d08d`; her public look is
`0c9028cd-f011-52a7-922e-a7a1b917c981`. **The other IDs are new on every run:** copy them
from the output of `canary plant` in S3 (`booking`, `product`, `review`, `ama-profile`,
`comment`) and write them in S3's section. Later steps say `<booking>` and so on.

---

## S: Setup

**S1.** `qa/bin/env-up --reseed <RUN>`, then `qa/bin/web-up <RUN>`, then
`qa/bin/qaweb start <RUN>`. Paste the last line of each.

**S2: Routing gate.** `W: open /`, `W: step S2`. Expect `Your staff workspace` and the url
`http://admin.localhost:5173/`. **Server check:**
`grep -E 'GET /data/session/' qa/runs/<RUN>/server.log | tail -1` shows `200`. No line:
stop the run.

**S3: Plant.** `qa/bin/canary plant`. Paste its whole output. Expect 21 lines `C00`…`C19`
(with `C13h`), then the IDs, then `list: qa/runs/<RUN>/canaries.json`. `W: step S3`.

---

## V: The public site, signed out

**V1: A stylist's page.** `V: open /braidsbyama --site`, `V: step V1`. Codes: **C01**
(her name), **C02** (bio), **C04** (a menu item), **C08** and **C09** (a review and its
author). `V: scroll bottom`, `V: step V1b` if any of them were below the first capture.

**V3: A look.** `V: open /looks/0c9028cd-f011-52a7-922e-a7a1b917c981 --site`,
`V: step V3`. Codes: **C06** (caption), **C07** (Efua's name). (The site shows how many
comments a look has, not the comments; Instagram handles aren't on the site either. Both
are checked in the workspace, W11 and W12b.)

**V4: The looks list.** `V: open /looks --site`, `V: step V4`. Code **C01**. (Captions are
only in the photos' descriptions here, which `visible.txt` doesn't list.)

**V5: Phone width.** `V: viewport phone`, `V: open /braidsbyama --site`, `V: step V5`.
Code **C01**. `V: viewport desktop`.

**K1: Checkpoint.** `qa/bin/canary hits <RUN>`. Expect only `HIT … C00m` lines (at least
one). Anything else is a **FAIL** for the step that came just before it in time (the
journal's times say which).

---

## W: The staff workspace (Esi)

**W1: Sign in and set up two-factor.** `web-up` reset Esi's account, so this is a first
sign-in. `W: fill Email staff.lead@yasante.dev`, `W: fill Password password123`,
`W: click "Sign in"`. Then `qa/bin/totp staff.lead@yasante.dev` and at once
`W: fill "First six-digit code" <code>`, `W: click "Verify code"`,
`W: click "I saved my codes"`, `W: step W1`. Expect the Today page, `Good …, Esi.`
(no need to copy the recovery codes in this plan).

**W2: Today.** The capture from W1. Codes in `Needs you`: **C07** and **C13**.

**W3: Reports.** `W: open /review/reports`, `W: step W3`. Codes: **C11** (the report's
note), **C06**. Don't decide the report (F17 still breaks decisions).

**W4: Appeals.** `W: open /review/appeals`, `W: step W4`. Code: **C12**.

**W5: Products.** `W: open /review/products`, `W: step W5`. Codes: **C13**, **C14**.

**W6: The product's record.** `W: open /records/shelf/product/<product>`, `W: step W6`.
Codes **C13**, **C14**, **C07** (`Added by`). The `Link` field shows
`javascript:fetch('//canary.invalid/C13h')`: quote its `/url:` line from `aria.txt`.

**W7: Click that link.** `W: click "javascript:fetch"`, `W: step W7`. **Record** what
happened (url, anything on screen). A browser can be made to run a `javascript:` link;
the checkpoint shows whether this one did (`C13h`).

**W8: Errors.** `W: open /errors`, `W: step W8`. Code **C17**. Then
`W: click "XC17"`, `W: step W8b`: the error's detail. Codes **C17** and **C18** (the stack).

**W9: Waitlist.** `W: open /records/web/waitlistentry`, `W: step W9`. **Record** exactly
what the `Area` and `Source` columns show for `qa.canary@yasante.dev` (codes **C19**,
**C20**; Claude's dry run saw only the codes, the rest removed).

**W10: People.** `W: open /records/accounts/user/4b7693c6-b615-5e49-b80f-dcd1d7e8d08d`,
`W: step W10`. Code **C07** (name).

**W11: Stylists.** `W: open /records/stylists/stylistprofile/<ama-profile>`, `W: step W11`.
Codes **C01**, **C02**, **C03**.

**W12: Reviews and comments.** `W: open /records/bookings/review/<review>`, `W: step W12`
(codes **C08**, **C09**). `W: open /records/looks/lookcomment/<comment>`, `W: step W12b`
(code **C10**).

**W13: The booking.** `W: open /records/bookings/booking/<booking>`, `W: step W13`.
Codes **C15** (notes), **C16** (client name).

**K2: Checkpoint.** `qa/bin/canary hits <RUN>`. Expect nothing new since K1.

---

## H: Ama's web studio

**H1: Sign in.** `H: open /auth/login --site`, `H: fill Email ama@yasante.dev`,
`H: fill Password password123`, `H: click "Sign in" --role=button`, `H: step H1`.
Expect `Today`.

**H2: Requests.** `H: open /requests --site`, `H: step H2`. Code **C16** (who's asking).

**H3: The request.** `H: open /requests/<booking> --site`, `H: step H3`. Codes **C16**
and **C15** (her notes). Don't answer it.

**H4: Menu.** `H: open /menu --site`, `H: step H4`. Code **C04**.

**K3: Checkpoint.** `qa/bin/canary hits <RUN>`. Expect nothing new since K2.

---

## End

`qa/bin/qaweb end`, then `qa/bin/env-down`. Paste both outputs at the bottom of the report.
