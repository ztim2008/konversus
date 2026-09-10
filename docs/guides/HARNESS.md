# Harness — каркас вокруг модели

**Для кого:** агент (Cursor) в konversus.ru / Лид-радар Auto.  
**Кодекс (внешний):** [Правила разработки с AI-агентами — ProektMap](https://proektmap.ru/agent-engineering/rules)  
**ТЗ:** [LEAD-RADAR-AUTO-TZ.md](../LEAD-RADAR-AUTO-TZ.md)

## Зачем

Не «сделай красиво». Сначала закон проекта, потом правка, потом проверка.  
Harness = что читать, что нельзя, какие команды — **до** того как трогать код.

## Кодекс (адаптация ProektMap → konversus)

| # | Правило ProektMap | У нас |
|---|-------------------|--------|
| 1 | Сначала AGENTS.md | AGENTS → CURRENT_CONTEXT → Graph / ТЗ этапа |
| 2 | Одна линия истории в git | коммит по запросу владельца |
| 3 | Инкременты | Один шаг = правка по рёбрам + `harness:check` |
| 4 | Не выдумывай | Нет данных → спроси или `[уточнить: …]` |
| 5 | Scratch вне репо | Не коммитить скрины пачками, `.env`, секреты |
| 6 | Не разрушай данные | Не чистить прод / force без команды |
| 7 | Проверяй сам себя | `npm run harness:check` после шага; ERROR = стоп |

Фазы = **задача по Graph** (`lead_radar_*`), не новый SaaS с нуля.

## Порядок чтения (вход)

1. [AGENTS.md](../../AGENTS.md)  
2. [CURRENT_CONTEXT.md](../CURRENT_CONTEXT.md)  
3. [`graph/system.graph.json`](../../graph/system.graph.json) — `taskPaths`  
4. [LEAD-RADAR-AUTO-TZ.md](../LEAD-RADAR-AUTO-TZ.md) — текущий этап 🟨  
5. [LEAD-RADAR.md](../LEAD-RADAR.md) — если трогаем существующий радар

## Self-rewrite

Правка AGENTS, `.cursor/rules/*`, schema/типов Graph, scripts harness/loop — **только** после явного «разрешаю self-rewrite» от владельца.  
Факт дня (CURRENT_CONTEXT, devlog, статусы 🟦🟨🟩 в ТЗ) — можно без отдельного permission.

## Команда

```bash
npm run harness:check
```

ERROR gate красный → не пушить, чинить.
