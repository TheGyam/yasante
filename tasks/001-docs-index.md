---
id: 001
slug: docs-index
assignee: gemini # codex | gemini | claude
status: ready # draft | ready | in-progress | review | blocked | done
branch: agent/gemini/001-docs-index
depends_on: []
---

# Turn docs/README.md into an accurate index of the docs folder

## Why

`docs/README.md` lists only 2 of the 11 files in `docs/`, points at a folder
that doesn't exist (`src/types/`), and tells readers to "contact the frontend
development team". Anyone (person or agent) opening `docs/` should be able to
tell in a minute which file to read and which ones are stale.

## Scope

Files this task may change:

- `docs/README.md`
- `tasks/001-docs-index.md` (front matter `status` and the implementer notes only)

Out of scope (do not touch):

- Every other file, including the other files in `docs/`. If one is wrong, say
  so in `docs/README.md` and in your notes; don't fix it.

## What to do

1. Read every file in `docs/`, plus `README.md`, `ARCHITECTURE.md` and the top
   of `openapi.yaml`, so you know what each doc covers and what the code
   actually does today.
2. Rewrite `docs/README.md` as an index: a one-paragraph intro, then one entry
   per file in `docs/` (all 11), each with a link and one or two sentences on
   what it covers and who it's for.
3. Mark any doc that disagrees with the code as **Out of date**, with one line
   saying what's wrong (e.g. an endpoint or field that no longer exists, a
   folder that moved). Only claim something is wrong if you checked it
   against the code; give the file you checked.
4. State that `openapi.yaml` (generated from the Django backend) is the source
   of truth for the API, and that the typed clients live in
   `src/shared/lib/api/` and `web/src/shared/lib/api/`.
5. Remove the broken `src/types/` pointer, the "contact the frontend team"
   line, and the emoji. Keep the "App information" facts (name, package,
   deep link scheme) if they're still right per `app.json`.

## Acceptance criteria

- [ ] `docs/README.md` links every file in `docs/`, and every link resolves.
- [ ] No path in `docs/README.md` points at something that doesn't exist.
- [ ] Each "Out of date" mark names what's wrong and the file it was checked against.
- [ ] No other file is changed besides this task file.
- [ ] `npx prettier@3 --check docs/README.md` passes.

## Checks

```
npx prettier@3 --check docs/README.md
git diff --name-only origin/master
```

The last command must list only `docs/README.md` and `tasks/001-docs-index.md`.
Don't run `npm ci`: this task changes no code, and the network may be slow.

## Notes from the implementer

_Filled in by the assignee: what changed, open questions, anything skipped._
