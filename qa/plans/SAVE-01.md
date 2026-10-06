# SAVE-01: Does a saved look look saved? (F31 on the phone)

**Device: phone**, the owner's **Samsung Galaxy S23 Ultra**.
**Covers:** F31 (`qa/findings.md`). The bookmark on a look's photo looks the same whether
you've saved the look or not. The small bookmark under the photo is meant to fill in, but
not until the feed reloads. The code says so; nobody has seen a saved look on screen yet.
**Time:** about 15 minutes, **with the owner the whole time**. The question is what a
person sees at a glance, so the owner's eye is the evidence, with the screenshots.
**Status:** written 06-10-2026 from the code and the seed; not yet run.

Read `qa/AGENTS.md` first, and section 1 twice: **this is the owner's own phone.**

**A FAIL here is the expected result.** Each "Expect" line says what a person should see
if saving worked properly. F31 predicts several of them will fail. Report exactly what's
on screen and what the owner says; don't soften it either way.

---

## Test data

`RUN` = `SAVE-01-<YYYYMMDD>-<HHMM>`.

| What | Value | Notes |
| :--- | :--- | :--- |
| The phone's account | Naomi Grant, `naomi.grant@yasante.dev`, `password123` | seeded client |
| Naomi's collection | `Saved`, ID `e0a1fbe2-6099-52e4-aaac-9527fbaac975` | seeded with 11 looks |
| **Look she has saved** | Funmi Mwangi's `Silk press on 4c, no heat damage.`, ID `16a11507-16d3-50eb-a72e-3109af839968` | in `Saved` from the seed |
| **Look she hasn't saved** | Ruth Owusu's `Waist length, done in one sitting.`, ID `b65bc8f7-3d16-5a87-87bd-71b9944dd6ff` | first in the feed; `Saved by 5 people` in PHONE-01 |

Copy the IDs exactly. Captions repeat across looks, so always open a look by its ID.

**Server check** where a step says so:
`grep -E '"(POST|DELETE) /api/collections/' qa/runs/<RUN>/server.log | tail -5`.
Also, at every step: `grep -cE '" 5[0-9]{2} ' qa/runs/<RUN>/server.log`. A new `500`
is a **FAIL**.

**Two bookmarks on every look card.** Name them this way in the report:
- **the photo bookmark**: the round button on the photo's bottom-right corner, labelled
  `Save to a collection`;
- **the row bookmark**: in the row under the photo, next to the heart and the comment
  bubble, with a number beside it (labelled `Saved by N people…`).

---

## O: The owner gets the phone ready

**O1.** Ask the owner to confirm they're with the phone, then to unlock it, plug it in,
accept USB debugging if asked, and turn on **Do Not Disturb**. Record their answer.

## P: Preflight and routing gate

**P1.** As PHONE-01 P1: `qa/bin/emus status` (all `down`), then
`qa/bin/env-up --reseed <RUN>`, `qa/bin/metro <RUN>`, `qa/bin/qadb start <RUN>`. Paste
all output. Expect `backend: HTTP 200`, `metro: running on :8082`, `"dev_client": true`,
`SM-S918B`. **The reseed matters:** it puts Ruth's look back at 5 saves and Funmi's back
in `Saved`.

**P2.** As PHONE-01 P2 (`clear`, `launch`, wait for `bundled`, dismiss the dev-menu intro
and the notification prompt), `qadb step P2`: the welcome screen.

**P3: ROUTING GATE.** `qadb tapon "I already have an account"`, `qadb tapon email-input`,
`qadb type "naomi.grant@yasante.dev"`, `qadb tapon password-input`,
`qadb type "password123"`, `qadb tapon login-button`, wait 5 s, `qadb step P3`.
**Server check:** `grep '"POST /api/auth/login/' qa/runs/<RUN>/server.log | tail -1`
shows `200` from the last minute. **No line: stop the whole run.** Expect `Hey Naomi`.
A Samsung password prompt: the owner answers it (**Never**, if offered); record it.

---

## A: A saved look next to an unsaved one (nothing is written)

**A1: The look she has saved.**
`qadb link "yasante:///looks/16a11507-16d3-50eb-a72e-3109af839968"`, wait 4 s,
`qadb step A1`. Expect Funmi's look (`Silk press on 4c, no heat damage.`).
**Ask the owner, with the phone in hand:** "This look is already in your collection. Look
at it for a second without reading anything: does it look saved? Which of the two
bookmarks tells you, if either?" Quote their answer.
**Expect:** both bookmarks show it's saved. **Record** from the screen how each one is
drawn (outline or filled, grey or pink, `+` or no `+`), and paste the `content-desc` of
both from `ui.xml`:
`grep -oE 'content-desc="(Save to a collection|Saved by[^"]*)"' qa/runs/<RUN>/steps/*-A1/ui.xml`.

