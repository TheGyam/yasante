# DIARY-01: A stylist's diary, and the picker clients choose from

**Device: emulators + browser.** Ama runs her diary in the web studio (`qa/bin/qaweb`);
Efua and Kojo book in the app on two emulators (`client` emulator-5554, `client2`
emulator-5558). One agent drives all of it **in turn**.
**Covers:** upstream `1553d94` (notice), `82ef9bb` (the planning picker, how far ahead, time
between clients, nothing that clashes, two waiting requests at most, one chair per
client), `55090d3` (blocked-out time), `b64e63c` (repeating blocks), `c0a7dbe` (skipping
one day of a repeat). What Ama sets in the studio, Efua must see in the app's picker.
**Time:** about 75 minutes.
**Status:** written 19-10-2026; checked against upstream 24-10-2026 (the plait mark, 30-minute
starts, the day rule, R4's note). Claude dry-ran the studio's hours page and the app picker up
to choosing a time (`SETUP-dry-1018`); the steps that change Ama's diary and the clash
rules are written from the code and the commit notes, so expect plan errors there and
say exactly what you saw.

Read `qa/AGENTS.md` first (again: §8 now says **`qaweb --nth` counts from 1**). Its rules
override anything here. **Only the tools in `qa/AGENTS.md` §3**. If a step seems to need
another, write `NEEDS: …` and move on.

---

## Notation and test data

| Short | Command | Who |
| :--- | :--- | :--- |
| `A:` | `qa/bin/qaweb` (window `lead`) with `--site` pages | Ama Owusu, `ama@yasante.dev`, page **Braids by Ama** (`braidsbyama`) |
| `C:` | `qa/bin/qadb -d client` | Efua Mensah, `client@yasante.dev` |
| `K:` | `qa/bin/qadb -d client2` | Kojo Asante, `new@yasante.dev` |

Passwords are `password123`.

**Ama's week (seed):** Tue–Fri 09:00–18:00, Sat 08:00–16:00, Sun and Mon off; UK time.
Her menu: `Knotless braids` (5 hrs), `Cornrows` (2 hrs, sizes Big / Medium / Small),
`Take down and wash` (1 hr). Use **Cornrows, Big** for every request below:
`service-881ead90-d367-5a2c-a63c-a4a6a884da73`, then `tapon "Big" --exact`.

**Days used below.** Write each one down in the report in `YYYY-MM-DD` form at S5, from a
calendar, and use those exact dates throughout:
- **DAY_W**: the first Wednesday at least 7 days after today (run on a Sunday 25th, that is
  Wednesday 4th, not the 28th).
- **DAY_T**: the Thursday right after DAY_W.
- **DAY_F**: the Friday right after DAY_W.

**The app's picker** (dry-run): after a service and size, it shows ideas first
(`Soonest: <day>, <time>`, `A weekend: …`, `Ready by a date: …`), then a month: each day is
labelled `<Weekday> <d> <Month>, <how much room>` (`no times`, `a few times`, `plenty of
times`, …). Tap a day by its label (`C: tapon "Wednesday 28 October"`); its times appear
as `<Weekday> <d> <Month>, <HH:MM>, until <HH:MM>`. `swipe up` until what you need shows.
Tapping an idea picks its time at once. Starts come every **30 minutes** (09:00, 09:30, …),
each as long as the service.

**The mark between parts of a line.** The app and the studio no longer use ` · `: they put
their own mark there (a no-break space, then the private character U+E000, then a space),
which shows in `visible.txt` as a blank or a box. Where this plan writes ` · ` between parts
of a chip or line, expect that mark; quote what you see. Click a block chip by its **note**
(`A: click "QA school run"`), never by typing ` · `.

**Prompts the app may raise.** If `Your privacy choices` or `Turn on notifications?` comes up
at any point, `tapon "Not now" --exact`, write one line about it, and carry on: no step, no
verdict. Android's own notification question gets `Don’t allow`.

**Server check, every step that saves something:** after it, run
`grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3` and paste it. Any new
`5xx` is a **FAIL**. A `4xx` is OK only where the step expects a refusal; paste the
response line with it.

---

## S: Setup

**S1.**
```
qa/bin/env-down
qa/bin/emus up --wipe 3
qa/bin/env-up --reseed <RUN>
qa/bin/web-up <RUN>
qa/bin/metro <RUN>
qa/bin/qaweb start <RUN>
qa/bin/qadb start <RUN> client=emulator-5554 stylist=emulator-5556 client2=emulator-5558
```
`RUN` = `DIARY-01-<YYYYMMDD>-<HHMM>`. (`stylist` isn't used; it's started so the aliases
match BOOK-01.) Expect `dev_client: true` three times.

**S2.** BOOK-01 S2 on `client` and `client2`. **S3 (routing gate).** BOOK-01 S3 with Efua on
`client` and Kojo on `client2`. Then Ama on the site: `A: open /auth/login --site`,
`A: fill "Email" "ama@yasante.dev"`, `A: fill "Password" "password123"`,
`A: click "Sign in" --role=button`, wait 3 s. `grep -cE '"POST /api/auth/login/ HTTP/1.1"
200' qa/runs/<RUN>/server.log` gives **3**, or stop.

**S4: Ama's diary as seeded.** `A: open /availability --site`, wait 3 s, `A: step S4`.
**Record** the sections and what each is set to: `Working hours`, `TIME BLOCKED OUT`,
`NOTICE YOU NEED`, `HOW FAR AHEAD` (and its `Clients can book up to …` line), `TIME
BETWEEN CLIENTS`, `DAYS YOU’RE AWAY`, and the `What clients see` sentence.

**S5: The dates.** Write DAY_W, DAY_T, DAY_F in the section. `qa/bin/bookings
ama@yasante.dev`: paste it, and **Record** any booking or request already on those three
days (the seed has some; the steps below expect a free day, so if DAY_W is busy, say so
and carry on).

---

## P: The picker as a client first sees it (Efua)

**P1.** `C: link "yasante:///book/braidsbyama"`, wait 4 s,
`C: tapon service-881ead90-d367-5a2c-a63c-a4a6a884da73`, `C: tapon "Big" --exact`, wait
3 s, `C: swipe up`, `C: step P1`. **Record** the ideas word for word, the month heading,
and the room label of every day from today to the end of the month. **Expect** no day
before tomorrow with any times (Ama needs a day's notice by default), and Sun/Mon always
`no times`.

**P2: A day.** `C: swipe down` until the month shows, `C: tapon "<DAY_W as Weekday d
Month>"`, wait 2 s, `C: swipe up`, `C: step P2`. **Record** the line `09:00–18:00 · You’d be
there …` and every time offered (labels `…, HH:MM, until HH:MM`). Expect 2-hour slots
inside 09:00–18:00, the last ending by 18:00.

**P3: Ready by a date.** `C: swipe down` to the ideas, `C: tapon "Ready by a date"`, wait 2 s,
`C: step P3`. **Record** what it asks. Pick DAY_F as the day you need your hair done for,
as it asks, `C: step P3b`. **Record** the days ringed and what it offers (the commit: the
four days before it are ringed and the best fit offered). Pick nothing; `C: key BACK` out
of the booking screen.

---

## N: Notice, how far ahead, time between clients (Ama, then Efua)

**N1: Notice.** `A: click "2 days"`, `A: click "Save hours"`, wait 3 s, `A: step N1`.
Expect `Saved.` and `Clients only see times at least 2 days away` (**Record** the exact
sentence). **Server check:** `PATCH /api/stylists/me/` `200`.
Efua: open the picker as P1, `C: step N1b`. **Expect** the soonest idea at least two days
from now; **Record** it. A time sooner than 48 hours from the capture is a **FAIL**.

**N2: How far ahead.** `A: click "4 weeks"`, `A: click "Save hours"`, wait 3 s, `A: step N2`.
**Record** `Clients can book up to <date>`. Efua: in the picker, `C: tapon "Next month"`
until the month after that date, `C: step N2b`. **Expect** no times past it, and
`Tell me when <month> opens` (or `We’ll tell you when it opens`). **Record** the words.
Don't tap it.

**N3: Time between clients.** `A: click "30 mins"`, `A: click "Save hours"`, wait 3 s,
`A: step N3`. **Record** `Kept free after each appointment: …`.

**N4: Put it back.** `A: click "A day"`, `A: click "12 weeks"`, `A: click "None"` (under
`TIME BETWEEN CLIENTS`), `A: click "Save hours"`, wait 3 s, `A: step N4`. The `What clients
see` sentence should match S4's again; **Record** it.

---

## B: Blocking out time

**B1: Once.** `A: fill "Day" "<DAY_W>"`, `A: fill "From" "10:00"`, `A: fill "Until"
"12:00"`, `A: click "Just once"`, `A: fill "Note for you (optional)" "QA school run"`,
`A: click "Block it out"`, wait 3 s, `A: step B1`. Expect a chip `<DAY_W as she sees it>
10:00–12:00 · QA school run`. **Server check:** `POST /api/stylists/me/blocks/` `201`.

**B2: Efua can't land on it.** Efua: picker as P1, tap DAY_W as P2, `C: swipe up`,
`C: step B2`. **Expect** no time starting at 08:30–11:30 that would overlap 10:00–12:00
(with a 2-hour service: no 09:00, 09:30, 10:00, 10:30, 11:00 or 11:30 start; 08:00 and 08:30
aren't in her hours), the
timeline showing 10:00–12:00 as `Booked`, and **no** `QA school run` anywhere (only Ama
sees the note). **Record** the times offered. `C: key BACK`.

**B3: Every day.** `A: fill "Day" "<DAY_W>"`, `A: fill "From" "13:00"`, `A: fill "Until"
"14:00"`, `A: click "Every day"`, `A: fill "Note for you (optional)" "QA lunch"`,
`A: click "Block it out"`, wait 3 s, `A: step B3`. Expect a chip like `Every day,
13:00–14:00 · QA lunch` and under it `QA lunch: click a day to skip it, again to put it
back` with day chips (`Days it lands on`). **Record** the day chips.

**B4: Skip DAY_T.** Click DAY_T's chip under `Days it lands on` (it reads like `Thu 29`;
use `A: find` and pick it), wait 3 s, `A: step B4`. Expect that chip to read
`… · skipped`. **Server check:** `POST /api/stylists/me/blocks/<id>/skip/` `200` (paste the
line). Efua: picker, DAY_T, `C: step B4b`: **expect** a 13:00 start offered on DAY_T, and
on DAY_W (`C: step B4c`) **no** start that overlaps 13:00–14:00 (none from 11:30 to 13:30).

**B5: Put DAY_T back.** Click the skipped chip again, wait 3 s, `A: step B5`. Expect it no
longer says `skipped`. Efua: picker, DAY_T, `C: step B5b`: no 13:00 start any more.

**B6: A block can't cover a waiting request.** Efua: picker, DAY_F, pick the **15:00** start
(`C: tapon "<DAY_F label>, 15:00"`), `C: swipe up`, tick the terms
(`C: tapon "I accept"` as `find` shows), `C: tapon booking-send`, wait 4 s, `C: step B6`.
Server: `POST /api/bookings/` `201`; `qa/bin/bookings client@yasante.dev`: the newest is
**B1** (paste). Then Ama: `A: fill "Day" "<DAY_F>"`, `A: fill "From" "15:00"`,
`A: fill "Until" "16:00"`, `A: click "Just once"`, `A: click "Block it out"`, wait 3 s,
`A: step B6b`. **Expect** a refusal under `Couldn’t block that out.` or a message saying
why, and a `400` for `/api/stylists/me/blocks/`. **Record** the message. A block saved over
Efua's waiting request is a **FAIL**.

**B7: Removing a block.** **Record** first, from B1's `screen.png`, how the chips look (each
has an ×). `A: click "QA school run"`, wait 3 s, `A: step B7`. **Record** whether
anything asked before it went (in the code, one click removes it). Expect the chip gone
and `DELETE /api/stylists/me/blocks/<id>/` `204`. Efua: picker, DAY_W, `C: step B7b`:
10:00 and 11:00 starts are back (13:00 still not: the lunch repeats).

---

## R: Nothing clashes

**R1: The same time, from another client.** Kojo: `K: link "yasante:///book/braidsbyama"`,
Cornrows, Big, tap DAY_F, `K: swipe up`, `K: step R1`. **Expect** no start from 13:30 to 16:30
(Efua's request at 15:00–17:00 is held). **Record** the times offered.

**R2: Two waiting requests at most.** Efua sends two more requests to Ama: DAY_W at the
first time offered, then DAY_T at the first time offered, each as B6 (terms, send),
capturing `C: step R2` and `C: step R2b`. **Expect** the first `201` and the second refused
(the commit: two waiting requests per stylist at most). **Record** the message word for
word and both server lines. If both go through, **FAIL**.

**R3: One chair per client.** Efua: `C: link "yasante:///book/braidedbybisi"`, pick `Take
down and wash` (`C: tapon "Take down and wash" --exact`), tap DAY_F, `C: swipe up`,
`C: step R3`. **Expect** no start from 14:30 to 16:30 (a 1-hour service there would overlap her
own request with Ama, 15:00–17:00) although Bisi is free then. **Record** the times offered. `C: key BACK`.

**R4: A full day, and the waitlist.** Ama blocks all of DAY_T: `A: fill "Day" "<DAY_T>"`,
`From` `09:00`, `Until` `18:00`, `Just once`, `A: fill "Note for you (optional)" "QA full
day"`, `Block it out`, wait 3 s, `A: step R4`.
**Record** whether it's accepted (a waiting request of Efua's on DAY_T from R2 would make
it a refusal: if so, write that and skip to R5). Kojo: picker, DAY_T, `K: step R4b`.
**Expect** the day `no times` and `Tell me if a time opens`. `K: tapon "Tell me if a time
opens"`, wait 3 s, `K: step R4c`. **Record** the message; **server check:**
`grep 'slot-interests' qa/runs/<RUN>/server.log | tail -2`.

**R5: The time opens.** Ama removes R4's block (`A: click "QA full day"`), wait 3 s, `A: step R5`.
`qa/bin/pushlog new@yasante.dev 3`: paste it. **Expect** a notification to Kojo about
DAY_T (the commit: removing a block tells the waitlist). **Record** it word for word.

---

## Z: End

1. `qa/bin/qadb -d client clear`, `qa/bin/qadb -d client2 clear`.
2. `qa/bin/qaweb end`, then `qa/bin/qadb end`; paste its output at the bottom.
3. `qa/bin/env-down`.

---

## For Claude's audit (the executor can ignore this)

- Notice comes from `availability.lead_hours` (`slots.notice_hours`), a day by default; the
  profile's `notice_hours` field (48 for Ama) is her **cancellation** notice. Don't grade N1
  on the terms line.
- Check each held time against `qa/bin/bookings` and the `TimeBlock` rows myself; the
  free-times answer for DAY_W/DAY_T/DAY_F before and after B1, B3, B4, B5, B7 should match
  B2–B7b.
- B7: one click on a block chip deletes it with no confirm (`HoursScreen.tsx:442`). If the
  run shows the same, it's a UX finding (an accidental click frees a school run to clients).
- Writes expected: N1–N4 PATCHes, blocks B1, B3, (B6b refused), R4, skip ×2, DELETE ×2,
  requests B6 + R2 (one 201, one refused), slot interest R4c.
