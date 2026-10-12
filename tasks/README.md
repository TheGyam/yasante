# Tasks

One file per unit of work, written by Claude (the lead) from
`_TEMPLATE.md`, named `<id>-<slug>.md`, e.g. `012-diary-repeat-badge.md`.

Lifecycle, tracked in each file's `status`:

```
draft -> ready -> in-progress -> review -> done
                       \-> blocked (question in the file; Claude answers, sets ready)
```

- Claude writes the task, sets `assignee` and `status: ready`, commits to `master`.
- `npm run agent -- tasks/<id>-<slug>.md` hands it to the assignee, which works
  on `agent/<assignee>/<id>-<slug>` and sets `status: review`; the script pushes
  the branch and opens a draft PR titled `[<id>] <title>`.
- Claude reviews the PR against the task's acceptance criteria and comments on
  it. If changes are needed, `npm run agent -- tasks/<id>-<slug>.md --revise`
  sends the agent back to fix them on the same branch.
- A human merges, and the task is set to `done` in that PR.
