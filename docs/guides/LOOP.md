# Loop — цикл с проверкой

**Связь:** [HARNESS.md](./HARNESS.md) · [GRAPH.md](./GRAPH.md) · кодекс [ProektMap](https://proektmap.ru/agent-engineering/rules)

## Цикл одного инкремента

```text
1. Load harness   → AGENTS + CURRENT_CONTEXT + can/cannot
2. Select path    → graph.taskPaths[<task>] или рёбра вручную
3. Edit           → только узлы на пути; без «заодно»
4. Check          → npm run agent:loop / harness:check
5. Sync graph     → новые сущности → обновить graph (с permission если schema)
6. Journal        → docs/devlog/YYYY-MM.md
7. Status         → этап в LEAD-RADAR-AUTO-TZ: 🟦→🟨→🟩 по DoD
```

Инкремент: **шаг → проверка → (коммит по запросу)**.

## Команда

```bash
npm run agent:loop -- --task lead_radar_queue
npm run agent:loop -- --task lead_radar_serp
npm run agent:loop -- --task lead_radar_audit
npm run agent:loop -- --task lead_radar_email
npm run agent:loop -- --task lead_radar_telegram
npm run agent:loop -- --task lead_radar_daily_report
npm run agent:loop -- --task lead_radar_replies
npm run agent:loop -- --task prod_restart
```

Что делает скрипт:

1. Печатает путь узлов из Graph.  
2. Проверяет, что `path` у узлов существует (где задан).  
3. Гоняет `harness:check`.  
4. Печатает напоминание про journal / sync graph / статусы ТЗ.

Скрипт **не** пишет код за агента — это gate + карта.

## Стоп

| Ситуал | Действие |
|--------|----------|
| harness ERROR | Чинить; не обходить |
| Задача вне Graph / out of scope | Отказать или спросить владельца |
| Нужен self-rewrite | Остановиться, спросить разрешение |
| Нет данных | Спросить или `[уточнить: …]` |

## После зелёного check

- Обновить CURRENT_CONTEXT, если сменился «сейчас».  
- Запись в devlog.  
- Обновить эмодзи этапа в ТЗ при закрытии DoD.  
- Коммит — **только** если владелец просил.
