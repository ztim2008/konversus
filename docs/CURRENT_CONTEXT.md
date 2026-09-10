# CURRENT_CONTEXT — срез «сейчас»

**Обновлено:** 2026-09-10  
**Активный трек:** Лид-радар Auto

## Сейчас

| Этап | Статус |
|------|--------|
| 0–5 | 🟩 |
| 6 | 🟦 Админка «Сегодня» — ручная отправка |

## Nightly

- `POST /api/lead-radar/nightly-run` + `LEAD_RADAR_CRON_SECRET`
- Cron: `scripts/cron-lead-radar-nightly.sh` (06:00 МСК)
- Проверка: 1 лид `prorabneva.ru` в `queued` + TG ok

## Фокус

Этап 6 — UI очереди Отправить / Пропустить.

```bash
npm run agent:loop -- --task lead_radar_queue
```
