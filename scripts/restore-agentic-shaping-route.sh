#!/bin/sh
set -eu

source_config="/etc/caddy/Caddyfile"
temporary_config="$(mktemp)"
trap 'rm -f "$temporary_config"' EXIT

if [ "${1:-}" = "--install" ]; then
  cron_line='@reboot /home/dimohy/bin/restore-agentic-shaping-route.sh >> /home/dimohy/log/agentic-shaping-caddy.log 2>&1'
  current_crontab="$(mktemp)"
  trap 'rm -f "$temporary_config" "$current_crontab"' EXIT
  crontab -l 2>/dev/null > "$current_crontab" || true
  if ! grep -Fqx "$cron_line" "$current_crontab"; then
    printf '%s\n' "$cron_line" >> "$current_crontab"
    crontab "$current_crontab"
  fi
fi

sed 's#rewrite \* /vibe-compiler{uri}#rewrite * /agentic-shaping{uri}#' \
  "$source_config" > "$temporary_config"

if ! grep -Fq 'rewrite * /agentic-shaping{uri}' "$temporary_config"; then
  echo "Agentic Shaping route was not found in $source_config" >&2
  exit 1
fi

/usr/bin/caddy validate --config "$temporary_config" --adapter caddyfile

attempt=1
while [ "$attempt" -le 12 ]; do
  if /usr/bin/caddy reload --config "$temporary_config" --adapter caddyfile --force; then
    echo "Agentic Shaping route restored from $source_config"
    exit 0
  fi
  attempt=$((attempt + 1))
  sleep 5
done

echo "Caddy admin endpoint did not accept the Agentic Shaping route" >&2
exit 1
