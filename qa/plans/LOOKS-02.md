# LOOKS-02: Several photos in one look, and the switch that opens it

**Device: emulators + browser.** Two emulators run the app (`client` emulator-5554 for
Efua, `stylist` emulator-5556 for Ama); `qa/bin/qaweb` runs the staff workspace (Esi) and
the public site (Ama's studio, a visitor). One agent drives all of it **in turn**.
**Covers:** upstream tasks 003–008 and commits `1d5a818`, `01397fe`: a look holds up to 5
photos in order; the app and the website let someone post several only where the
`multi_photo_looks` switch is on for them; staff turn the switch in the workspace; the
photos swipe in order in the app and on the web; a marker on every grid says a look has
more than one.
**Time:** about 60 minutes.
**Status:** written 19-10-2026. Parts S, K and A were dry-run by Claude
(`SETUP-dry-1018`); parts W and G are written from the code and the task files, so expect
plan errors there and say exactly what you saw.

Read `qa/AGENTS.md` first (again: §8 now says **`qaweb --nth` counts from 1**; `qadb
--nth` still counts from 0). Its rules override anything here. **Only the tools in
`qa/AGENTS.md` §3**. If a step seems to need another, write `NEEDS: …` and move on.

---

## Notation and test data

| Short | Command | Who |
| :--- | :--- | :--- |
| `C:` | `qa/bin/qadb -d client` | Efua Mensah, `client@yasante.dev` (not on the switch) |
| `S:` | `qa/bin/qadb -d stylist` | Ama Owusu, `ama@yasante.dev`, page **Braids by Ama** (`braidsbyama`) |
| `W:` | `qa/bin/qaweb` (window `lead`) | Esi Boateng, `staff.lead@yasante.dev` (staff pages) |
| `A:` | `qa/bin/qaweb -w helper` with `--site` pages | Ama on the website |
| `V:` | `qa/bin/qaweb -w visitor` | signed out |

Passwords are `password123`. The emulators' galleries hold `qa-photo-1.jpg` …
`qa-photo-7.jpg`; **each photo shows its number**, top left. In Android's photo picker they
show **7, 6, 5, 4, 3** then **2, 1** (newest first), so with
`qadb find "Photo taken on"` the photo numbered *n* is `--nth=` *7 − n* (photo 3 is
`--nth=4`, photo 6 is `--nth=1`). Check each tap against the next capture's numbers.

**The switch.** `multi_photo_looks` starts in mode `Staff only` (from the seed). The app
reads switches at most once a minute and again when it comes back to the front; where a
step says **refresh the app**, do: wait 65 s, `X: stop`, `X: launch`, wait 12 s, dismiss
whatever comes up as in BOOK-01 S2 (`tapon "Don’t allow" --exact` for the app's own
notification question), then carry on.

**Server check, every step that saves something:** after it, run
`grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3` and paste it. Any new
`5xx` is a **FAIL**. A `4xx` is OK only where the step expects a refusal.

---

## S: Setup

**S1.**
```
qa/bin/env-down
qa/bin/emus up --wipe 2
qa/bin/env-up --reseed <RUN>
qa/bin/web-up <RUN>
qa/bin/metro <RUN>
qa/bin/qaweb start <RUN>
qa/bin/qadb start <RUN> client=emulator-5554 stylist=emulator-5556
```
`RUN` = `LOOKS-02-<YYYYMMDD>-<HHMM>`. Paste the last lines. Expect `dev_client: true` twice.

**S2.** BOOK-01 S2 on `client`, then `stylist`. **S3 (routing gate).** BOOK-01 S3 with
Efua on `client` and Ama on `stylist`: `grep -cE '"POST /api/auth/login/ HTTP/1.1" 200'`
gives **2**, or stop. If the password doesn't land (`no text field has the keyboard`),
`tapon password-input` again and type it again; say so.

**S4: Esi.** Sign Esi in as FEATURED-01 S2 (`W:`), copy the recovery codes, `I saved my
codes`. `W: open /records/features/switch`, wait 2 s, `W: step S4`. Expect `Feature
switches`, `multi_photo_looks` · `Staff only`, `video_posts` · `Off`.

---

## K: The switch is staff-only: Ama can post one photo

**K1.** `S: link "yasante:///looks/new"`, wait 4 s, `S: step K1`. Expect `Post a look` and
`Choose a photo` (singular, `look-pick`). **Record** the button's words.

**K2.** `C: link "yasante:///looks/new"`, wait 4 s, `C: step K2`. Same expectation for Efua.
`C: tapon Close --exact`.

**K3: Esi lists Ama.** `W: click "multi_photo_looks" --role=link`, wait 2 s,
`W: click "Edit" --exact`, wait 2 s, `W: step K3` (expect `Editing. Changes save when you
press Save.`). `W: click "Choose records"`, `W: fill "Find users" "ama@yasante.dev"`, wait
2 s, `W: click "Ama Owusu (ama@yasante.dev)"`, `W: select "Mode" "Listed accounts"`,
`W: click "Save"`, wait 3 s, `W: step K3b`. Expect `Mode` `Listed accounts`, `Users` `Ama
Owusu (ama@yasante.dev)`, `Updated by` `Esi Boateng (staff.lead@yasante.dev)`.
**Server check:** no `5xx` (before 18-10 every record save in the workspace failed).

---

## A: Ama posts four photos in the app

**A1.** Refresh the app on `stylist` (see Notation). `S: link "yasante:///looks/new"`,
wait 4 s, `S: step A1`. **Expect** `Choose photos` (plural) now. Still `Choose a photo`
after the refresh is a **FAIL**: paste `grep 'GET /api/features/' qa/runs/<RUN>/server.log
| tail -3`.

**A2: Pick 3, 4, 5, 6 in that order.** `S: tapon look-pick`, wait 4 s. Android's picker
opens (allowed on emulators). `S: tapon "Photo taken on" --nth=4`, then `--nth=3`, then
`--nth=2`, then `--nth=1`, `S: step A2`. Expect `Add (4)`. `S: tapon "Add (4)"`, wait 5 s,
`S: step A2b`. **Expect** `4/5`, `Cover`, `Remove photo 1` … `Remove photo 4`, `Add more
photos`. **Record** from `screen.png` the numbers on the four thumbnails, left to right
(expect 3, 4, 5, 6), and whether anything is cut off (in the dry run the remove buttons'
tops were clipped).

**A3: Two more is one too many.** `S: tapon "Add more photos"`, wait 4 s, pick photo 7
(`--nth=0`) and photo 2 (`--nth=5`), `S: step A3`. **Record** what the picker allows
(does it stop at one more?). Confirm with whatever `Add (…)` shows, wait 4 s,
`S: step A3b`. **Expect** at most `5/5`, and **Record** any message. Then remove photo 7
again: `S: tapon "Remove photo 5"`, wait 2 s, `S: step A3c` (`4/5`).

**A4: Post.** `S: tapon "Twists" --exact`, `S: tapon "Coily" --exact`, `S: swipe up`,
`S: tapon look-post`, wait 6 s, `S: step A4`. **Expect** her new look with `A look, photo 1
of 4` and `Twists · Coily hair`. **Server check:** `grep -E '"POST /api/(uploads|looks)/'
qa/runs/<RUN>/server.log | tail -5`: four uploads `201`, one look `201`.

**A5: Swipe.** `S: swipe left`, `S: step A5` (expect `photo 2 of 4`); `S: swipe left` ×3,
`S: step A5b` (expect `photo 4 of 4`, and it stops there). **Record** from each
`screen.png` which numbered photo shows.

---

## G: What others see

**G1: Efua's feed.** `C: link "yasante:///looks"`, wait 4 s, `C: step G1`. Ama's new look
should be at or near the top. **Record** from `screen.png` the marker on its card (the
task: a card sliding in, with the number of photos) and its `content-desc`
(`grep -oE 'content-desc="A look[^"]*"' qa/runs/<RUN>/steps/*-G1/ui.xml | head -3`).

**G2: Ama's page in the app.** `C: link "yasante:///braidsbyama"`, wait 4 s, `C: swipe up`,
`C: step G2`. **Record** the new look's tile and its marker. Tap it
(`C: tapon "Twists"` or its tile as `find` shows), wait 3 s, `C: step G2b`: **Record** the
viewer's words (in `1d5a818`: `2 of 6 · photo 2 of 3` style), then `C: swipe left`,
`C: step G2c`.

**G3: On the website.** `V: open /braidsbyama --site`, wait 3 s, `V: step G3`. **Record**
the marker on the new look's tile (from `screen.png`). Click the tile, wait 3 s,
`V: step G3b`; **Record** the address (`V: url`) and how the photos are shown (arrows,
dots, a count). Move to the next photo with whatever the page offers (`V: find "Next"`,
or `V: press ArrowRight`), `V: step G3c`.

---

## W: Posting several photos on the website

**W1: Ama signs in on the site.** `A: open /auth/login --site`,
`A: fill "Email" "ama@yasante.dev"`, `A: fill "Password" "password123"`,
`A: click "Sign in" --role=button`, wait 3 s. `A: open /looks/new --site`, wait 3 s,
`A: step W1`. Expect `Post your work` and `Choose photos of your work`.

**W2: Three photos.** `A: upload "Choose photos of your work" qa-photo-5.jpg`, then
`qa-photo-6.jpg`, then `qa-photo-7.jpg`, wait 2 s, `A: step W2`. **Record** everything the
page asks now, especially `How to post these photos` with `One look with these photos` and
`Each photo as its own look`. **Expect** `One look with these photos` to be offered (Ama
is on the switch).

**W3: One look.** `A: click "One look with these photos"`, choose the style as the page
asks (`Pick the style`: `Box braids`), and post with the page's post button
(`A: find "Post"` first). Wait 5 s, `A: step W3`. **Server check:** uploads `201` and one
`POST /api/looks/` `201`. **Record** where it lands and the new look's marker on `Your
work` (`A: open /portfolio --site`, `A: step W3b`; the marker sits top left there).

**W4: Switch off for Ama, everyone else unchanged.** `W: open
/records/features/switch`, open `multi_photo_looks`, `Edit`, `W: select "Mode" "Off"`,
`Save`, wait 3 s, `W: step W4`. Then `A: open /looks/new --site`, upload `qa-photo-3.jpg`
and `qa-photo-4.jpg`, wait 2 s, `A: step W4b`. **Record** what's offered now. **Expect**
`One look with these photos` gone, or a refusal on posting: if the page still offers it,
choose it, post, and **Record** the message and the server's answer (the server refuses
several photos with `400` `Posting several photos in one look isn't open yet` when the
switch is off for you). A `201` for a several-photo look with the switch off is a **FAIL**.

