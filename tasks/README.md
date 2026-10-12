# Tasks

One file per unit of work, written by Opus (the lead) from
`_TEMPLATE.md`, named `<id>-<slug>.md`, e.g. `012-diary-repeat-badge.md`.

Lifecycle, tracked in each file's `status`:

```
draft -> ready -> in-progress -> review -> done
                       \-> blocked (question in the report; Opus answers, sets ready)
```

- Opus (the lead) writes the task, sets `assignee` and `status: ready`, commits to `master`.
- `npm run agent -- tasks/<id>-<slug>.md` hands it to the assignee, which works
  on `agent/<assignee>/<id>-<slug>` and sets `status: review`; the script pushes
  the branch and opens a draft PR titled `[<id>] <title>`.
- Opus reviews the PR against the task's acceptance criteria and comments on
  it. If changes are needed, `npm run agent -- tasks/<id>-<slug>.md --revise`
  sends the agent back to fix them on the same branch.
- When it's right, Opus comments "Approved by lead", sets the task to `done`,
  and merges it once CI is green.
