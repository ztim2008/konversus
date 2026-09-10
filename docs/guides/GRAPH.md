# Graph — карта системы

**Файл:** [`graph/system.graph.json`](../../graph/system.graph.json)  
**ТЗ:** [LEAD-RADAR-AUTO-TZ.md](../LEAD-RADAR-AUTO-TZ.md)

## Идея

Работа не с плоским чатом, а с **графом сущностей и связей**.  
Агент читает карту → планирует по `taskPaths` → меняет код → обновляет граф.

## Узлы (`nodes`)

| type | Смысл |
|------|--------|
| `doc` | Документы / правила / ТЗ |
| `app` | Next.js pages / API routes |
| `lib` | Библиотеки (audit, data, telegram, AI) |
| `sql` | Миграции MySQL |
| `gate` | Команды-проверки |
| `ops` | pm2 / деплой |

Поля: `id`, `type`, опционально `path` | `command`, `selfRewrite?: true`.

## Рёбра (`edges`)

| type | Смысл |
|------|--------|
| `reads` | Прочитать перед правкой |
| `owns` | Владение слоем |
| `writes` | Правка A требует обновить B |
| `validates` | Gate проверяет узел |
| `forbids` | Явный запрет направления |

## Готовые пути (`taskPaths`)

| Ключ | Когда |
|------|--------|
| `lead_radar_queue` | Очередь, статусы, batches |
| `lead_radar_serp` | SERP + фильтр компаний |
| `lead_radar_audit` | Аудит / deep email / screenshot |
| `lead_radar_email` | HTML КП + send |
| `lead_radar_telegram` | Telegram + фото |
| `lead_radar_daily_report` | Вечерний отчёт |
| `lead_radar_replies` | Ответы |
| `prod_restart` | build (+ pm2 по запросу) |

Новый тип задачи = новый `taskPaths` (+ рёбра при необходимости).  
**Смена schemaVersion / набора типов узлов** = self-rewrite → permission владельца.

## Синхронизация

После существенной правки (новый API, новая таблица):

1. Добавить/обновить node.  
2. Добавить edges `writes` / `validates`.  
3. При необходимости расширить `taskPaths`.  
4. `npm run harness:check` — пути на диске должны существовать.

## Запреты

- Не подменять ТЗ «устной договорённостью» без записи в LEAD-RADAR-AUTO-TZ.  
- Не коммитить секреты / тяжёлые скриншоты в git.
