# QA executor rules — read all of this before running any plan

You are executing a manual test plan for the Yasante Android app, on **emulators** or on
**the owner's personal phone**. Each plan says which at the top (`Device:`). The rules in
section 1 hold on both. They matter most on the phone, and on the emulators they keep
the evidence honest. Claude wrote the plan and will audit your run afterwards against the
raw evidence on disk. Your job is to follow the plan exactly and report what actually
happened, nothing more.

## 0. One run, one agent

Run one plan at a time, as one agent, in the order written. **No parallel runs, no
sub-agents or "team" mode.** Every run shares one backend: `--reseed` wipes it, the
rate limits are shared, and `qadb` keeps one active run. Within a plan that uses several
emulators, drive them in turn with `qadb -d <device>`.

## 1. The phone is personal. These are hard limits.

- **Touch the phone only through `qa/bin/qadb`.** Never run `adb` yourself, not even
  `adb devices`, `adb shell` or `adb logcat`. `qadb` is scoped to `com.yasante.app` and
  refuses everything else. If it refuses, that is the answer: do not look for a way
  around it.
- Never read, open, screenshot, list or pull anything outside Yasante: no other apps,
  files, photos, contacts, messages, notifications, settings or accounts.
- Never pull down the notification shade, open recent apps, press HOME or open Settings.
- If `qadb` says `OUTSIDE_APP`, **stop that step**, run `qadb recover` once, capture a
  step, and mark the step BLOCKED with the foreground it reported. If `recover` does not
  bring Yasante back, stop the run and ask the owner. Do not tap anything else.
- Android's own permission prompt (camera, notifications) is the one outside window you
  may tap, and only the option the plan names. With no instruction, choose "Don't allow".
- **On emulators only**, `qadb` also lets you tap Android's photo picker and camera, for
  plans that post a photo. Their galleries hold only the test photos `emus` puts there.
  `qadb` refuses both on the phone.
- Anything else that pops up over the app (Google's "save password?", autofill or a
  keyboard suggestion bar asking for access) is not yours to answer. Stop and ask the owner.
- Type only the test data written in the plan. Never type the owner's real name, email,
  phone number or passwords.

## 2. Only the local backend

The app must talk to the local Django server on this laptop, never `api.yasante.com`.
Every plan starts with a **routing gate** that proves this. If the gate fails, stop the
whole run. Do not "try anyway". A test account made on the live server is real data.

## 3. Tools you may use

| Tool | Use |
| :--- | :--- |
| `qa/bin/env-up [--reseed] <RUN>` | start the backend (log: `qa/runs/<RUN>/server.log`) |
| `qa/bin/metro <RUN>` | start Metro pointed at the local backend |
| `qa/bin/qadb …` | every interaction with the phone; `qadb help` lists the commands |
| `qa/bin/mailbox <RUN> [--to ADDR] [--last]` | the codes and reset links the server "emailed" |
| `qa/bin/dbcheck <email>` | read-only account state in the local database |
| `qa/bin/emus up [--wipe] [N]` / `down` / `status` / `tz <role> <Area/City>` | the test emulators (client, stylist, client2); `tz` only where a plan says |
| `qa/bin/bookings <email> [<booking-id>]` | a person's bookings; with an ID, what each side's app is sent |
| `qa/bin/timewarp <booking-id> <field> <hours>` | **only where a plan step says so**, with exactly its values |
| `grep`/`tail` on `qa/runs/<RUN>/server.log` | the server's view of each request |
| `qa/bin/env-down` | stop everything at the end |

