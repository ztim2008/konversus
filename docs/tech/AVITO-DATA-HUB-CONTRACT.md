# AVITO DATA HUB CONTRACT

## Цель документа
Зафиксировать минимальный, но взрослый технический контракт для слоя Data Hub: какие сущности мы храним локально, какие поля нам нужны от Avito API и как это связывается с audit engine.

Data Hub нужен не ради интеграции как таковой, а чтобы дать продукту 4 базовых сценария:
- подключить аккаунт Avito;
- импортировать объявления в единый кабинет;
- определить проседающие объявления;
- отдать нормализованные данные в аудит и улучшение.

## Принципы контракта
- Храним только то, что поддерживает продуктовые сценарии.
- Разделяем данные источника и вычисленные данные сервиса.
- Не смешиваем импорт из Avito и локальные улучшенные версии в одной сущности.
- У каждого импортированного объекта должен быть `external_id` и `last_synced_at`.
- Любой score, флаг или рекомендация хранится как локальная производная, а не как часть сырого API-слоя.

## Что уже есть
Сейчас в core есть базовые таблицы пользователей и локальных объявлений:
- `acb_users`
- `acb_refresh_tokens`
- `acb_listings`

Этого достаточно для локального MVP, но недостаточно для Data Hub поверх Avito API.

## Что добавляем в Data Hub

### 1. Подключения к Avito
Таблица: `acb_avito_connections`

Назначение:
связать локального пользователя с одним подключенным Avito-аккаунтом.

Поля:
- `id` - локальный идентификатор подключения.
- `user_id` - ссылка на `acb_users.id`.
- `external_account_id` - идентификатор аккаунта на стороне Avito.
- `account_name` - отображаемое имя аккаунта.
- `account_email` - email аккаунта, если доступен.
- `status` - `active`, `expired`, `revoked`, `error`.
- `last_sync_at` - время последней успешной синхронизации.
- `last_error_code` - последний код ошибки при синке.
- `last_error_message` - текст последней ошибки.
- `created_at`
- `updated_at`

Индексы:
- `idx_user_id`
- `uniq_user_external_account`

### 2. Токены Avito
Таблица: `acb_avito_tokens`

Назначение:
хранить служебные токены отдельно от подключения.

Поля:
- `id`
- `connection_id`
- `access_token_enc` - зашифрованный access token.
- `refresh_token_enc` - зашифрованный refresh token.
- `scope` - scopes в строковом или JSON-виде.
- `expires_at`
- `refreshed_at`
- `revoked_at`
- `created_at`

Примечание:
токены не должны лежать в открытом виде в логах, ответах API или фронтенде.

### 3. Импортированные объявления
Таблица: `acb_avito_listings`

Назначение:
хранить нормализованную карточку объявления, импортированную из Avito.

Поля:
- `id`
- `user_id`
- `connection_id`
- `external_listing_id` - id объявления в Avito.
- `external_category_id` - id категории.
- `category_name`
- `title`
- `description`
- `price_value`
- `price_currency`
- `status` - локально нормализованный статус.
- `listing_url`
- `city`
- `region`
- `contact_name` - если доступно.
- `payload_json` - ограниченное сырье для дебага и несовпадений контракта.
- `source_created_at`
- `source_updated_at`
- `last_synced_at`
- `created_at`
- `updated_at`

Индексы:
- `uniq_connection_external_listing`
- `idx_user_status`
- `idx_last_synced_at`

Поля, которые нам реально нужны от Avito API:
- идентификатор объявления;
- заголовок;
- описание;
- цена;
- статус;
- ссылка на объявление;
- категория;
- география;
- дата обновления;
- набор фото.

### 4. Фото объявления
Таблица: `acb_avito_listing_images`

Назначение:
хранить изображения отдельно от карточки объявления.

Поля:
- `id`
- `listing_id`
- `external_image_id`
- `image_url`
- `sort_order`
- `is_main`
- `width`
- `height`
- `created_at`
- `updated_at`

Индексы:
- `idx_listing_order`
- `uniq_listing_external_image`

Поля от Avito API, которые критичны:
- идентификатор фото;
- ссылка на изображение;
- порядок изображений;
- признак первого фото.

### 5. Снимки метрик
Таблица: `acb_avito_listing_metric_snapshots`

Назначение:
хранить историю базовых метрик для выявления просадок и эффекта после правок.

