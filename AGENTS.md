# Working on Yasante as an agent

This file is read by every coding agent on this repo: OpenAI Codex reads it
directly, Gemini CLI reads it through `GEMINI.md`, and Claude reads it through
`CLAUDE.md`.

## Who leads

**Claude is the lead.** Claude writes the plan, splits it into task files under
`tasks/`, assigns each one to an agent, and reviews every pull request before it
is merged. Codex and Gemini are implementers: they do the task they are given,
exactly as written, and nothing else.

If you are Codex or Gemini:

1. You were given one task file, `tasks/<id>-<slug>.md`. Read it in full before
   touching code. That file is your whole brief.
2. Check its front matter: `assignee` must name you and `status` must be
   `ready`. If not, stop and say so.
3. Work only on the branch the task names (`agent/<you>/<id>-<slug>`), and only
   in the files and areas its **Scope** allows. Do not refactor, rename, or
   "improve" anything outside it, even if it looks wrong. Note it under
   **Notes from the implementer** instead.
4. Meet every item under **Acceptance criteria**, and run every command under
   **Checks**. All of them must pass.
5. When finished, set `status: review` in the task file, fill in **Notes from
   the implementer** (what you changed, anything you were unsure of, anything
   you skipped and why), and commit that with your work.
6. If the task is ambiguous, contradicts this file or `ARCHITECTURE.md`, or
   cannot be done within its scope: set `status: blocked`, write the question
   under **Notes from the implementer**, commit, and stop. Do not guess.

Never: push to `master`, merge a PR, edit another agent's task file, change
`AGENTS.md` / `CLAUDE.md` / `GEMINI.md` / `ARCHITECTURE.md`, add a dependency
the task doesn't name, skip or weaken a test, or commit secrets.

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
