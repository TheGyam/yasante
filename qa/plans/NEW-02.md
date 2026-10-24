# NEW-02: New in discovery: who does this style, postcodes, work photos, "Your hair", tips, Google

**Device: emulators only**: `client` (emulator-5554), `stylist` (emulator-5556),
`client2` (emulator-5558). One agent drives all three **in turn**.
**Covers:** upstream's `84d0d82`, `4b6da9d`, `0d7720e`, `72102c8` (who does this style,
stylists near you, postcode in the hair profile, tips from the server), `99e383d` (work
photos full screen, "Your hair"), `3a6f0bb` ("No service" on a portfolio photo) and
`581441f` (the `Continue with Google` button).
**Not here:** the occasional hair questions on Home. They stay quiet on a phone's first
day, and emulators are always on their first day. Upstream has unit tests for their timing.
**Time:** about 70 minutes.
**Checked against upstream 24-10-2026:** every testID and line still there (`section-area` is
`section-${key}`; capitals like `TIP OF THE DAY` are styling); UK postcodes still go to
postcodes.io (Photon is only for stylists outside the UK).

Read `qa/AGENTS.md` first (again, since it changed). Its rules override anything here.
`qadb step` opens each step's section in the report; fill it in before the next step.
**Only the tools in `qa/AGENTS.md` §3**: no `manage.py`, `curl`, `adb` or `git`, not even
to read. If a step seems to need one, write `NEEDS: …` in its section and move on.

---

## Notation and test data

`C:`, `S:`, `K:` = `qa/bin/qadb -d client`, `-d stylist`, `-d client2` (as in BOOK-01).

| Who | Account (password `password123`) | Device |
| :--- | :--- | :--- |
| Efua | `client@yasante.dev` (Efua Mensah), hair profile area **Peckham** | client |
| Ama, page **Braids by Ama** (`braidsbyama`) | `ama@yasante.dev` (Ama Owusu) | stylist |
| Kojo | `new@yasante.dev` (Kojo Asante), **no area** in his hair profile | client2 |

Seeded look: `look_seed_1` = `6a0e724c-8542-5817-b3a6-85c45a22c283` (Ama's
`Knotless, waist length, done in one sitting.`). Copy the ID exactly.

The server finds places through **postcodes.io** (a public UK service). If a step shows
`We couldn’t find that postcode` for a real postcode below, check
`grep -i postcodes qa/runs/<RUN>/server.log | tail -3`, paste it, and mark BLOCKED.

**Server check, every step that saves something:** after it, run
`grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -3` and paste it. Any new
`5xx` is a **FAIL**. A `4xx` is only OK where the step expects a refusal, with one
exception: a `401` followed at once by `POST /api/auth/refresh-token/ 200` and the same
request succeeding is the app renewing its 15-minute sign-in, not a failure. Paste it and
say so.

**Keyboard.** `qadb tapon` closes the keyboard itself when the button is under it and
prints `closed the keyboard first`. That's expected.
**Press and hold.** `qadb tapon "<text>" --hold` holds for about a second.

---

## S: Setup

**S1.**
```
qa/bin/env-down
qa/bin/emus up --wipe 3
qa/bin/env-up --reseed <RUN>
qa/bin/metro <RUN>
qa/bin/qadb start <RUN> client=emulator-5554 stylist=emulator-5556 client2=emulator-5558
```
`RUN` = `NEW-02-<YYYYMMDD>-<HHMM>`. Expect `dev_client: true` three times, or stop: BLOCKED.
**S2.** BOOK-01 S2 for `client`, `stylist`, then `client2`.

**G: Continue with Google (client2, before signing in).**
**G1.** `K: link "yasante:///auth/login"`, wait 3 s, `K: step G1`. Expect
`Continue with Google` above `or with email`. **Record** the text under it.
**G2.** `K: tapon google-sign-in`, wait 5 s, `K: fg`. **Record** the package. Google's
own sign-in window is outside Yasante: **don't tap, read or capture anything there.** If
`fg` isn't `com.yasante.app`, run `K: recover`. Wait 2 s, `K: step G2`. **Record** any
message on the sign-in screen, word for word. (This build isn't signed with the key
Google knows, so a polite `We couldn’t sign you in with Google…` is the expected ending.
A crash or a frozen screen is a **FAIL**.) Server:
`grep -E 'auth/social' qa/runs/<RUN>/server.log`, paste it (probably empty).

**S3.** BOOK-01 S3 with Efua (client), Ama (stylist) and Kojo (client2). 3 login `200`s,
or stop. Ama **stays in client mode** until part V.

---

## T: Tip of the day

**T1.** `C: link "yasante:///"`, wait 4 s, `C: step T1`. **Record** the `TIP OF THE DAY`
text. Server: `grep -E 'GET /api/tips/' qa/runs/<RUN>/server.log | tail -1` shows `200`.

---

## W: Who does this style

