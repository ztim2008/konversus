#!/usr/bin/env bash
# SEO-позиции: суточная проверка (04:00 UTC = 09:00 Ташкент = 07:00 МСК)
# Crontab:
#   0 4 * * * .../cron-seo-positions-daily.sh >> /var/log/seo-positions-daily.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
if [[ -f "$ROOT/.env.local" ]]; then set -a; source "$ROOT/.env.local"; set +a; fi
SECRET="${LEAD_RADAR_CRON_SECRET:-${CRON_SECRET:-}}"
PORT="${PORT:-3010}"
URL="http://127.0.0.1:${PORT}/api/seo-positions/daily"
if [[ -z "$SECRET" ]]; then
  echo "LEAD_RADAR_CRON_SECRET not set" >&2
  exit 1
fi
echo "[$(date -u +%FT%TZ)]"
curl -sS -m 900 -X POST "$URL" \
  -H "Host: konversus.ru" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
echo
