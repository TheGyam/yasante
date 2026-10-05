# PHONE-01: What only a real phone shows, security first

**Device: phone**, the owner's **Samsung Galaxy S23 Ultra**, with the **owner present**
(parts K, C and B need their hands; part T, optional, uses the Galaxy Tab A11+ 5G).
**Covers:** the phone-only rows of `qa/DEVICES.md`. Security first: links into the app
that point at someone else's data, the session on a real device (restart, background,
sign-out with F1's fix), the Samsung keyboard and Samsung Pass on password fields, the
camera switching off when you leave it. Then F3 rechecked on real hardware (a stylist
sign-up with the real keyboard), and how the app feels.
**Needs:** emulators **down** (`qa/bin/emus status`), so the phone is the only device;
the S23 Ultra unlocked, USB debugging on, Do Not Disturb on, screen timeout 10 minutes or
more; the dev-client build installed (Claude installs it before the first run).
**Time:** about 75 minutes.
**Status:** written 05-10-2026 from the code and DEVICES.md; not yet run. Exact screen
wording on Samsung's own prompts is unknown: where a step says **Record**, write down
what appears, word for word.

Read `qa/AGENTS.md` first, and section 1 twice: **this is the owner's own phone.** Its
rules override anything here. Every capture is of Yasante only; `qadb` refuses anything
else. Anything Samsung or Google puts over the app (Samsung Pass, "save password?",
autofill, a keyboard asking for access) is **the owner's to answer**: stop, ask them,
and write down what they chose.

---

## Test data

`RUN` = `PHONE-01-<YYYYMMDD>-<HHMM>`, `STAMP` = the `HHMM` part.

| Who | Account | Notes |
| :--- | :--- | :--- |
| Naomi Grant (seeded client) | `naomi.grant@yasante.dev`, `password123` | the phone's account for parts P, S, L, C |
| New stylist (made in K) | `p01.<STAMP>.stylist@example.com`, name `QA Phone Braids <STAMP>`, password `Qa-Phone-2026!` | |

Someone else's things (copy exactly; they are fixed by the seed): Efua's **private** look
`fbeeb843-1bd5-51a2-bc38-2d417349ba03`; Efua's past booking with Braids by Ama
`b90da4f1-1f35-56ec-9b32-82dae96c778a`. Naomi has no right to see either.

**Server check** where a step says so:
`grep -E '" (4|5)[0-9]{2} ' qa/runs/<RUN>/server.log | tail -5`. A new `500` is a **FAIL**.

---

## P: Preflight and routing gate

**P1.** `qa/bin/emus status` (all `down`), then:
```
qa/bin/env-up --reseed <RUN>
qa/bin/metro <RUN>
qa/bin/qadb start <RUN>
```
Paste all output. Expect `backend: HTTP 200`, `metro: running on :8082`, and the device
JSON with `"dev_client": true` and the S23 Ultra's model (`SM-S918B` or similar).
**Record** its `android` version. `dev_client` false or a WARNING: stop, BLOCKED.

**P2.** `qadb clear`, `qadb launch`. Wait until `grep -i bundled qa/runs/<RUN>/metro.log`
prints a line (up to 2 minutes), then 10 s. If the dev-menu intro shows,
`qadb tapon Continue --exact`, `qadb tapon Close --exact`. Android's notification prompt
may come up: `qadb tapon permission_deny_button`. `qadb link "yasante:///"`, wait 3 s,
`qadb step P2`. Expect the welcome screen (`Get started`, `I already have an account`).

**P3: ROUTING GATE.** `qadb tapon "I already have an account"`, `qadb tapon email-input`,
`qadb type "naomi.grant@yasante.dev"`, `qadb tapon password-input`, `qadb step P3a`
(the keyboard is up on the password field: see K1 below for what to record now),
`qadb type "password123"`, `qadb tapon login-button`, wait 5 s, `qadb step P3b`.
**Server check:** `grep '"POST /api/auth/login/' qa/runs/<RUN>/server.log | tail -1`
shows `200` from the last minute. **No line: stop the whole run.** Expect Home
(`Hey Naomi`). If Samsung Pass or Google asks to save the password, stop and ask the
owner (they should choose **Never** / **Not now**), then record what they chose.

**K1 (recorded in P3a).** From P3a's capture: does the UI tree mark the password field
`password: true`? Does `screen.png` show the Samsung keyboard's suggestion strip with
words above the password field? (A password field should show none.) **Record** both.

---

## S: The session on a real phone

