#!/usr/bin/env bash
# Serves the staff workspace at admin.yasante.com as well as yasante.com: same backend, same
# certificate (expanded to cover the new name), no extra cost. Run once on the server
# after the DNS record `admin -> the same IP as yasante.com` exists. Safe to run again.
set -euo pipefail

HOST=admin.yasante.com
CONF=/etc/nginx/conf.d/yasante.conf
ENV=/srv/yasante/backend/.env
IP=$(curl -s https://checkip.amazonaws.com)

# 1. The name has to point here first, or the certificate can't be issued.
if [ "$(getent hosts "$HOST" | awk '{print $1}' | head -1)" != "$IP" ]; then
  echo "$HOST doesn't point at this server ($IP) yet. Add the DNS record, wait a few minutes, then run this again."
  exit 1
fi

# 2. nginx answers to the new name and forwards the actual client IP to gunicorn.
sudo cp "$CONF" "$CONF.bak"
if ! sudo python3 - "$CONF" "$HOST" <<'PY'
import re
import sys
from pathlib import Path

conf = Path(sys.argv[1])
host = sys.argv[2]
text = conf.read_text()

def names(match):
    names = match[2].split()
    if "yasante.com" in names and host not in names:
        names.append(host)
    return match[1] + " ".join(names) + ";"

text = re.sub(r"(server_name\s+)([^;]+);", names, text)
found = False

def proxy_headers(match):
    global found
    body = match[2]
    if not re.search(r"\bproxy_pass\s", body):
        return match[0]
    found = True
    for name, value in [("X-Forwarded-For", "$proxy_add_x_forwarded_for"), ("X-Real-IP", "$remote_addr")]:
        if not re.search(r"\bproxy_set_header\s+" + re.escape(name) + r"\s", body):
            body += f"\n    proxy_set_header {name} {value};\n"
    return match[1] + body + match[3]

text = re.sub(r"(location\s+/\s*\{)([^{}]*)(\})", proxy_headers, text)
if not found:
    raise SystemExit("No gunicorn proxy location / found; nginx config left unchanged.")
conf.write_text(text)
PY
then
  sudo cp "$CONF.bak" "$CONF"; echo "Couldn't update nginx; put back."; exit 1
fi
if ! sudo nginx -t; then sudo cp "$CONF.bak" "$CONF"; echo "nginx didn't accept the change; put back."; exit 1; fi
sudo systemctl reload nginx

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
for setting in "STAFF_HOST=$HOST" "CSRF_TRUSTED_ORIGINS=https://$HOST"; do
  key=${setting%%=*}
  if sudo grep -q "^$key=" "$ENV"; then
    sudo sed -i "s#^$key=.*#$setting#" "$ENV"
  else
    echo "$setting" | sudo tee -a "$ENV" >/dev/null
  fi
done

sudo systemctl restart yasante-web
sleep 3
code=$(curl -s -o /dev/null -w '%{http_code}' "https://$HOST/data/session/")
echo "https://$HOST answers: $code (200 means it's working)"
