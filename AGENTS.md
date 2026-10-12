# Working on Yasante as an agent

This file is read by every coding agent on this repo: Codex reads it directly,
Gemini (Antigravity CLI, or Gemini CLI) reads it through `GEMINI.md`, and
Claude (Opus, Sonnet, Haiku) reads it through `CLAUDE.md`.

## The team

| Agent      | Model                            | Role on Yasante                                                                                                                                                                                            |
| ---------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Opus**   | Claude Opus 5.5                  | **Lead.** Plans, writes and assigns tasks, instructs, reviews, approves and merges every PR. Takes security- and privacy-sensitive work itself (auth, payments, consent, personal data). Reports to Caleb. |
| **Codex**  | GPT-6 (Codex CLI, high effort)   | **Backend and tests.** Django apps, models, migrations and endpoints with their pytest tests; regenerating `openapi.yaml` and the typed clients; well-scoped fixes that need a lot of terminal work.       |
| **Gemini** | Gemini 3.1 Pro (Antigravity CLI) | **Website, UI and wide reads.** The `web/` site, visual and layout work on screens, docs, and audits that need much of the codebase in view at once. Single-pass tasks; not long debugging loops.          |
| **Sonnet** | Claude Sonnet 5.5                | **App features.** Expo / React Native work in `src/features/` and `app/`: new screens, hooks, state, and bug fixes in the app, following `ARCHITECTURE.md`.                                                |
| **Haiku**  | Claude Haiku 5.5                 | **Support.** Small, bounded chores: lint and format fixes, renames, copy changes, test fixtures, triaging a CI failure into a short report. Never multi-step feature work.                                 |

**Reporting line:** Codex, Gemini, Sonnet and Haiku report to Opus, through
their task file and pull request. Opus reports to Caleb, and merges what it
approves once CI is green.

## If you are an implementer (Codex, Gemini, Sonnet or Haiku)

1. You were given one task file, `tasks/<id>-<slug>.md`. Read it in full before
   touching code. That file is your whole brief.
2. Check its front matter: `assignee` must name you and `status` must be
   `ready`. If not, stop and say so.
3. Work only on the branch the task names (`agent/<you>/<id>-<slug>`), and only
   in the files and areas its **Scope** allows. Do not refactor, rename, or
   "improve" anything outside it, even if it looks wrong. Mention it in your
   report instead.
4. Meet every item under **Acceptance criteria**, and run every command under
   **Checks**. All of them must pass.
5. When finished, set `status: review` in the task file and fill in **Report to
   the lead**: what you changed, each check you ran with its result, what you
   were unsure of, and anything you skipped and why. Commit it with your work.
   Report only what you actually did and saw: a check you didn't run is "not
   run", never "passed".
6. If the task is ambiguous, contradicts this file or `ARCHITECTURE.md`, or
   cannot be done within its scope: set `status: blocked`, write the question
   in **Report to the lead**, commit, and stop. Do not guess.
7. If Opus sends you back with review comments, fix every blocking item within
   the same scope, update your report, and keep `status: review`.

Never: push to `master`, merge or approve a PR, edit another agent's task file,
change `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` / `ARCHITECTURE.md`, add a
dependency the task doesn't name, skip or weaken a test, or commit secrets.

## The codebase

Read `ARCHITECTURE.md` before writing code. It is short and its rules are
enforced in review. In brief:

- `app/` is the Expo Router app (routes only, kept thin). `src/features/<name>/`
  holds each domain; other features import only from its `index.ts`.
  `src/shared/` is cross-cutting and domain-free.
- `web/` is the website (React + Vite), with its own `package.json`.
- `backend/` is Django. `openapi.yaml` is generated from it.

## Checks (what CI runs)

App, from the repo root:

```
npm ci
npx tsc --noEmit
npm run lint
npx jest --ci
npm run api:types && git diff --exit-code src/shared/lib/api/schema.d.ts
```

Website, from `web/`:

```
npm ci && npx tsc --noEmit && npm run lint && npm test && npx vite build
```

Backend, from `backend/` (needs Postgres; see `docker-compose.yml`):

```
pip install -r requirements-dev.txt
DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run
python -m pytest -q -p no:cacheprovider --create-db
```

If you change the backend API, regenerate `openapi.yaml`
(`python manage.py spectacular --file ../openapi.yaml`) and then the typed
clients (`npm run api:types` in the root and in `web/`). Never edit
`schema.d.ts` by hand.

## Commits

Conventional style, matching the history: `feat(diary): ...`, `fix(web): ...`.
Say what changes for the person using the app, in plain words.
