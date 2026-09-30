# Deploying the backend

Pushing to `master` with changes under `backend/` or `web/` runs **CI** (app and website types, lint and tests,
plus backend tests against Postgres) and, only if that passes, **deploys** to
https://yasante.com (`.github/workflows/deploy.yml`). It can also be run by hand:
Actions â†’ Deploy backend and website â†’ Run workflow.

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
- Optional: Settings â†’ Environments â†’ `production` â†’ Required reviewers, so each
  deploy waits for a click.
- Optional: Settings â†’ Branches â†’ protect `master` and require the **CI** checks, so
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

1. In IONOS â†’ Domains & SSL â†’ yasante.com â†’ DNS, add an **A** record: host `api`, points
   to `13.49.44.212`.
2. Once it resolves (usually a few minutes), run `bash deploy/api-host.sh` on the server.
   It adds the name to nginx and the HTTPS certificate, allows it in Django, and keeps
   photo links on yasante.com.

yasante.com keeps answering API calls too, so builds made before the switch carry on.

## Staff host

Create a DNS A record for **admin.yasante.com** pointing to the same server IP as yasante.com.
After DNS propagates, run `bash deploy/admin-host.sh` on that server. The script is idempotent:
it adds the name to the existing nginx site and certificate, appends ALLOWED_HOSTS, sets
STAFF_HOST and CSRF_TRUSTED_ORIGINS, reloads nginx and restarts yasante-web. No additional service
is needed. This script has not been run as part of development.

The public and staff entries are packaged together under static/site; the staff HTML loads only
staff.html's manifest entry. Staff sessions last eight hours and cookies have no Domain attribute.
All staff users must enroll TOTP. Secrets are encrypted using the already-installed cryptography
library and SECRET_KEY; keep SECRET_KEY stable (or retain previous keys in SECRET_KEY_FALLBACKS).
Recovery codes are hashed and usable once. Server operators with superuser authorization can use
`python manage.py reset_staff_2fa <email>` after verifying the account owner's identity.
The unlinked `/django-admin/` requires the same verified second factor as the workspace;
its login redirects to the workspace. The break-glass path is the server shell:
`python manage.py reset_staff_2fa <email>` and `python manage.py changepassword <email>`,
after verifying the account owner's identity. The nginx proxy forwards client IPs for
staff throttling and audit logs; forwarded headers are trusted only from loopback.
