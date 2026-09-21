#!/usr/bin/env bash
# Капля сбора Лид-радар: ~2 КП (DeepSeek) каждые 30 мин · 06–18 МСК
# UTC: */30 3-15. Утренний дайджест только в 06:00 МСК (03:00 UTC).
# Crontab:
#   */30 3-15 * * * .../cron-lead-radar-collect-drip.sh >> /var/log/lead-radar-day-wave.log 2>&1
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

# 06:00 МСК = 03:00 UTC — единственный тик с Telegram-дайджестом
UTC_HM="$(date -u +%H%M)"
if [[ "$UTC_HM" == "0300" ]]; then
  BODY='{"maxRounds":1,"skipTelegram":false}'
  LABEL="morning"
else
  BODY='{"maxRounds":1,"skipTelegram":true}'
  LABEL="drip"
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] collect-${LABEL} → ${URL} ${BODY}"
curl -sS -m 900 -X POST "$URL" \
  -H "Host: konversus.ru" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d "$BODY"
echo
