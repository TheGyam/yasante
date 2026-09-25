# Deploying the backend

Pushing to `master` with changes under `backend/` runs **CI** (app types, lint and tests,
plus backend tests against Postgres) and, only if that passes, **deploys** to
https://yasante.com (`.github/workflows/deploy.yml`). It can also be run by hand:
Actions → Deploy backend → Run workflow.

A deploy copies the backend to the server and runs `deploy.sh` there, which:

1. keeps the running code for rollback,
2. swaps in the new code (the server's `.env`, `venv`, uploads and static files stay),
3. installs requirements, migrates, collects static files, restarts the three services,
4. checks the API answers, and if any step fails, puts the previous code back.

Migrations are not undone on rollback, so keep them backwards-compatible (add columns
before code uses them; drop them a release after code stops).

## One-time setup (done)

- The `DEPLOY_SSH_KEY` repository secret holds a key made only for GitHub
  (`~/.ssh/github_deploy` on the server; its public half is in `authorized_keys`).
- Optional: Settings → Environments → `production` → Required reviewers, so each
  deploy waits for a click.
- Optional: Settings → Branches → protect `master` and require the **CI** checks, so
  nothing reaches it (or the server) without passing.

## Revoking

Remove the line containing `github-actions-deploy` from
`~/.ssh/authorized_keys` on the server, and delete the `DEPLOY_SSH_KEY` secret.

## Server layout

- Code: `/srv/yasante/backend` (settings in its `.env`, not in git)
- Services: `yasante-web` (gunicorn), `yasante-worker`, `yasante-beat` (celery), behind nginx
- Logs: `sudo journalctl -u yasante-web -f`
- The host key GitHub trusts is pinned in `.github/deploy_known_hosts`; update it if
  the server is rebuilt.

## The API's own address

The app talks to `https://api.yasante.com`; the website stays at `yasante.com`. Both are
the same server and backend. Setting it up takes one DNS record and one script:

1. In IONOS → Domains & SSL → yasante.com → DNS, add an **A** record: host `api`, points
   to `13.49.44.212`.
2. Once it resolves (usually a few minutes), run `bash deploy/api-host.sh` on the server.
   It adds the name to nginx and the HTTPS certificate, allows it in Django, and keeps
   photo links on yasante.com.

yasante.com keeps answering API calls too, so builds made before the switch carry on.
