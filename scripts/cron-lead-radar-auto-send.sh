#!/usr/bin/env bash
# Автоотправка Лид-радар: cron каждые 15 мин в окне МСК 09–21
# (UTC: */15 6-18). Реальный темп 15 или 30 мин — из Рулетки (API сам ждёт).
# Crontab:
#   */15 6-18 * * * .../cron-lead-radar-auto-send.sh >> /var/log/lead-radar-auto-send.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
if [[ -f "$ROOT/.env.local" ]]; then set -a; source "$ROOT/.env.local"; set +a; fi
SECRET="${LEAD_RADAR_CRON_SECRET:-${CRON_SECRET:-}}"
PORT="${PORT:-3010}"
URL="http://127.0.0.1:${PORT}/api/lead-radar/auto-send"
if [[ -z "$SECRET" ]]; then
  echo "LEAD_RADAR_CRON_SECRET not set" >&2
  exit 1
fi
curl -sS -m 120 -X POST "$URL" \
  -H "Host: konversus.ru" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"perRun":1}'
echo
