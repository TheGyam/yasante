# Tasks

One file per unit of work, written by Claude (the lead) from
`_TEMPLATE.md`, named `<id>-<slug>.md`, e.g. `012-diary-repeat-badge.md`.

Lifecycle, tracked in each file's `status`:

```
draft -> ready -> in-progress -> review -> done
                       \-> blocked (question in the file; Claude answers, sets ready)
```

- Claude writes the task, sets `assignee` and `status: ready`, commits to `master`.
- The assignee works on `agent/<assignee>/<id>-<slug>`, sets `status: review`,
  and opens a draft PR titled `[<id>] <title>`.
- Claude reviews the PR against the task's acceptance criteria. A human merges,
  and the task is set to `done` in that PR.
