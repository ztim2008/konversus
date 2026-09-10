#!/usr/bin/env bash
# Вечерний факт Лид-радар Auto (~21:00 МСК)
# Crontab example:
#   0 21 * * * /var/www/www-root/data/www/konversus.ru/scripts/cron-lead-radar-daily-report.sh >> /var/log/lead-radar-daily.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
if [[ -f "$ROOT/.env.local" ]]; then set -a; source "$ROOT/.env.local"; set +a; fi
SECRET="${LEAD_RADAR_CRON_SECRET:-${CRON_SECRET:-}}"
BASE="${NEXT_PUBLIC_BASE_URL:-https://konversus.ru}"
URL="${BASE}/api/lead-radar/daily-report"
if [[ -z "$SECRET" ]]; then
  echo "LEAD_RADAR_CRON_SECRET not set" >&2
  exit 1
fi
curl -sS -X POST "$URL" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
echo
