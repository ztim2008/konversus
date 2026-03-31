# MARKET BENCHMARK SQL LAYER

## Цель документа
Зафиксировать SQL-слой benchmark-модуля так, чтобы его можно было сразу переводить в миграции, backend-контракты и UI.

Этот слой строится не отдельно от продукта, а поверх Data Hub.

## Зависимости
Benchmark-слой зависит от двух оснований:
- Data Hub с импортированными объявлениями и метриками;
- Audit layer с локальными score и findings.

Поэтому порядок миграций такой:
1. `sql/acb-core-mvp-migrate-003-data-hub.sql`
2. `sql/acb-core-mvp-migrate-004-market-benchmark.sql`

## Какие таблицы появляются

### База Data Hub
Из миграции `003`:
- `acb_avito_connections`
- `acb_avito_tokens`
- `acb_avito_listings`
- `acb_avito_listing_images`
- `acb_avito_listing_metric_snapshots`
- `acb_listing_audits`
- `acb_listing_audit_findings`
- `acb_listing_versions`

Эти таблицы нужны benchmark-модулю как источник контекста и результата.

### Собственно benchmark-слой
Из миграции `004`:
- `acb_benchmark_queries`
- `acb_benchmark_snapshots`
- `acb_benchmark_gaps`
- `acb_benchmark_patterns`
- `acb_benchmark_samples`

## Как это работает по потоку данных

### Шаг 1. Формирование benchmark-запроса
`acb_benchmark_queries` хранит контекст сравнения:
- для какого объявления строим benchmark;
- какой город;
- какая категория или услуга;
- какой ценовой диапазон;
- в каком режиме сравниваем.

### Шаг 2. Расчет benchmark-снимка
`acb_benchmark_snapshots` хранит итог расчета на момент времени:
- общий benchmark score;
- частные gap score по тексту, фото, инфографике, офферу и цене;
- summary;
- размер выборки.

### Шаг 3. Разбор gap-зон
`acb_benchmark_gaps` хранит структурированные разрывы между объявлением и рынком.

Это важнейшая таблица для UI-блока “Рыночный gap”, потому что именно она отвечает на вопрос:
что именно ниже рынка и какую правку делать.

### Шаг 4. Паттерны рынка
`acb_benchmark_patterns` хранит агрегированные сигналы рынка:
- типовые длины заголовков;
- типовые визуальные паттерны;
- распространенность инфографики;
- частотные признаки сильных объявлений.

### Шаг 5. Примеры похожих объявлений
`acb_benchmark_samples` хранит примеры карточек, на которых построен benchmark.

Важно:
в UI их нужно показывать как опорные примеры, а не как сырую свалку конкурентов.

## Почему нужна отдельная таблица gaps
Без `acb_benchmark_gaps` UI будет вынужден каждый раз собирать разрывы на лету из score и паттернов.

Это плохо по трем причинам:
- сложнее backend-ответ;
- слабее объяснимость;
- тяжелее сортировать и отдавать топ-3 рыночных проблемы.

Поэтому `gaps` - это не лишняя таблица, а рабочий интерфейс между benchmark engine и экраном аудита.

## Минимальный backend payload для UI-блока
Для блока “Рыночный gap” достаточно отдавать:
- `benchmark_score`
- `benchmark_scope.city`
- `benchmark_scope.category_name`
- `benchmark_scope.service_name`
- `sample_size`
- `summary`
- `top_market_gaps[]`
- `top_patterns[]`

Где `top_market_gaps[]` строится из `acb_benchmark_gaps`.

## Минимальный сценарий запроса
1. Пользователь открывает аудит объявления.
2. Backend находит актуальный `benchmark_query` для этого объявления или создает новый.
3. Backend берет последний `benchmark_snapshot`.
4. Backend подгружает:
- `acb_benchmark_gaps`
- `acb_benchmark_patterns`
- при необходимости `acb_benchmark_samples`
5. UI показывает блок “Рыночный gap” прямо внутри audit screen.

## Что важно не перепутать
- `acb_listing_audits` отвечает на вопрос: что не так в самом объявлении.
- `acb_benchmark_snapshots` отвечает на вопрос: где объявление проигрывает рынку.
- `acb_benchmark_gaps` отвечает на вопрос: что менять, чтобы сократить этот разрыв.

Если смешать эти уровни, экран быстро станет перегруженным и нечитаемым.

## Практическое решение
Для первой реализации нужно считать обязательными:
- миграцию `003` как основу Data Hub;
- миграцию `004` как основу benchmark-слоя;
- API-ответ, который сводит benchmark в компактный UI-блок, а не в отдельный кабинет.