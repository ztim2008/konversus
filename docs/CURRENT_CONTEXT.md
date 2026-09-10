# CURRENT_CONTEXT — срез «сейчас»

**Обновлено:** 2026-09-10  
**Активный трек:** Лид-радар Auto ([LEAD-RADAR-AUTO-TZ.md](./LEAD-RADAR-AUTO-TZ.md))

## Сейчас

| Этап | Статус |
|------|--------|
| 0 Harness · Loop · Graph | 🟩 |
| 1 Модель данных / очередь | 🟩 |
| 2 SERP + фильтр компаний | 🟩 |
| 3–9 | 🟦 → следующий **этап 3** (аудит + deep email + скрин) |

## SERP

- Провайдер: **Serper.dev** (`SERPER_API_KEY` в `.env.local`)
- API: `POST /api/secret-shopper/search-serp` `{ city, niche }`
- Playwright — не используем в MVP

## География v1

СПб (bootstrap) → ротация Мск / Омск / В. Новгород · 1 город/утро

## Фокус следующей сессии

Этап 3: аудит + глубокий email + скриншот + запись `platform`.

```bash
npm run agent:loop -- --task lead_radar_audit
```
