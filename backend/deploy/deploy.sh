#!/usr/bin/env bash
# Runs on the server: bash deploy.sh /tmp/backend.tgz
# Swaps in the new code, keeping the server's own .env, venv and uploads, then
# installs, migrates, restarts and checks the API answers. If it doesn't, the
# previous code goes back. (Migrations aren't undone: keep them backwards-compatible.)
set -euo pipefail

APP=/srv/yasante/backend
PREV=/srv/yasante/previous.tar
TARBALL=$1
KEEP=(venv .env mediafiles staticfiles)
export DJANGO_SETTINGS_MODULE=config.settings.production

keep_args=()
for k in "${KEEP[@]}"; do keep_args+=(! -name "$k"); done

replace_code() {
  find "$APP" -mindepth 1 -maxdepth 1 "${keep_args[@]}" -exec rm -rf {} +
  tar -xf "$1" -C "$APP"
}

healthy() {
  for _ in $(seq 1 20); do
    code=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: yasante.com' \
      -H 'X-Forwarded-Proto: https' http://127.0.0.1:8000/api/styles/ || true)
    [ "$code" = 200 ] && return 0
    sleep 2
  done
  return 1
}

echo "Keeping the running code for rollback"
tar -cf "$PREV" -C "$APP" --exclude=./venv --exclude=./.env --exclude=./mediafiles --exclude=./staticfiles .

# Chained with &&, not left to set -e: bash ignores set -e inside a function run as
# an `if` condition, and a failed step must lead to the rollback, not stop short of it.
start() {
  venv/bin/pip install -q -r requirements.txt &&
    venv/bin/python manage.py migrate --noinput &&
    venv/bin/python manage.py collectstatic --noinput -v 0 &&
    sudo systemctl restart yasante-web yasante-worker yasante-beat
}

echo "Installing the new code"
replace_code "$TARBALL"
cd "$APP"
if start && healthy; then
  echo "Deployed: the API is answering"
  rm -f "$TARBALL"
  exit 0
fi

echo "The new version failed; restoring the previous code" >&2
replace_code "$PREV"
venv/bin/pip install -q -r requirements.txt || true
sudo systemctl restart yasante-web yasante-worker yasante-beat
if healthy; then
  echo "Rolled back; the previous version is running" >&2
else
  echo "Rollback didn't come up either: check journalctl -u yasante-web" >&2
fi
exit 1
