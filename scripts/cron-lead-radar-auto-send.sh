#!/usr/bin/env bash
# Автоотправка Лид-радар: 1 письмо каждые 15 мин в окне МСК 09–18
# (на сервере UTC: 06–15 → */15 6-15 * * *)
# Crontab:
#   */15 6-15 * * * /var/www/www-root/data/www/konversus.ru/scripts/cron-lead-radar-auto-send.sh >> /var/log/lead-radar-auto-send.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
if [[ -f "$ROOT/.env.local" ]]; then set -a; source "$ROOT/.env.local"; set +a; fi
SECRET="${LEAD_RADAR_CRON_SECRET:-${CRON_SECRET:-}}"
BASE="${NEXT_PUBLIC_BASE_URL:-https://konversus.ru}"
URL="${BASE}/api/lead-radar/auto-send"
if [[ -z "$SECRET" ]]; then
  echo "LEAD_RADAR_CRON_SECRET not set" >&2
  exit 1
fi
curl -sS -X POST "$URL" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"perRun":1}'
echo
