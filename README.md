# AVITO CONVERSION BUILDER

Production-ready foundation для SaaS-инструмента роста конверсии объявлений Авито.

## Что в репозитории сейчас
- Полная очистка WordPress-слоя в корне.
- Новый базовый каркас проекта (монорепо-структура, документация, runbook).
- Сохранены отдельные подпроекты без изменений: `avitologi`, `avitoeditor`, `html-enhancer`, `portfolio`.

## Основная цель продукта
Давать авитологу измеримый рост заявок и конверсии:
- подключить Avito и собрать объявления в одном кабинете,
- увидеть проседающие объявления,
- получить аудит текста, фото и инфографики,
- сделать улучшенную версию и закрепить рост результата.

## Быстрый старт
1. Откройте стартовую страницу проекта: `index.html`.
2. Прочитайте обзор архитектуры: `docs/ARCHITECTURE.md`.
3. Проверьте структуру и зоны ответственности: `docs/MONOREPO-STRUCTURE.md`.
4. Настройте переменные окружения: `docs/ENV.md`.
5. Возьмите первый объем работ из `docs/MVP-BACKLOG.md`.

## Документация
- `AGENTS.md` - регламент для агентов: как читать проект, ставить задачи, открывать и закрывать день, что делать перед push.
- `docs/DEVELOPMENT-CALENDAR.md` - календарь разработки: что уже сделано, что сейчас в работе и какое окно идет следующим.
- `docs/DEPLOYMENT-STRATEGY.md` - стратегия деплоя и git-процесса: что можно выкатывать сразу, а что идет только через release-подход.
- `docs/GIT-WORKFLOW.md` - правило веток и минимальный git-процесс: main для стабильного состояния, отдельные ветки для рискованных изменений.
- `docs/STAGING-PLAN.md` - план перехода к отдельному staging-контуру.
- `docs/LEGACY-SANITIZATION.md` - карта блокеров по legacy-папкам перед их публикацией в GitHub.
- `ROADMAP.md` - этапы развития.
- `docs/PROJECT-DEVELOPMENT-PLAN.md` - план развития со статусами (🔴/🔵/🟢).
- `docs/PROJECT-IDEOLOGY.md` - идеология продукта и целевая модель ценности.
- `docs/product/MVP-CORE-CONCEPT.md` - one-page концепция ядра MVP: что именно продаем как первую ценность.
- `docs/product/AVITO-API-MVP-MAP.md` - карта MVP по Avito API: что берем в первую очередь и зачем.
- `docs/product/AUDIT-SCORING-SYSTEM.md` - система score для текста, фото и инфографики.
- `docs/product/MARKET-BENCHMARK-MODULE.md` - one-page концепция benchmark-модуля по городу, услуге и рынку.
- `docs/product/AUDIT-MARKET-GAP-BLOCK.md` - UI-спека блока “Рыночный gap” внутри экрана аудита.
- `docs/tech/AVITO-DATA-HUB-CONTRACT.md` - технический контракт Data Hub: сущности и поля для слоя поверх Avito API.
- `docs/tech/MARKET-BENCHMARK-DATA-SOURCES.md` - источники данных и границы надежности для benchmark-модуля.
- `docs/tech/MARKET-BENCHMARK-SQL-LAYER.md` - SQL-слой benchmark-модуля и порядок миграций.
- `docs/product/FIRST-AUDIT-SCREEN.md` - структура первого экрана аудита после подключения аккаунта или вставки ссылки.
- `docs/CORE-MVP-SETUP.md` - актуальные команды миграций и проверка audit endpoint.
- `docs/WEEKLY-BOARD-v1.md` - компактная недельная доска (one-page).
- `docs/WEEKLY-BOARD-v2.md` - доска для ежедневных стендапов с автоподсчетом статусов.
- `CHANGELOG.md` - журнал изменений.
- `docs/ARCHITECTURE.md` - high-level архитектура.
- `docs/MONOREPO-STRUCTURE.md` - структура монорепо.
- `docs/ENV.md` - переменные и правила секретов.
- `docs/MVP-BACKLOG.md` - приоритеты MVP.
- `docs/RELEASE-CHECKLIST.md` - регламент релизов.
- `docs/RUNBOOK.md` - backup/deploy/rollback.
- `docs/product/PRODUCT-LOGIC.md` - продуктовая логика и monetization.
- `docs/tech/TECH-BOOTSTRAP.md` - техстек и bootstrap-план.
- `docs/migration/WORDPRESS_REMOVAL_REPORT.md` - отчет об удалении WordPress.
- `docs/CORE-MVP-SETUP.md` - настройка БД/env/Яндекс ID для Core MVP.

## Важные ограничения
- Не изменять в рамках корневой миграции: `avitologi`, `avitoeditor`, `html-enhancer`, `portfolio`.
- Все новые изменения по core-платформе вести через документацию и changelog.
