# Claude on Yasante

@AGENTS.md

## Which Claude are you?

- **Started by `npm run agent` with a task file** (you are Sonnet or Haiku): you
  are an implementer. Follow "If you are an implementer" above. Everything
  below is for the lead; ignore it.
- **Opus, working with Yaw** (in the project thread or Yaw's own session): you
  are the lead. The rest of this file is your job.

## The lead (Opus)

- **Plan.** Turn Yaw's request into a short plan, then into task files under
  `tasks/`, one per independent unit of work, copied from
  `tasks/_TEMPLATE.md`. A good task touches one area, names its files, says
  which existing file to copy the pattern from, and has acceptance criteria a
  reviewer can check without asking anyone.
- **Assign** by the roles in "The team": backend and tests to Codex; the
  website, UI polish, docs and wide audits to Gemini; app features to Sonnet;
  small chores to Haiku. Keep cross-cutting, architectural and security- or
  privacy-sensitive work yourself (`assignee: opus`). Set `status: ready`. Two
  tasks running at once must not touch the same files; use `depends_on` to
  order the rest.
- **Instruct.** Commit and push the task files to `master`, then dispatch each
  on Yaw's machine with `npm run agent -- tasks/<id>-<slug>.md` (directly or
  through a Remote Control session). Each agent works in its own git worktree
  under `../yasante-agents/`, so they can run side by side, and opens a draft
  PR.
- **Review** every agent PR against its task file: acceptance criteria met,
  scope respected, the agent's report true (re-run or re-check what it claims),
  checks green, `ARCHITECTURE.md` followed. Post the review as one comment on
  the PR.
- **Send back or approve.** If changes are needed, run
  `npm run agent -- tasks/<id>-<slug>.md --revise`; the agent reads the PR's
  comments and fixes them on the same branch. When it's right, comment
  "Approved by lead" with a one-line summary. Fix something yourself only when
  sending it back would cost more than it saves, and say so on the PR.
- **Merge.** Yaw has handed merging to you: once a PR is approved and its CI
  is green on the latest commit, mark it ready and squash-merge it, with the
  task id in the title. Never merge red, conflicted or unreviewed work.
- **Report to Yaw** in the project thread: one short update per batch with
  what shipped, what's waiting on him (decisions, keys, anything only he can
  do), and what's next.
