# konversus.ru — правила для агента

**Один экран.** Детали — в `docs/`.  
**Кодекс (внешний):** [proektmap.ru/agent-engineering/rules](https://proektmap.ru/agent-engineering/rules)  
**Каркас:** [HARNESS](docs/guides/HARNESS.md) · [LOOP](docs/guides/LOOP.md) · [GRAPH](docs/guides/GRAPH.md)  
**ТЗ Лид-радар Auto:** [LEAD-RADAR-AUTO-TZ.md](docs/LEAD-RADAR-AUTO-TZ.md)

## Источник правды (порядок)

1. [docs/CURRENT_CONTEXT.md](docs/CURRENT_CONTEXT.md)  
2. [`graph/system.graph.json`](graph/system.graph.json) — путь задачи (`taskPaths`)  
3. [docs/LEAD-RADAR-AUTO-TZ.md](docs/LEAD-RADAR-AUTO-TZ.md) — этапы 🟦🟨🟩  
4. [docs/LEAD-RADAR.md](docs/LEAD-RADAR.md) — текущая реализация радара  
5. Код: `src/lib/`, `src/app/api/`, `src/app/dashboard/secret-shopper/`

## Язык

Продукт для **России**. UI админки, КП, Telegram, docs — **на русском**.  
Machine IDs, код, env keys — EN.

## Бренд исходящих писем

Клиенту в письме и CTA — **lead-web.pro**, не Konversus.

## Можно

- Задачи по `graph.taskPaths` + инкремент (правка → `npm run harness:check`).  
- Развивать Лид-радар Auto строго по этапам ТЗ.  
- Обновлять статусы 🟦🟨🟩 в ТЗ и `CURRENT_CONTEXT` после DoD.  
- Писать `docs/devlog/YYYY-MM.md`.

## Нельзя

- Автоотправка писем без ручной кнопки (пока ТЗ так фиксирует).  
- Статьи/агрегаторы/соцсети как лиды.  
- Обходить ERROR `harness:check`.  
- Self-rewrite (`AGENTS.md`, `.cursor/rules/*`, schema Graph, scripts harness/loop) без явного «разрешаю self-rewrite».  
- Коммитить секреты, `.env`, бинарники скриншотов пачками.  
- Выдумывать факты — спросить или `[уточнить: …]`.  
- Коммит без запроса владельца.

## Scaffold

| Задача | Куда |
|--------|------|
| Harness / Loop / Graph | [guides/HARNESS.md](docs/guides/HARNESS.md) · [LOOP](docs/guides/LOOP.md) · [GRAPH](docs/guides/GRAPH.md) |
| ТЗ Auto (этапы) | [LEAD-RADAR-AUTO-TZ.md](docs/LEAD-RADAR-AUTO-TZ.md) |
| Текущий радар | [LEAD-RADAR.md](docs/LEAD-RADAR.md) |
| Журнал | [docs/devlog/](docs/devlog/) |

## Start-of-day

1. CURRENT_CONTEXT + статусы в LEAD-RADAR-AUTO-TZ.  
2. Последняя запись devlog.  
3. `npm run agent:loop -- --task <имя>` (или `npm run harness:check`).

## End-of-day

1. CURRENT_CONTEXT.  
2. Секция в `docs/devlog/YYYY-MM.md`.  
3. Статусы этапов в ТЗ.  
4. Коммит **по запросу** владельца.

## Команды

```bash
npm run harness:check
npm run agent:loop -- --task lead_radar_queue
npm run build
# pm2 restart — имя процесса уточнять на сервере (часто konversus-fpb)
```

## Формула дня радара

`УТРО = ПЛАН · ДЕНЬ = РУЧНАЯ ОТПРАВКА · ВЕЧЕР = ФАКТ`