**W5: The app after the switch goes off.** Refresh the app on `stylist`.
`S: link "yasante:///looks/new"`, wait 4 s, `S: step W5`. Expect `Choose a photo` again.
`S: tapon Close --exact`. Her four-photo look from A4 must still show all four photos:
`C: link "yasante:///braidsbyama"`, open it as G2b, `C: step W5b`.

---

## Z: End

1. `qa/bin/qadb -d client clear`, `qa/bin/qadb -d stylist clear`.
2. `qa/bin/qaweb end`, then `qa/bin/qadb end`; paste its output at the bottom.
3. `qa/bin/env-down`.

---

## For Claude's audit (the executor can ignore this)

- Order: compare A2b/A5/G2b crops with the fixture numbers; the server's `LookPhoto`
  `position` for the A4 look must be 3, 4, 5, 6 → 0…3.
- Switch enforcement on the server (task 006 step 5) is mine to check directly with a
  2-photo `POST /api/looks/` as Efua while `staff`/`off`; W4 only shows it if the website
  lets the post through.
- Dry run: no crop step in the app for several photos (single photos are cropped 4:5;
  F29); compare the A4 look's photo sizes with the fixtures' 1080×1350.
- Writes expected: K3 and W4 switch saves; A4 (4 uploads + look); W3 (3 uploads + look);
  W4b only if the page posted.