Nothing else: no editing app or backend code, no `manage.py` commands of your own, no
database edits (other than a plan's `timewarp`), no git commands, no raw `adb` or
`emulator` commands. No scripts of your own either (`python3 -c`, `node`): never work out
an ID or a tap point by computation. Use the IDs the plan gives. If one doesn't work, mark
the step BLOCKED and quote the error. Don't read the app's source either (`app/`, `src/`, `backend/`):
report what the app does on screen, not what the code says it should do.

## 4. Evidence: no capture, no verdict

- Every numbered step in a plan ends with `qadb step <STEP-ID>`. That writes
  `screen.png`, `ui.xml` (the app's UI tree), `visible.txt` and `app.log`, hashes them
  into `qa/runs/<RUN>/journal.jsonl`, prints a summary, and **opens that step's section
  in `qa/reports/<RUN>.md` with the summary already written in**.
- **Before the next step, fill in the section `qadb step` just opened:** the verdict,
  the checks' commands and raw output, and observed vs expected. Never edit, shorten or
  retype the summary `qadb` wrote. Claude compares it with `visible.txt` and the journal.
  If `qadb` flags a reused step ID, say in that section why you captured again.
- When a step says **server check**, paste the exact `grep` command and its raw output.
  When it says **db check**, paste the `dbcheck` output.
- Never edit, delete, rename or re-create anything under `qa/runs/`. If you captured
  the wrong thing, capture again with a suffix (`S07b`) and say why.
- Never write a verdict from memory or expectation. If you did not capture it, the
  verdict is NOT RUN.

## 5. Verdicts

| Verdict | Meaning |
| :--- | :--- |
| PASS | Every "Expect" line was observed, and the pasted evidence shows it. |
| FAIL | Something differed. Quote exactly what you saw next to what was expected. |
| BLOCKED | You could not perform the step (refusal, crash, missing element). Say what stopped you. |
| NOT RUN | Skipped, with the reason. |

A FAIL or BLOCKED with honest evidence is a good result. **A PASS you did not observe is
the worst possible outcome**, because it hides a bug. When unsure, write FAIL or BLOCKED
and describe what you saw. Where a plan says **Record**, there is no right answer: write
down exactly what appeared, word for word.

Also report anything odd you notice along the way (flicker, slow screens, text cut off,
a wrong word) under "Other observations", with the step it happened in.

## 6. Finding elements

Prefer `qadb tapon "<text>"` using the words on screen or the testID the plan gives.
If it reports several matches, pick with `--nth=N` from the list it prints. Use `qadb find`
to look before you tap. Use raw `qadb tap X Y` only when the plan says so or nothing
else works, and then say so in the report. After typing into a field, capture before
submitting when the plan asks.

Each capture lists the screen's **testIDs**. They are the steadiest targets
(`qadb tapon email-input`), so use them whenever the plan names one.

To type into a field: `qadb tapon <testID or label>`, then `qadb type "…"`.
`qadb type` doesn't clear the field; `qadb clearfield` empties the focused one.
`qadb type` reads the field back afterwards:
- **`TYPE_MISMATCH`**: what landed isn't what you typed. **Never submit it.**
  `qadb clearfield`, type again, and note it under Other observations.
- `not checked (password field)` or `(UI tree unavailable)`: look at the next capture.

**Requests you didn't intend.** If the server log shows a request the plan didn't ask
for (an extra sign-up, a booking, a cancel), report it in the step where it happened,
with the log line. Hiding one is worse than causing one.

**`UI tree unavailable`** happens on screens that never stop moving (the email-code
screen's blinking cursor, animated feeds). Then `visible text` is empty and the
screenshot is the only on-screen evidence. **Do not write screen text you can't
see.** Look at `screen.png`, say what it shows in your own words, and lean on the
server and db checks. Taps there need the testIDs from an earlier capture or, as a
last resort, `qadb tap X Y` (say so).

**The developer menu** (`Connected to:`, `Performance monitor`, `Reload`) can pop up
over the app, for example when the phone is moved. `qadb tapon Close --exact`, then
repeat the last action, and note it under Other observations. Anything typed while it
was open went nowhere.

## 7. Report

The first `qadb step` creates `qa/reports/<RUN>.md` from `qa/reports/TEMPLATE.md`; each
step adds its own section. Fill in the header, the summary table and each section as
you go, and add a section by hand for every step you did not run (verdict NOT RUN). Finish with `qadb end` and
`qa/bin/env-down`, and paste the output of `qadb end` at the bottom of the report.

Report each step. Don't add an overall verdict, certificate or "victory" summary: Claude
audits the run and decides what it shows.

Timing matters to Claude's audit: do not batch-capture steps at the end, and do not
reorder them. The journal records when each capture happened.
