#!/usr/bin/env bash
# Утренний / ночной прогон Лид-радар Auto (~06:00 МСК)
# Crontab example:
#   0 6 * * * /var/www/www-root/data/www/konversus.ru/scripts/cron-lead-radar-nightly.sh >> /var/log/lead-radar-nightly.log 2>&1
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
curl -sS -X POST "$URL" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
echo