**W1: The card under a look.** `C: link "yasante:///looks/6a0e724c-8542-5817-b3a6-85c45a22c283"`,
wait 5 s, `C: swipe up`, `C: step W1`. Expect a card `Who does knotless braids?`
(`who-does-this-card`). **Record** everything on it.
**W2: The list.** `C: tapon who-does-this-card`, wait 5 s, `C: step W2`. Expect the title
`Who does knotless braids?`, `Stylists near Peckham, their work in it first.`, and the
choices `5 miles`, `10 miles` (selected), `20 miles`, `Anywhere`. **Record** each row:
name, distance, area, price, rating, and the line under it (`Their work in this style`,
`Their recent work` or `On their menu`). Server:
`grep -E 'GET /api/stylists/\?style=' qa/runs/<RUN>/server.log | tail -1`.
**W3: Nearer and further.** `C: tapon "5 miles" --exact`, wait 4 s, `C: step W3`, then
`C: tapon "Anywhere" --exact`, wait 4 s, `C: step W3b`. **Record** the rows each time,
and the server line (`within=5`, `within=any`).
If `5 miles` shows `Nobody within 5 miles yet`, **record** the button it offers.
**W4: Book from the list.** `C: tapon "Book" --nth=0`, wait 4 s, `C: step W4`. Expect that
stylist's booking screen with the knotless service **already chosen**. **Record** it.
`C: key BACK` twice.
**W5: Press and hold in the feed.** `C: link "yasante:///"`, wait 5 s. Find a look on Home
(`C: find "by "` lists them). Hold the first one:
`C: tapon "<its label, as find printed it>" --hold`, wait 5 s, `C: step W5`. Expect
`Who does <that look's style>?`. **Record** the title, or what happened instead.

**W6: No area yet (Kojo).** `K: link "yasante:///who/knotless"`, wait 5 s, `K: step W6`.
Expect `See who’s near you`, a `Your postcode` field and `Show stylists near me`
(off until there's a whole postcode). **Record** the rows below it.
`K: tapon "Your postcode"`, type `SE15 4QJ`, `K: tapon "Show stylists near me"`, wait 5 s,
`K: step W6b`. Expect the subtitle to become `Stylists near Peckham, …` with the mile
choices and distances. Server check (the hair-profile save, `200`).
**W7: Not yourself (Ama).** `S: link "yasante:///who/knotless"`, wait 5 s, `S: step W7`,
and `S: tapon "Anywhere" --exact` if it's offered, wait 4 s, `S: step W7b`. **Braids by Ama
must not be listed** (she's the one asking). If she is, **FAIL**.

---

## P: A postcode in the hair profile (Efua)

**P1.** `C: link "yasante:///hair-profile"`, wait 3 s, `C: tapon section-area`, wait 2 s,
`C: step P1`. **Record** the question, the `Your postcode` field and its hint (expect
`So we can show stylists near you. It’s never shown to anyone.`), and what's selected.
**P2.** `C: tapon "Your postcode"`, type `SW1A 1AA`, wait 5 s, `C: step P2`. **Record** the
area names offered (expect `St James's` and `Westminster`). Tap `Westminster`,
`C: tapon quiz-next` (`Save`), wait 3 s, `C: step P2b`. Server check (`200`).
**P3.** `C: link "yasante:///who/knotless"`, wait 5 s, `C: step P3`. Expect
`Stylists near Westminster, …`. **Record** the rows and distances; they should differ
from W2's.
**P4: A postcode that doesn't exist.** `C: link "yasante:///hair-profile"`, wait 3 s,
`C: tapon section-area`, tap the postcode field, `C: clearfield`, type
`ZZ1 1ZZ`, wait 5 s, `C: step P4`. **Record** the message. Don't save; `C: key BACK`.

---

## V: Work photos, full screen

**V1: As a client (Efua).** `C: link "yasante:///stylist/braidsbyama"`, wait 4 s,
`C: swipe up` until `Their work` shows, `C: step V1`. Tap the first photo, wait 3 s,
`C: step V1b`. Expect it full screen, with the service and price if it's tagged,
`Book this` and perhaps `See the look`. `C: swipe left`, wait 2 s, `C: step V1c`:
**record** whether the next photo came up. If `Book this` is there,
`C: tapon work-book`, wait 3 s, `C: step V1d`: expect the booking screen with that service
chosen. `C: key BACK` until you're back on the page.
**V2: As the stylist (Ama).** BOOK-01 S4 on `stylist` (Ama into stylist mode). Then
`S: link "yasante:///work/me?mine=1&index=0"`, wait 4 s, `S: step V2`. Expect her photo
full screen with `Edit` (tagged) or `Tag it` (not tagged). **Record** which.
`S: tapon work-edit`, wait 2 s, `S: step V2b`. **Record** the choices (her services,
`No service`, `Remove this photo`). Tap `No service`, wait 3 s, `S: step V2c`. Server check
(the portfolio save). Expect `Not tagged yet. Tag it and clients see its price beside it.`
**V3: It sticks.** `S: key BACK`, then open the same link again, wait 4 s, `S: step V3`.
Expect it **still** untagged (`Tag it`). Back to tagged is a **FAIL**.

---

## I: "Your hair" (Efua)

**I1.** `C: tapon Profile --exact`, wait 3 s, `C: step I1`. **Record** the `Your hair`
part of the profile (headline, figures).
**I2.** `C: link "yasante:///insights"`, wait 4 s, `C: step I2`, `C: swipe up`,
`C: step I2b`. **Record every line**: what's `IN RIGHT NOW` and for how many days,
length and when it was measured, appointments, spend, wash days, last trim, looks saved.
**I3.** `C: tapon "Since you started"`, wait 3 s, `C: step I3`. **Record** the figures that
changed. Server: `grep -E 'GET /api/insights/' qa/runs/<RUN>/server.log | tail -2`.
Efua's last appointment was a `Take down and wash`: **record** whether the screen treats
it as the style she's wearing now.

---

## Z

`qadb end`, `qa/bin/env-down`, `qa/bin/emus down`. Paste the `qadb end` output at the
bottom of the report. Report each step; no overall verdict.
