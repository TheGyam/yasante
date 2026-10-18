---
id: 000
slug: short-kebab-name
assignee: codex # codex | gemini | sonnet | haiku | opus
status: draft # draft | ready | in-progress | review | blocked | done
branch: agent/codex/000-short-kebab-name
depends_on: [] # task ids that must be merged first
---

# <What changes, in one line>

## Why

One or two sentences on the user-facing reason. Link the plan or issue.

## Scope

Files and folders this task may change:

- `src/features/...`

Out of scope (do not touch):

- ...

## What to do

Numbered, concrete steps. Name functions, components, endpoints and fields.
Point at an existing file to copy the pattern from.

1. ...

## Acceptance criteria

Each one checkable by reading the diff or running a command.

- [ ] ...
- [ ] New behaviour is covered by a test in `...`

## Checks

Commands that must pass before `status: review` (pick from `AGENTS.md`):

```
npx tsc --noEmit
npm run lint
npx jest --ci
```

## Report to the lead

_Filled in by the assignee when it sets `status: review` or `blocked`._

- **Changed:**
- **Checks run:** (each command and its result; "not run" if you didn't)
- **Unsure about:**
- **Skipped, and why:**
- **Question for the lead:** (only if `blocked`)
