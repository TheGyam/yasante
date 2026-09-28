# LOOKS-01: The feed, posting a look, comments, saving, reporting

**Device: emulators only**: `client` (emulator-5554), `client2` (emulator-5558).
One agent drives both **in turn**.
**Covers:** `app/(client)/(home)/home`, `app/(client)/(home)/search`, `app/looks/*`
(feed, a look, posting, mine, area filter, options: take down / report / block),
`app/collections/*`, `app/(client)/(profile)/saved`.
**Time:** about 75 minutes.

Read `qa/AGENTS.md` first (again, since it changed). Its rules override anything here.
`qadb step` opens each step's section in the report; fill it in before the next step.
**Only the tools in `qa/AGENTS.md` §3**: no `manage.py`, `curl`, `adb` or `git`, not even
to read. If a step seems to need one, write `NEEDS: …` in its section and move on.

---

## Notation and test data

`C:` = `qa/bin/qadb -d client`, `K:` = `qa/bin/qadb -d client2`.

| Who | Account (password `password123`) | Device |
| :--- | :--- | :--- |
| Efua | `client@yasante.dev` (Efua Mensah): 3 looks of her own (one private), 5 collections | client |
| Abena | `abena.kamara@yasante.dev` (Abena Kamara) | client2 |

Seeded looks used below. Links need the **ID**, not the name, so copy the IDs exactly;
never work one out yourself.

| Name in this plan | ID for links | What it is |
| :--- | :--- | :--- |
| `look_seed_1` | `6a0e724c-8542-5817-b3a6-85c45a22c283` | Ama Owusu, `Knotless, waist length, done in one sitting.` |
| `look_seed_2` | `d46e7f35-f68a-52a2-abd5-22136862b09c` | Zainab Bello, silk press |
| `look_efua_3` | `fbeeb843-1bd5-51a2-bc38-2d417349ba03` | Efua's **private** look, `Length check before the big chop decision.` |

**Server check, every step that saves something:** after it, run
`grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3` and paste it. Any new
`5xx` is a **FAIL**. A `4xx` is only OK where the step expects a refusal, with one exception: a `401` followed at once by
`POST /api/auth/refresh-token/ 200` and the same request succeeding is the app renewing its
15-minute sign-in, not a failure. Paste it and say so.

**Photos.** On emulators, `qadb` may tap Android's photo picker. The gallery holds two
test photos, shown as `Photo taken on …`: `X: tapon "Photo taken on" --nth=0`.

**Feeds animate.** If a capture says `UI tree unavailable`, describe the screenshot and
use testIDs from an earlier capture. Open looks by link where the plan gives one.

---

## S: Setup

