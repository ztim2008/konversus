#!/usr/bin/env bash
# Утренняя волна сбора Лид-радар (~06:00 МСК = 03:00 UTC)
# Бьём в Node напрямую (127.0.0.1:3010) — без nginx 504.
# Crontab:
#   0 3 * * * /var/www/www-root/data/www/konversus.ru/scripts/cron-lead-radar-nightly.sh >> /var/log/lead-radar-nightly.log 2>&1
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
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] nightly collect → ${URL}"
curl -sS -m 1800 -X POST "$URL" \
  -H "Host: konversus.ru" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"maxRounds":8}'
echo
