# QA executor rules — read all of this before running any plan

You are executing a manual test plan for the Yasante Android app on **the owner's
personal phone**. Claude wrote the plan and will audit your run afterwards against the
raw evidence on disk. Your job is to follow the plan exactly and report what actually
happened, nothing more.

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
| `grep`/`tail` on `qa/runs/<RUN>/server.log` | the server's view of each request |
| `qa/bin/env-down` | stop everything at the end |

Nothing else: no editing app or backend code, no `manage.py` commands of your own, no
database edits, no git commands.

## 4. Evidence: no capture, no verdict

- Every numbered step in a plan ends with `qadb step <STEP-ID>`. That writes
  `screen.png`, `ui.xml` (the app's UI tree), `visible.txt` and `app.log`, hashes them
  into `qa/runs/<RUN>/journal.jsonl`, and prints a summary.
- **Paste that printed summary verbatim into your report** under the step. Do not
  shorten, reword or "clean up" it. Claude compares it byte for byte with
  `visible.txt` and the journal.
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

To type into a field: `qadb tapon "<field label or placeholder>"`, then `qadb type "…"`.
`qadb type` does not clear a field. To clear one, `qadb key DEL` repeatedly, or clear
the app data where the plan says so.

## 7. Report

Write `qa/reports/<RUN>.md` from `qa/reports/TEMPLATE.md`. Fill in every step of the
plan in order, including the ones you did not run. Finish with `qadb end` and
`qa/bin/env-down`, and paste the output of `qadb end` at the bottom of the report.

Timing matters to Claude's audit: do not batch-capture steps at the end, and do not
reorder them. The journal records when each capture happened.