**S1.**
```
qa/bin/env-down
qa/bin/emus up --wipe 3        # three boot; this plan uses client and client2
qa/bin/env-up --reseed <RUN>
qa/bin/metro <RUN>
qa/bin/qadb start <RUN> client=emulator-5554 client2=emulator-5558
```
`RUN` = `LOOKS-01-<YYYYMMDD>-<HHMM>`. Expect `dev_client: true` twice, or stop: BLOCKED.
(The stylist emulator boots but isn't in this run. `qa/bin/emus down` at the end stops it.)

**S2.** BOOK-01 S2 for `client`, then `client2`.
**S3.** BOOK-01 S3 with Efua (client) and Abena (client2). 2 login `200`s, or stop.

---

## F: The feed and search (Efua)

**F1: Home.** `C: link "yasante:///"`, wait 4 s, `C: step F1`. **Record** the sections
and the first three looks' captions. Expect no `Couldn't load looks`.
**F2: The looks feed.** `C: link "yasante:///looks"`, wait 4 s, `C: step F2`. Expect
`Looks` / `Real work, by the people who did it`. `C: swipe up` twice, `C: step F2b`.
**Record** whether more looks load as you scroll.
**F3: Area filter.** `C: link "yasante:///looks/area"`, wait 2 s, `C: step F3`.
`C: tapon "area-Peckham"` (or the first area listed, and say which), wait 3 s,
`C: step F3b`. **Record** whether the feed now shows that area. Set it back to
`Anywhere`.
**F4: Search.** `C: link "yasante:///home"`, wait 3 s, tap Home's search bar, wait 2 s. Tap the
search screen's field (`Search looks, stylists and tips`), type `knotless`, `C: key ENTER`, wait 3 s,
`C: step F4`. **Record** the sections (`Looks`, `Stylists`, `Learn`) and counts shown.
Search `Braids by Ama` → `C: step F4b` (expect the stylist listed). Search `zzqqxx` →
`C: step F4c`: expect `Nothing for "zzqqxx"`.

---

## L: One look (Efua)

**L1.** `C: link "yasante:///looks/6a0e724c-8542-5817-b3a6-85c45a22c283"`, wait 3 s, `C: step L1`. Expect the
caption `Knotless, waist length, done in one sitting.`, Ama Owusu, and a
`Book this look with …` button. Don't tap Book.
**L2: Like.** Tap the like control: `C: tapon "Like, "` (its label reads `Like, N likes`;
use `--nth` if `find` lists several). Wait 2 s, `C: step L2`. **Record** the
count before and after. `C: tapon "Unlike, "` to undo it, `C: step L2b`. Server check.
**L3: Comment.** `C: tapon comment-input`, `C: type "QA comment from Efua"`,
`C: tapon comment-send`, wait 3 s, `C: step L3`. Expect the comment at the top (or
bottom, **record** which) with Efua's name. Server check.
**L4: Reply.** `C: tapon "Reply to"` on **your** comment (use `--nth` from `find`),
type `QA reply`, send, wait 3 s, `C: step L4`. **Record** how the reply shows.

---

## C: Saving and collections (Efua)

**C1: Save to an existing collection.** On `look_seed_1`, `C: tapon "Save to a collection"`,
wait 2 s, `C: step C1`. Expect `Save to a collection` listing Efua's five collections
(`Holiday hair`, `Knotless inspo`, `Wedding guest`, `Next appointment`,
`Maybe locs one day`). Tap `Knotless inspo`, wait 3 s, `C: step C1b`. **Record** the
confirmation. Server check.
**C2: Save into a new one.** Open `look_seed_2` by link (`yasante:///looks/d46e7f35-f68a-52a2-abd5-22136862b09c`), `Save to a collection`, tap
`new-collection-name`, type `QA collection`, `C: tapon start-and-save`, wait 3 s,
`C: step C2`. Server check.
**C3: The collection.** `C: link "yasante:///planner"`, wait 3 s, `C: step C3`. Expect
`QA collection` under `Collections`. Open it, `C: step C3b`: the silk-press look is
in it. Turn on `Keep it private`, wait 2 s, `C: step C3c`. Server check.
**C4: Rename and delete.** Rename it (`Rename this collection`) to `QA collection 2`,
`C: step C4`. Then `Delete collection`, confirm, `C: step C4b`. Expect it gone and the
text `The looks and articles in it stay saved elsewhere — only the set goes.` in the
confirmation (**record** the exact dialog). Server check.
**C5: Saved.** `C: tapon Profile --exact`, then the `Saved` row (`find Saved`), wait 3 s, `C: step C5`. **Record** what it
lists.

---

## P: Posting (Efua)

**P1: Public look.** `C: link "yasante:///looks/new"`, wait 3 s, `C: step P1`. Expect
`Post a look` and `Choose a photo`. `C: tapon look-pick`, wait 3 s, `C: step P1b` (the
picker). `C: tapon "Photo taken on" --nth=0`, wait 3 s, `C: step P1c`: the photo is
shown. Tap `Say something about it`, type `QA public look`, `C: key BACK`. Keep
`Everyone`. **Record** the tag choices shown (who did it, products). `C: step P1d`.
`C: tapon look-post`, wait 5 s, `C: step P1e`. Expect the new look's screen with
`QA public look`. Note its ID (from the link or `find`) as **LK1**. Server check.
**P2: Private look.** Again, with photo `--nth=1`, caption `QA private look`, and
`C: tapon "Just me" --exact`. **Record** the text under the choice. Post, `C: step P2`.
**LK2**. Server check.
**P3: Mine.** `C: link "yasante:///looks/mine"`, wait 3 s, `C: step P3`. Expect both new
looks plus the three seeded ones. **Record** how private ones are marked.

---

## V: What someone else sees (Abena)

**V1.** `K: link "yasante:///looks/<LK1>"`, wait 3 s, `K: step V1`. Expect
`QA public look` by Efua.
**V2.** `K: link "yasante:///looks/<LK2>"`, wait 3 s, `K: step V2`. Expect **not**
shown (e.g. `This look is gone`). If Abena **can** see `QA private look`, that's a
**FAIL**: quote the screen.
**V3.** `K: link "yasante:///looks/fbeeb843-1bd5-51a2-bc38-2d417349ba03"`, `K: step V3`. The same check for the
seeded private look.

---

## R: Report and block (Abena), take down (Efua)

**R1: Report a look.** On LK1 (Abena), `K: tapon "Options for"`, wait 2 s, `K: step R1`.
Expect a `Report this look` screen with the reasons (`It isn't their work`, …) and a
`Block Efua…` row. `K: tapon reason-not-their-work`, type `QA report` into `What happened?`,
`K: tapon look-report-send`, wait 3 s, `K: step R1b`. Expect `Thanks for telling us`.
Server check.
**R2: Block.** On `look_seed_2` (Zainab, `yasante:///looks/d46e7f35-f68a-52a2-abd5-22136862b09c`), `Options for`, then `K: tapon "Block Zainab"`, confirm
(`Block`),
wait 3 s, `K: step R2`. **Record** the result. `K: link "yasante:///looks"`,
`K: step R2b`: **record** whether any Zainab look still shows (there should be none).
Server check.
**R3: Take down your own.** Efua on LK1: `C: tapon "Options for"`, `C: step R3`. Expect
`Your look` with `Take this look down`. Tap it, confirm (`Take it down`), wait 3 s, `C: step R3b`. Expect
`It's removed for everyone.` or the look gone. Server check.
**R4.** `K: link "yasante:///looks/<LK1>"`, `K: step R4`. Expect `This look is gone`.

---

## Z

`qadb end`, `qa/bin/env-down`, `qa/bin/emus down`. Paste the `qadb end` output at the
bottom of the report. Report each step; no overall verdict.
