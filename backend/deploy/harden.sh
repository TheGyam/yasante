#!/usr/bin/env bash
# One-off server setup that costs nothing extra: private media rules in nginx,
# daily local Postgres backups (7 kept), and automatic security updates.
# Safe to run again.
set -euo pipefail

CONF=/etc/nginx/conf.d/yasante.conf
if ! grep -q "location /protected/" "$CONF"; then
  sudo cp "$CONF" "$CONF.bak"
  sudo sed -i 's#^\(\s*\)location /media/  {#\1location /media/private/ { return 404; }\n\1location /protected/ { internal; alias /srv/yasante/backend/mediafiles/private/; }\n&#' "$CONF"
  if ! sudo nginx -t; then sudo cp "$CONF.bak" "$CONF"; exit 1; fi
  sudo systemctl reload nginx
fi

ENV=/srv/yasante/backend/.env
for kv in PRIVATE_MEDIA_ACCEL=True PUSH_DELIVERY=expo; do
  key=${kv%%=*}
  sudo grep -q "^$key=" "$ENV" && sudo sed -i "s#^$key=.*#$kv#" "$ENV" || echo "$kv" | sudo tee -a "$ENV" >/dev/null
done

# Backups: pg_dump as the postgres superuser, compressed, newest 7 kept.
sudo install -d -m 700 -o postgres -g postgres /var/backups/yasante
sudo tee /usr/local/bin/yasante-backup >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd /var/backups/yasante
pg_dump -Fc yasante > "yasante-$(date -u +%F).dump.tmp"
mv "yasante-$(date -u +%F).dump.tmp" "yasante-$(date -u +%F).dump"
ls -1t yasante-*.dump | tail -n +8 | xargs -r rm --
EOF
sudo chmod 755 /usr/local/bin/yasante-backup
sudo tee /etc/systemd/system/yasante-backup.service >/dev/null <<'EOF'
[Unit]
Description=Yasante Postgres backup
[Service]
Type=oneshot
User=postgres
ExecStart=/usr/local/bin/yasante-backup
EOF
sudo tee /etc/systemd/system/yasante-backup.timer >/dev/null <<'EOF'
[Unit]
Description=Daily Yasante Postgres backup
[Timer]
OnCalendar=*-*-* 03:30:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
EOF

# Security updates only, applied automatically.
rpm -q dnf-automatic >/dev/null || sudo dnf install -y -q dnf-automatic
sudo sed -i 's/^upgrade_type.*/upgrade_type = security/; s/^apply_updates.*/apply_updates = yes/' /etc/dnf/automatic.conf

sudo systemctl daemon-reload
sudo systemctl enable --now yasante-backup.timer dnf-automatic.timer
sudo systemctl start yasante-backup.service
sudo systemctl restart yasante-web yasante-worker yasante-beat
ls -la /var/backups/yasante