**A2: The look she hasn't saved.**
`qadb link "yasante:///looks/b65bc8f7-3d16-5a87-87bd-71b9944dd6ff"`, wait 4 s,
`qadb step A2`. Expect Ruth's look (`Waist length, done in one sitting.`), `5` beside
the row bookmark. Same question to the owner, plus: "Compared with the last one, could you
tell which of the two you've saved?" Quote them. **Record** both bookmarks and their
`content-desc` as in A1.
**Expect:** A1 and A2 look different. If the photo bookmark is drawn the same in both,
that part of F31 is **confirmed**.

**A3: The Home grid.** `qadb link "yasante:///"`, wait 4 s, `qadb step A3`. The grid of
small tiles has only a photo bookmark (no row). `qadb find "Funmi"`: if her tile is on
screen, ask the owner whether it looks saved next to the tiles around it, and quote them.
If it isn't, `qadb swipe up` and `find` again, **at most three times**, capturing `A3b`,
`A3c`… each time. Not found after three: write `Funmi's tile not reached` and go on; it's
not a FAIL.

---

## B: Save one, then come back (one write)

**B1: The feed before.** `qadb link "yasante:///looks"`, wait 4 s, `qadb step B1`.
Expect Ruth's card first, `Saved by 5 people` in the summary.

**B2: Open the save sheet.** Save from the photo bookmark on **Ruth's** card:
`qadb find "Save to a collection"` lists both kinds (the row bookmark's label contains the
same words); `--exact` keeps only the photo bookmarks. Tap the first one (Ruth's card is
on top): `qadb tapon "Save to a collection" --exact --nth=1`, wait 2 s,
`qadb step B2`. Expect `Save to a collection` with a `Saved` row (`save-to-e0a1fbe2-…`).
If it opened for any look but Ruth's (check the caption at the top), `qadb key BACK`, mark
B2 BLOCKED and stop part B.

**B3: Save it.** `qadb tapon save-to-e0a1fbe2-6099-52e4-aaac-9527fbaac975`. The sheet shows a
tick and closes itself. Wait 3 s, `qadb step B3`. **Server check:** one
`POST /api/collections/e0a1fbe2…/items/` with `201`. Expect the feed again, with Ruth's
card on top.
**Ask the owner:** "You just saved this one. Does it look saved now?" Quote them.
**Expect:** the row bookmark is filled and reads `6`, and the photo bookmark shows it's
saved. **Record** both as in A1, with the summary's `Saved by …` text.

**B4: After a refresh.** Pull the feed down: `qadb swipe down`, wait 4 s,
`qadb step B4`. **Record** the row bookmark, its number, the photo bookmark and the
`Saved by …` text. Ask the owner the same question and quote them.
*(F31 predicts: in B3 the card still shows `5` and an outline; after the refresh in B4 the
row bookmark fills and reads `6`; the photo bookmark never changes.)*

**B5: Ruth's look on its own page.**
`qadb link "yasante:///looks/b65bc8f7-3d16-5a87-87bd-71b9944dd6ff"`, wait 4 s,
`qadb step B5`. **Record** both bookmarks and their `content-desc` as in A1. Expect `6`
and both showing saved.

**B6: Saving it a second time.** On Ruth's page, `qadb tapon "Save to a collection" --exact`,
wait 2 s, `qadb step B6`. **Record:** does the sheet say or show that it's already in
`Saved` (a tick, a label, a greyed row)? Then `qadb tapon save-to-e0a1fbe2-6099-52e4-aaac-9527fbaac975`,
wait 3 s, `qadb step B6b`. **Record** any message word for word, the server check's new
line and its status, and the number beside the row bookmark after `qadb swipe down`
(capture `B6c`). There's no right answer written here: a second copy, a refusal or a
quiet no-op are all things to report.

---

## Z: End

1. Sign Naomi out (as PHONE-01 S2: `yasante:///settings`, `swipe up`, `Sign out`,
   `dialog-confirm`), `qadb step Z1`.
2. `qa/bin/qadb clear`, then `qa/bin/qadb end`; paste its output at the bottom of the
   report.
3. `qa/bin/env-down`.
4. Tell the owner they can turn Do Not Disturb off and unplug.

---

## For Claude's audit (the executor can ignore this)

- The icon state is judged from `screen.png`: crop both bookmarks in A1, A2, B3, B4, B5
  and compare. Don't take the executor's description on trust; Gemini has misread small
  icons before.
- Code expectation (F31): photo bookmark always `BookmarkPlus` outline
  (`LookCard.tsx:363`, `LookTile.tsx:131`); row bookmark filled accent when `look.saved`
  (`LookCard.tsx:218`); `useRefreshCollections()` invalidates only `['looks','one']`, so
  B3 should still show the old feed card and B5 the new state.
- `content-desc` should be identical in A1 and A2 apart from the count (the accessibility
  part of F31).
- Writes: exactly B3's `POST …/items/` and whatever B6b did; sign-ins at P3 only.
- If confirmed, F31 loses *(candidate)* and goes upstream as an issue with the A1/A2 crops
  side by side. B6's outcome may be a finding of its own.
