# PROFILE-01: Hair profile, planner, care plans, shelf, learn, profile edits

**Device: emulator only**: `client` (emulator-5554).
**Covers:** `app/onboarding/quiz`, `app/hair-profile/*`, `app/(client)/(planner)/planner`,
`app/care-plans/*`, `app/shelf/*`, `app/(client)/(home,planner,profile)/learn` and
`content/[id]`, `app/(client)/(profile)/profile`, `app/edit-profile`, `app/username`.
**Time:** about 60 minutes.

Read `qa/AGENTS.md` first (again, since it changed). Its rules override anything here.
`qadb step` opens each step's section in the report; fill it in before the next step.
**Only the tools in `qa/AGENTS.md` §3**: no `manage.py`, `curl`, `adb` or `git`, not even
to read. If a step seems to need one, write `NEEDS: …` in its section and move on.

---

## Test data

One device, so `qadb` needs no `-d`. Account: **Efua**, `client@yasante.dev` / `password123`.
She has a care plan `Wash day` (weekly, reminders on), a shelf with
`Cantu Shea Butter Leave-In Conditioning Repair Cream` (bought twice), and 5 collections.

**Server check, every step that saves something:** after it, run
`grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3` and paste it. Any new
`5xx` is a **FAIL**. A `4xx` is only OK where the step expects a refusal.

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
`RUN` = `PROFILE-01-<YYYYMMDD>-<HHMM>`. Expect `dev_client: true`, or stop: BLOCKED.
**S2.** BOOK-01 S2 for the one device. **S3.** BOOK-01 S3 as Efua. 1 login `200`, or stop.

---

## P: Profile

**P1.** `qadb tapon Profile --exact`, wait 3 s, `qadb step P1`. **Record** every card and
row shown (e.g. `Your bookings`, `Your collections`, `Pick a username`,
`Set up your stylist profile`, `Hair care library`).
**P2: Edit profile.** `qadb link "yasante:///edit-profile"`, wait 3 s, `qadb step P2`.
Expect `Edit profile` with `Name`, `Username`, `Email`. Clear `Name`
(`qadb tapon Name --exact`, `qadb clearfield`), `qadb tapon "Save changes"`, wait 2 s,
`qadb step P2b`. Expect `Add your name` and **no** save request. Type `Efua QA`, clear
`Email` and type `not-an-email`, save, `qadb step P2c`. Expect
`That email doesn't look right`. Put the email back to `client@yasante.dev`, save,
wait 3 s, `qadb step P2d`. Server check. `qa/bin/dbcheck client@yasante.dev`: expect
`name='Efua QA'`.
**P3: Username.** `qadb link "yasante:///username"`, wait 3 s, `qadb step P3`. Expect
`Pick a username`. Type `efua_qa`, `qadb tapon "Save and continue"`, wait 3 s,
`qadb step P3b`. Server check. **Record** where it lands. Then try `ama` (likely taken):
back on `yasante:///username`, type `ama`, save, `qadb step P3c`. **Record** the message.
**P4: Profile photo (emulator only).** On `edit-profile`, `qadb tapon "Change photo"`,
choose the library, `qadb tapon "Photo taken on" --nth=0`, wait 3 s, `qadb step P4`.
Save, server check.

---

## H: Hair profile

**H1: The hub.** `qadb link "yasante:///hair-profile"`, wait 3 s, `qadb step H1`. Expect
`Your hair`, a list of sections (`section-texture`, `section-length`, …) and
`Between appointments` with `I had a trim` and `Wash day done`. **Record** which sections
show as answered.
**H2: One section.** `qadb tapon section-porosity`, wait 2 s, `qadb step H2`. **Record**
the question and options. Pick the first option, `qadb tapon quiz-next` (`Save`), wait
3 s, `qadb step H2b`. Server check. Back on the hub, **record** the porosity answer.
**H3: Log a wash day.** `qadb tapon log-wash`, wait 2 s, `qadb step H3`. Expect
`Last: …` under `Wash day done` to change to today. Server check.
**H4: The full quiz.** `qadb link "yasante:///onboarding/quiz"`, wait 3 s,
`qadb step H4`. For each screen: **record** the title, pick the **first** option,
`qadb tapon quiz-next`, and capture (`H4b`, `H4c`, …). If a screen offers
`I'm not sure — skip`, use it **once** (on the second screen) and record that it moved on.
On the last screen (`Here's your hair` / `Start exploring`) capture it, tap
`Start exploring`, `qadb step H4z`. Server check. **Record** the number of screens.

---

## C: Planner and care plans

**C1.** `qadb link "yasante:///planner"`, wait 3 s, `qadb step C1`. Expect `Planner` with
`Collections` (5) and `Care plans` (`Wash day`).
**C2: A plan.** Tap `Wash day`, wait 3 s, `qadb step C2`. Expect `Today's steps`,
`Last two weeks`, `When you followed it`. `qadb tapon care-plan-done`
(`I did this today`), wait 3 s, `qadb step C2b`. Expect `Done today`. Server check.
**C3: Edit.** `qadb tapon "Edit this plan"`, rename to `Wash day QA`, turn
`Remind me` off, `qadb tapon care-plan-save`, wait 3 s, `qadb step C3`. Server check.
**C4: New plan.** From the planner, `New care plan`, `What is this plan?` →
`QA oiling`, add one step if the form allows (**record** how), save, `qadb step C4`.
Server check.
**C5: Delete.** Open `QA oiling`, `Delete plan`, confirm, `qadb step C5`. **Record** the
dialog text (expect `Its steps and the record of when you followed it go with it.`).
Server check.

---

## B: Shelf

**B1.** `qadb link "yasante:///shelf"`, wait 3 s, `qadb step B1`. Expect `Your shelf` with
the Cantu product.
**B2: Add.** `qadb tapon shelf-add`, tap `shelf-search`, type `Cantu`, wait 3 s,
`qadb step B2`. **Record** the results. Tap one that's **not** already on the shelf
(**record** which), wait 3 s, `qadb step B2b`. Server check. Search `zzqqxx` →
`qadb step B2c`: expect `Not in the catalogue yet`.
**B3: One product.** Open the product added in B2, `qadb step B3`. Tap the 4th star of
`shelf-rating` (as BOOK-01 C6: use `find` and tap the right part of its bounds, and say
so). `qadb step B3b`. Then `qadb tapon shelf-finish` (`I've finished it`),
`qadb step B3c`, and `qadb tapon shelf-repurchase` (`I bought it again`),
`qadb step B3d`. **Record** `Bought N times` after each. Server check.
**B4: Remove.** `Take it off my shelf`, confirm (`Take it off your shelf?`),
`qadb step B4`. Server check.

---

## L: Learn

**L1.** `qadb link "yasante:///learn"`, wait 3 s, `qadb step L1`. **Record** the sections.
**L2.** Open the first article, wait 3 s, `qadb step L2`. `qadb swipe up` ×2,
`qadb step L2b`. **Record** whether it reads to the end and what's suggested next. Tap
the first suggestion, `qadb step L2c`.
**L3: Save an article.** On an article, tap its bookmark (`Save`) if there is one, and
pick `Knotless inspo`, `qadb step L3`. `qadb link "yasante:///saved"`, `qadb step L3b`:
**record** whether the article is listed. Server check.

---

## Z

`qadb end`, `qa/bin/env-down`, `qa/bin/emus down`. Paste the `qadb end` output at the
bottom of the report. Report each step; no overall verdict.