Поля:
- `id`
- `listing_id`
- `snapshot_at`
- `views_count`
- `contacts_count`
- `favorites_count` - если доступно.
- `conversion_rate` - вычисляемое поле, если есть достаточные данные.
- `payload_json` - сырой кусок метрик для отладки.
- `created_at`

Индексы:
- `idx_listing_snapshot_at`

Минимально нужные метрики от Avito API:
- просмотры;
- контакты;
- избранное, если доступно;
- временная привязка метрики.

### 6. Аудиты объявления
Таблица: `acb_listing_audits`

Назначение:
фиксировать результаты проверки объявления в конкретный момент времени.

Поля:
- `id`
- `user_id`
- `listing_id` - nullable для режима “только ссылка”, если объект еще не импортирован в кабинет.
- `source_mode` - `api_listing` или `direct_link`.
- `overall_score`
- `text_score`
- `photo_score`
- `infographic_score`
- `market_score`
- `priority_level` - `low`, `medium`, `high`, `critical`.
- `summary`
- `created_at`

Индексы:
- `idx_listing_created_at`
- `idx_user_created_at`

### 7. Находки аудита
Таблица: `acb_listing_audit_findings`

Назначение:
хранить конкретные проблемы и рекомендации, а не только общий score.

Поля:
- `id`
- `audit_id`
- `zone` - `title`, `description`, `photo`, `infographic`, `metrics`, `offer`.
- `severity` - `info`, `warning`, `high`, `critical`.
- `code` - короткий код правила.
- `title` - краткий заголовок проблемы.
- `description` - объяснение простым языком.
- `recommendation` - что делать.
- `sort_order`
- `created_at`

Индексы:
- `idx_audit_sort`
- `idx_audit_zone`

### 8. Улучшенные версии
Таблица: `acb_listing_versions`

Назначение:
хранить улучшенные версии отдельно от импортированного оригинала.

Поля:
- `id`
- `user_id`
- `listing_id`
- `based_on_audit_id`
- `version_label` - например `v2-title-photo-fix`.
- `title`
- `description`
- `visual_brief` - ТЗ на фото/инфографику.
- `status` - `draft`, `ready`, `applied`, `archived`.
- `applied_at`
- `created_at`
- `updated_at`

Индексы:
- `idx_listing_status`
- `idx_based_on_audit`

## Какие сущности не обязательны в первой версии
- `acb_avito_competitors`
- `acb_ab_tests`
- `acb_variations`
- `acb_client_reports`
- `acb_sync_jobs`

Их можно добавить позже, когда будет стабилен основной цикл Data Hub -> Audit -> Improvement.

## Как сущности связаны между собой
- один `acb_users` -> много `acb_avito_connections`
- одно `acb_avito_connections` -> много `acb_avito_listings`
- одно `acb_avito_listings` -> много `acb_avito_listing_images`
- одно `acb_avito_listings` -> много `acb_avito_listing_metric_snapshots`
- одно `acb_avito_listings` -> много `acb_listing_audits`
- один `acb_listing_audits` -> много `acb_listing_audit_findings`
- одно `acb_avito_listings` -> много `acb_listing_versions`

## Что идет в audit engine из Data Hub
Минимальный входной объект для аудита:
- `listing_id`
- `title`
- `description`
- `price_value`
- `category_name`
- `status`
- `listing_url`
- `main_image_url`
- `image_count`
- `views_count_last_7d`
- `contacts_count_last_7d`
- `last_updated_at`

Этого достаточно для первой версии score и приоритизации.

## Что важно не перепутать
- `acb_avito_listings` - это источник и текущее состояние из Avito.
- `acb_listing_versions` - это локальные улучшенные варианты.
- `acb_listing_audits` - это результаты диагностики.

Нельзя смешивать эти слои, иначе быстро сломаются и история, и объяснимость рекомендаций.

## Минимальный план внедрения

### Шаг 1
Добавить таблицы:
- `acb_avito_connections`
- `acb_avito_tokens`
- `acb_avito_listings`
- `acb_avito_listing_images`

### Шаг 2
Добавить таблицы:
- `acb_avito_listing_metric_snapshots`
- `acb_listing_audits`
- `acb_listing_audit_findings`

### Шаг 3
Добавить таблицу:
- `acb_listing_versions`

## Итог
Data Hub в первой взрослой версии - это не “хранилище всего подряд из API”, а нормализованный операционный слой, который обеспечивает аудит, приоритизацию, улучшение и контроль результата.