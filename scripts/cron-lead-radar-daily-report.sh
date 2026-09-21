#!/usr/bin/env bash
# Вечерний факт Лид-радар Auto (~21:00 МСК = 18:00 UTC)
# Crontab:
#   0 18 * * * .../cron-lead-radar-daily-report.sh >> /var/log/lead-radar-daily.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
if [[ -f "$ROOT/.env.local" ]]; then set -a; source "$ROOT/.env.local"; set +a; fi
SECRET="${LEAD_RADAR_CRON_SECRET:-${CRON_SECRET:-}}"
PORT="${PORT:-3010}"
URL="http://127.0.0.1:${PORT}/api/lead-radar/daily-report"
if [[ -z "$SECRET" ]]; then
  echo "LEAD_RADAR_CRON_SECRET not set" >&2
  exit 1
fi
curl -sS -m 120 -X POST "$URL" \
  -H "Host: konversus.ru" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
echo
