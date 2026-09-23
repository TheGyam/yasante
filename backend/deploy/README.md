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

## One-time setup (repo owner)

GitHub only lets the repository owner add secrets.

1. Copy the deploy key from the server:

   ```bash
   ssh ec2-user@13.49.44.212 cat ~/.ssh/github_deploy
   ```

2. GitHub → the repo → Settings → Secrets and variables → Actions → New repository
   secret. Name: `DEPLOY_SSH_KEY`. Value: the whole key, including the
   `-----BEGIN` and `-----END` lines.

3. Optional: Settings → Environments → `production` → Required reviewers, so each
   deploy waits for a click.

4. Optional: Settings → Branches → protect `master` and require the **CI** checks, so
   nothing reaches it (or the server) without passing.

After step 2 you can delete the copy on the server: `rm ~/.ssh/github_deploy`
(the public half stays in `authorized_keys`, which is what lets GitHub in).

## Revoking

Remove the line ending `github-actions-deploy (ElPrinceD/Kalon)` from
`~/.ssh/authorized_keys` on the server, and delete the `DEPLOY_SSH_KEY` secret.

## Server layout

- Code: `/srv/yasante/backend` (settings in its `.env`, not in git)
- Services: `yasante-web` (gunicorn), `yasante-worker`, `yasante-beat` (celery), behind nginx
- Logs: `sudo journalctl -u yasante-web -f`
- The host key GitHub trusts is pinned in `.github/deploy_known_hosts`; update it if
  the server is rebuilt.