**S1: Restart keeps you signed in, without asking the server to sign in again.**
Count: `grep -c '"POST /api/auth/login/' qa/runs/<RUN>/server.log`. `qadb stop`,
`qadb launch`, wait 20 s, `qadb step S1`. Expect Home as Naomi. The count must not have
gone up (the app kept its token on the phone). A refresh (`POST /api/auth/refresh-token/
200`) is fine; quote any.

**S2: Sign-out reaches the server (F1, fixed upstream on 28-09).** Count first:
`grep -cE 'POST /api/auth/logout' qa/runs/<RUN>/server.log`.
`qadb link "yasante:///settings"`, `qadb swipe up`, `qadb tapon "Sign out"`, wait 3 s,
`qadb step S2`. Expect `Sign out?`. `qadb tapon dialog-confirm`, wait 4 s, `qadb step S2b`.
Expect Home as a guest (`Hey there`). **Server check:** the same count, up by one, with
`200`. `qa/bin/dbcheck naomi.grant@yasante.dev`: **record** `refresh_tokens issued=… revoked=…`
(revoked should have gone up). No new logout line: **FAIL** (F1 is back).

**S3: Signed out stays signed out.** `qadb stop`, `qadb launch`, wait 20 s, `qadb step S3`.
Expect the guest Home or the welcome screen, **no** `Naomi` anywhere. `qadb key BACK`,
wait 2 s, `qadb step S3b`: the back gesture must not bring back any of Naomi's screens
(if `qadb` says `OUTSIDE_APP` because BACK left the app, run `qadb recover` and say so).

---

## K: A stylist signs up with the real keyboard (F3 on real hardware)

F3 was a crash right after a stylist sign-up (fixed upstream before 27-09). It never ran
on a real phone.

**K2.** `qadb link "yasante:///auth/join"`, `qadb tapon role-stylist`, wait 2 s,
`qadb step K2`. Expect `Set up your stylist account`. Fill it with the new stylist's data:
`qadb tapon` each field, then `qadb type` (`name-input`, `email-input`, `password-input`,
`confirm-password-input`); tick the 18-or-over box; `qadb step K2a` **before** submitting
(check each `type` read back correctly; on a `TYPE_MISMATCH`, `qadb clearfield` and type
again). `qadb tapon signup-button`, wait 5 s, `qadb step K2b`. Expect `Check your email`.
Server check: `POST /api/auth/signup/ 201`. If Samsung Pass offers to save: stop, ask the
owner, record.

**K3.** `qa/bin/mailbox <RUN> --to p01.<STAMP>.stylist@example.com --last`: paste it. The
code boxes have focus (`qadb type` refuses if the keyboard isn't up: then
`qadb tapon` the first box). `qadb type "<code>"`, wait 6 s, `qadb step K3`.
Expect the **stylist** side (tabs such as `Today`, `Requests`); **record** them.
**Crash check:** compare the `pid` in K2b's and K3's `app.log` lines: a new PID means
the app died and restarted (F3 is back): **FAIL**, and paste the `app.log` lines with
`FATAL`, `Exception` or `addViewAt`. `qa/bin/dbcheck p01.<STAMP>.stylist@example.com`:
`verified=True`, roles with `stylist`.

**K4.** Sign her out as in S2 (`yasante:///settings`, `Sign out`, `dialog-confirm`),
`qadb step K4`. Then sign Naomi in again as in P3 (no captures needed until Home),
`qadb step K4b`: Home as Naomi.

---

## L: Links that point at someone else's things (as Naomi)

Each link opens inside the app. **Expect** a not-found or "not yours" screen, nothing of
Efua's, and a refusal from the server. Seeing any of Efua's caption, address, stylist,
date or price is a **FAIL**. For each, quote the server lines for that step
(`tail -5 qa/runs/<RUN>/server.log`).

**L1: Efua's private look.** `qadb link "yasante:///looks/fbeeb843-1bd5-51a2-bc38-2d417349ba03"`,
wait 3 s, `qadb step L1`. Must not show `Length check before the big chop decision.`
Expect `GET /api/looks/fbeeb843…/ 404`.

**L2: Efua's booking.** `qadb link "yasante:///bookings/b90da4f1-1f35-56ec-9b32-82dae96c778a"`,
wait 3 s, `qadb step L2`. Must not show `Braids by Ama`, `Knotless braids`, an address or
a date. Expect a `404` (or `403`) for that booking.

**L3: The stylist's view of it.** `qadb link "yasante:///requests/b90da4f1-1f35-56ec-9b32-82dae96c778a"`,
wait 3 s, `qadb step L3`. Naomi isn't a stylist: expect nothing of the booking, and no
`Accept` / `Decline`.

