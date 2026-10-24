# POLICY-01: The real policy documents, in the app and on the website, and tips from the server

**Device: 1 emulator + browser.** `client` emulator-5554 runs the app (Efua);
`qa/bin/qaweb -w visitor` is a signed-out visitor on the public site. One agent, in turn.
**Covers:** what every run before 24-10 missed because the reseed emptied the seeded
tables (task.md, 24-10 00:10): the four policies as published (title, version and date
line, numbered headings, the text itself), reached the ways a person reaches them
(Settings, sign-up, the `We’ve updated` notice, the website's own pages and links), and the
app's tip of the day coming from the server's 20 tips.
**Time:** about 30 minutes.
**Status:** written 24-10-2026 from `app/policy/[type].tsx`, `web/src/features/policy/`,
`src/shared/config/policies.ts` and the policy migrations (latest: `2026-10-23`, from
`planner/0005_policies_for_sharing`). FIXES-01 T saw the four app screens render once; the
website's pages with real documents have never been looked at.

Read `qa/AGENTS.md` first. Its rules override anything here. **Only the tools in
`qa/AGENTS.md` §3.** If a step seems to need another, write `NEEDS: …` and move on.

---

## Notation and test data

| Short | Command | Who |
| :--- | :--- | :--- |
| `C:` | `qa/bin/qadb -d client` | Efua Mensah, `client@yasante.dev`, password `password123` |
| `V:` | `qa/bin/qaweb -w visitor` | signed out, on the public site (`--site`) |

**What a policy page shows**, in both places: the title; a line `Version <v> · in effect
from <date>`; then the text, where a line like `3. Your hair details` on its own is a
heading. **For each policy step, Record:** the title, the version line word for word, the
first and the last heading, and how many headings there are (`visible.txt`; in the app,
swipe up until the end and capture again with a `b` suffix). `Not published yet`, `Couldn’t
load this page`, or a grey placeholder with no text is a **FAIL**.

Wait **10 s** after opening any policy. A dev-build `API Error` toast doesn't count either way.

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
`RUN` = `POLICY-01-<YYYYMMDD>-<HHMM>`. Paste the last lines. Expect `dev_client: true`.

**S2.** BOOK-01 S2 on `client` (launch, the dev-menu intro, the welcome screen).
**Do not sign in yet.**

---

## P: Before signing in

**P1: Sign-up's links.** `C: link "yasante:///auth/join"`, wait 3 s, `C: tapon role-client`,
wait 2 s, `C: step P1`. **Record** the sentence about the terms and privacy policy, word for
word, and which words are links (`qadb find "Terms"`, `qadb find "Privacy"`).

**P2.** Tap the terms link (`C: tapon "Terms of use"` or as `find` showed), wait 10 s,
`C: step P2`. **Expect** the terms (see Notation; Record). `C: key BACK`.
**P3.** Same for the privacy link, `C: step P3`. `C: key BACK`.

**P4: Server check.** `grep -E 'GET /api/policies' qa/runs/<RUN>/server.log | tail -4`, paste
it. Expect `200`s and no `404`.

---

## N: Signing in, and the notice

**N1.** BOOK-01 S3 for Efua (sign in), **but stop before the terms notice**: when `We’ve
updated our terms and privacy policy` shows, `C: step N1`. **Record** the notice word for
word (the line under the heading says what changed). `grep -cE '"POST /api/auth/login/
HTTP/1.1" 200' qa/runs/<RUN>/server.log` must give **1** (routing gate), or stop.
If no notice comes in 10 s, say so, capture `N1`, and go to N3.

**N2: `Read them`.** `C: tapon "Read them" --exact`, wait 10 s, `C: step N2`. **Record**
what opens (which policy, or a choice). Then `C: key BACK`, wait 2 s, `C: step N2b`:
**Record** whether the notice is still there. If it is: `C: tapon OK --exact`, wait 3 s.

**N3: Server check.** `grep -E 'POST /api/consents/' qa/runs/<RUN>/server.log | tail -4`,
paste it. **Record** how many there are, and their status.

---

## A: In the app, signed in

**A1: Settings.** `C: link "yasante:///settings"`, wait 3 s, `C: swipe up`, `C: step A1`.
**Record** every entry about policies or terms.

**A2–A5: Each policy from its link.** For `terms` (A2), `privacy` (A3), `guidelines` (A4),
`stylist-terms` (A5): `C: link "yasante:///policy/<type>"`, wait 10 s, `C: step A<n>`;
swipe up until the text ends (`C: swipe up`, up to 15 times), `C: step A<n>b`. Record as in
Notation. `C: key BACK`.

**A6: From Settings.** `C: link "yasante:///settings"`, wait 3 s, `C: swipe up`,
`C: tapon "Privacy policy" --exact`, wait 10 s, `C: step A6`. **Expect** the same title and
version line as A3.

**A7: Server check.** `grep -E 'GET /api/policies' qa/runs/<RUN>/server.log | tail -8`.

---

## W: On the website, signed out

**W1–W4.** For `/terms` (W1), `/privacy` (W2), `/guidelines` (W3), `/stylist-terms` (W4):
`V: open <path> --site`, wait 5 s, `V: step W<n>`. Record as in Notation (the whole page is
in `visible.txt`; no scrolling needed). **Expect** the same title and version line as the
app's A2–A5, and the same headings.

**W5: The site's own links.** `V: open / --site`, wait 3 s, `V: find "Terms"`,
`V: find "Privacy"`, `V: find "Guidelines"`, `V: step W5`. **Record** the links the page
offers (in the foot). Click the privacy one (`V: click "Privacy" --role=link`, `--nth` as
`find` numbered it), wait 5 s, `V: url`, `V: step W5b`. **Expect** `/privacy` and the page of W2.

**W6: A heading's own address.** `V: open "/privacy#section-3" --site`, wait 5 s,
`V: step W6`. **Record** which heading is at the top of `screen.png` (expect `3. …`).

**W7: A policy that doesn't exist.** `V: open /policies/nothing --site`, wait 5 s,
`V: step W7`. **Record** what shows (a not-found page is right).

---

## T: Tips from the server

**T1: Home.** `C: link "yasante:///"`, wait 5 s, `C: step T1`. **Record** the tip under
`TIP OF THE DAY`, word for word. **Server check:**
`grep -E 'GET /api/tips/' qa/runs/<RUN>/server.log | tail -2`: expect `200`.

**T2: Learn.** `C: link "yasante:///learn"`, wait 5 s, `C: step T2`. **Record** any tip or
article it shows, with the first words of each.

---

## Z: End

1. `qa/bin/qadb -d client clear`.
2. `qa/bin/qaweb end`, then `qa/bin/qadb end`; paste its output at the bottom.
3. `qa/bin/env-down`, `qa/bin/emus down`.

---

## For Claude's audit (the executor can ignore this)

- Compare every title, version line and heading list with `profiles_policydocument`
  (`PolicyDocument.current(type)` for each type): the latest published row of each, all
  `2026-10-23` after a reseed except where a type was last changed earlier. The app's
  `POLICY_VERSION` is `2026-10-23`: the notice should come for any seeded account whose
  consents are older, and the consent rows N3 makes should carry that version.
- The text: diff `visible.txt` paragraphs against the stored body for at least privacy
  (the longest). The app splits on blank lines and makes a heading of a short numbered
  line; the website (`web/src/features/policy/format.ts`) should agree.
- Tip of the day: `tips[dayOfYear % n]` in sort order (20 seeded, sort 0–19); on 24-10
  (day 297) that's place 17.
- Writes expected: the sign-in and its consent rows only.
