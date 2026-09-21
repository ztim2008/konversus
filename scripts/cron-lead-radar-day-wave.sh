#!/usr/bin/env bash
# Дневной добор очереди до бюджета sent (МСК 10 / 13 / 16 = UTC 07 / 10 / 13)
# Без утреннего дайджеста. Node напрямую — без nginx 504.
# Crontab:
#   0 7,10,13 * * * .../cron-lead-radar-day-wave.sh >> /var/log/lead-radar-day-wave.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
if [[ -f "$ROOT/.env.local" ]]; then set -a; source "$ROOT/.env.local"; set +a; fi
SECRET="${LEAD_RADAR_CRON_SECRET:-${CRON_SECRET:-}}"
PORT="${PORT:-3010}"
URL="http://127.0.0.1:${PORT}/api/lead-radar/nightly-run"
if [[ -z "$SECRET" ]]; then
  echo "LEAD_RADAR_CRON_SECRET not set" >&2
  exit 1
fi
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] day-wave collect → ${URL}"
curl -sS -m 1800 -X POST "$URL" \
  -H "Host: konversus.ru" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"skipTelegram":true,"maxRounds":8}'
echo