**L4: A check-in on it.** `qadb link "yasante:///check-in/b90da4f1-1f35-56ec-9b32-82dae96c778a"`,
wait 3 s, `qadb step L4`. **Don't** answer anything. Expect no questions about Efua's
appointment; **record** what shows. No `POST` may follow (quote the step's server lines).

**L5: A made-up invite.** `qadb link "yasante:///invite/QA-NOT-A-CODE"`, wait 3 s,
`qadb step L5`. **Record** the message. Don't tap anything that accepts; no
`POST …/redeem` may appear.

**L6: An address that isn't a screen.** `qadb link "yasante:///admin"`, wait 3 s,
`qadb step L6`. **Record** what shows (a not-found screen is right; a blank or stuck
screen is worth a line). `qadb link "yasante:///"` to go home.

**L7: yasante.com.** `qadb link "https://yasante.com/braidsbyama"`, wait 4 s,
`qadb step L7`. The dev client usually doesn't take web links (they need the signed
release build and Android's link check, see DEVICES.md), so **record** what happens: the
app's own screen, nothing, or a refusal from `qadb`. Not a FAIL either way. If anything
outside Yasante comes to the front, `qadb recover` and say so.

---

## C: The camera, and that it switches off (as Naomi)

The camera sees the room. **The owner holds the phone for this part** and points it at
the barcode of any hair product they have, close up, so nothing else is in frame.

**C1.** `qadb link "yasante:///shelf/add"`, wait 3 s, `qadb tapon shelf-scan`, wait 3 s,
`qadb step C1`. Expect `Let Yasante use your camera`. `qadb tapon "Allow camera" --exact`.
Android asks next: choose **While using the app** (this plan names it), say so. Owner
points at the barcode. Wait 5 s, `qadb step C1b`. **Record** what the app found (a
product, `Not in the catalogue yet`, or nothing).

**C2: The camera lets go.** `qadb key BACK`, wait 2 s, `qadb step C2`. **Ask the owner**
whether the green camera dot (top right of the screen) went away within a few seconds,
and record their answer. A dot that stays while Yasante isn't scanning is a **FAIL**.

---

## B: In the background, the Samsung way (as Naomi)

**B1.** `qadb link "yasante:///"`, wait 3 s, `qadb step B1`. **The owner** presses the
Home button (the agent never does), uses the phone normally or leaves it locked for
**10 minutes**, then says so. `qadb recover`, wait 5 s, `qadb step B1b`. Expect Naomi's
Home without a new sign-in (`grep -c` as in S1 unchanged). **Record** whether the app
restarted (new PID in `app.log`, splash) or came back where it was, and how long it took
to show content.

---

## F: How it feels (as Naomi; the owner judges)

**F1.** `qadb link "yasante:///looks"`, wait 4 s, `qadb step F1`. `qadb swipe up` five
times, `qadb step F1b`. **Ask the owner**: smooth, or stutters? Images late? Record
their words. **F2.** Open a look (`qadb tapon` the first look), wait 2 s, `qadb step F2`.
Owner: how long until the photo showed? **F3.** `qadb link "yasante:///bookings"`, wait
3 s, `qadb step F3`; owner: anything slow, cut off, under the camera hole, or clashing
with the back gesture? Record it all; there's no right answer, and this is a flagship
phone, so slower phones will be slower still.

---

## T: The tablet (optional, another session)

Only if the owner wants it: the same P1–P3 on the Galaxy Tab A11+ 5G, held in **one**
orientation (record which), then `qadb step T1` on Home, `T2` on `yasante:///looks`,
`T3` on a look, `T4` on `yasante:///bookings`. **Record** whether the app turned and
stretched (Android 16 ignores the portrait lock on large screens) or stayed letterboxed,
and anything cut off or oversized. Then Z.

---

## Z: End

1. Sign Naomi out (as S2) so no token for a test account stays on the phone.
2. `qa/bin/qadb clear`: Yasante's own data wiped from the phone, nothing else.
3. `qa/bin/qadb end`; paste its output at the bottom of the report.
4. `qa/bin/env-down`.
5. Tell the owner they can turn Do Not Disturb off and unplug.

---

## For Claude's audit (the executor can ignore this)

- L1–L5: the server answered each with 403/404 and the captures hold nothing of Efua's.
- S1/B1: no new `POST /api/auth/login/`; S2: logout `200` and `revoked` up by one.
- K3: same PID before and after; `app.log` free of `addViewAt`.
- Every owner answer (Samsung Pass, camera dot, feel) is quoted as the owner's, not the agent's.
- Code-level, not for the phone: `app.json` leaves `android.allowBackup` at Expo's default
  (on); AsyncStorage holds the offline request queue and profile data. Check what a
  backup would carry before calling it a finding.
