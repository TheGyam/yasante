#!/usr/bin/env bash
# Serves the API at api.yasante.com as well as yasante.com: same backend, same
# certificate (expanded to cover the new name), no extra cost. Run once on the server
# after the DNS record `api -> 13.49.44.212` exists. Safe to run again.
set -euo pipefail

HOST=api.yasante.com
CONF=/etc/nginx/conf.d/yasante.conf
ENV=/srv/yasante/backend/.env
IP=$(curl -s https://checkip.amazonaws.com)

# 1. The name has to point here first, or the certificate can't be issued.
if [ "$(getent hosts "$HOST" | awk '{print $1}' | head -1)" != "$IP" ]; then
  echo "$HOST doesn't point at this server ($IP) yet. Add the DNS record, wait a few minutes, then run this again."
  exit 1
fi

# 2. nginx answers to the new name wherever it answers to yasante.com.
if ! grep -q "$HOST" "$CONF"; then
  sudo cp "$CONF" "$CONF.bak"
  sudo sed -i "s#^\(\s*server_name\s[^;]*yasante\.com\)\([^;]*\);#\1\2 $HOST;#" "$CONF"
  if ! sudo nginx -t; then sudo cp "$CONF.bak" "$CONF"; echo "nginx didn't accept the change; put back."; exit 1; fi
  sudo systemctl reload nginx
fi

# 3. The certificate covers it (certbot keeps the existing names and adds this one).
NAMES=$(sudo certbot certificates 2>/dev/null | awk '/Domains:/{for(i=2;i<=NF;i++)printf "-d %s ",$i; exit}')
if ! echo "$NAMES" | grep -q "$HOST"; then
  sudo certbot --nginx --expand $NAMES -d "$HOST" --non-interactive --redirect
fi

# 4. Django accepts the name, and photo links stay on yasante.com whichever name is used.
current=$(sudo grep -E '^ALLOWED_HOSTS=' "$ENV" | cut -d= -f2- || true)
if ! echo "$current" | grep -q "$HOST"; then
  if [ -n "$current" ]; then
    sudo sed -i "s#^ALLOWED_HOSTS=.*#ALLOWED_HOSTS=$current,$HOST#" "$ENV"
  else
    echo "ALLOWED_HOSTS=yasante.com,www.yasante.com,$HOST" | sudo tee -a "$ENV" >/dev/null
  fi
fi
sudo grep -q '^PUBLIC_BASE_URL=' "$ENV" || echo 'PUBLIC_BASE_URL=https://yasante.com' | sudo tee -a "$ENV" >/dev/null

sudo systemctl restart yasante-web
sleep 3
code=$(curl -s -o /dev/null -w '%{http_code}' "https://$HOST/api/policies/privacy/")
echo "https://$HOST answers: $code (200 means it's working)"
