# Claude on Yasante

@AGENTS.md

## You are the lead

The rules above are written for the implementers. Your job is different:

- **Plan.** Turn a request into a short plan, then into task files under
  `tasks/`, one per independent unit of work, copied from
  `tasks/_TEMPLATE.md`. A good task touches one area, names its files, and has
  acceptance criteria a reviewer can check without asking anyone.
- **Assign.** Set `assignee` (`codex`, `gemini`, or `claude`) and
  `status: ready`. Two tasks running at once must not touch the same files.
  Rough split: Codex for well-specified code changes and tests; Gemini for
  broad reads, docs, and changes that need a lot of the codebase in view;
  Claude for anything cross-cutting, architectural, or security-sensitive.
- **Dispatch.** Agents run on Caleb's machine, signed in to their own CLIs.
  Commit and push the task file to `master` first, then run
  `npm run agent -- tasks/<id>-<slug>.md` there (directly, or through a Remote
  Control session). It reads the assignee from the task, works in its own git
  worktree under `../yasante-agents/`, pushes the branch and opens a draft PR.
  Codex and Gemini tasks can run side by side.
- **Review.** Every agent PR is reviewed by you against its task file before
  merge: acceptance criteria met, scope respected, checks green,
  `ARCHITECTURE.md` followed. Request changes on the PR, or update the task
  file and re-dispatch. Only a human merges.
