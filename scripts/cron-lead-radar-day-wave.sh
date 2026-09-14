#!/usr/bin/env bash
# Дневной добор очереди до лимита (12:00 МСК = 09:00 UTC)
# Crontab:
#   0 9 * * * /var/www/www-root/data/www/konversus.ru/scripts/cron-lead-radar-day-wave.sh >> /var/log/lead-radar-day-wave.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
if [[ -f "$ROOT/.env.local" ]]; then set -a; source "$ROOT/.env.local"; set +a; fi
SECRET="${LEAD_RADAR_CRON_SECRET:-${CRON_SECRET:-}}"
BASE="${NEXT_PUBLIC_BASE_URL:-https://konversus.ru}"
URL="${BASE}/api/lead-radar/nightly-run"
if [[ -z "$SECRET" ]]; then
  echo "LEAD_RADAR_CRON_SECRET not set" >&2
  exit 1
fi
# skipTelegram: добор без полного утреннего дайджеста
curl -sS -X POST "$URL" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"skipTelegram":true}'
echo
