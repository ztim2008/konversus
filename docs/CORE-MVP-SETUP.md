# Настройка Core MVP (БД + Яндекс ID + env)

Этот документ нужен, чтобы запустить рабочий контур:
авторизация через Яндекс ID → access JWT → CRUD объявлений.

## 1) База данных

Требование: в PHP должен быть включен драйвер MySQL для PDO (`pdo_mysql`).

На Ubuntu это обычно:

`apt-get install php8.1-mysql`

После установки перезапустите PHP (например `php8.1-fpm`) и веб-сервер.

Core MVP использует MySQL из текущего окружения (подключение в [api/config.php](api/config.php)).

Применить схему:

`php scripts/apply-sql-cli.php sql/acb-core-mvp.sql`

Если база была создана раньше, примените миграцию для поля шаблона в объявлениях:

`php scripts/apply-sql-cli.php sql/acb-core-mvp-migrate-001-template-id.sql`

Для роли администратора:

`php scripts/apply-sql-cli.php sql/acb-core-mvp-migrate-002-admin-role.sql`

Для Data Hub и benchmark-слоя:

`php scripts/apply-sql-cli.php sql/acb-core-mvp-migrate-003-data-hub.sql`

`php scripts/apply-sql-cli.php sql/acb-core-mvp-migrate-004-market-benchmark.sql`

Ожидаемые таблицы:
- `acb_users`
- `acb_refresh_tokens`
- `acb_listings`
- `acb_avito_connections`
- `acb_avito_tokens`
- `acb_avito_listings`
- `acb_avito_listing_images`
- `acb_avito_listing_metric_snapshots`
- `acb_listing_audits`
- `acb_listing_audit_findings`
- `acb_listing_versions`
- `acb_benchmark_queries`
- `acb_benchmark_snapshots`
- `acb_benchmark_gaps`
- `acb_benchmark_patterns`
- `acb_benchmark_samples`

## 2) Регистрация приложения в Яндекс OAuth

Нужно создать OAuth-приложение и получить:
- `Client ID`
- `Client secret`

Важно:
- Redirect URI должен совпадать 1-в-1 с тем, что задано в `ACB_YANDEX_REDIRECT_URI`.
- Для текущего core API callback расположен здесь:
  - `/api/core/auth-yandex-callback.php`

## 3) Переменные окружения (env)

Core API читает настройки через `getenv()`.

### Обязательные
- `ACB_JWT_SECRET`
- `ACB_YANDEX_CLIENT_ID`
- `ACB_YANDEX_CLIENT_SECRET`
- `ACB_YANDEX_REDIRECT_URI`

### Рекомендуемые
- `ACB_CORS_ORIGINS` — список origin через запятую (например: `https://example.ru,https://www.example.ru`).
- `ACB_JWT_ACCESS_TTL_SECONDS` — время жизни access JWT (по умолчанию 900).
- `ACB_REFRESH_TTL_SECONDS` — время жизни refresh токена (по умолчанию 30 дней).
- `ACB_YANDEX_SCOPE` — если нужно запросить только часть прав (можно оставить пустым).
- `ACB_AVITO_CLIENT_ID` — client_id приложения Avito OAuth.
- `ACB_AVITO_CLIENT_SECRET` — client_secret приложения Avito OAuth.
- `ACB_AVITO_REDIRECT_URI` — callback URL для Avito OAuth.
- `ACB_AVITO_SCOPE` — scopes Avito OAuth, если понадобятся.

### Где задавать env (не в репозитории)

Не складывайте секреты в файлы внутри web root.

Варианты (выберите один):
- Рекомендуемый: файл `/var/www/www-root/data/.acb-core.env` (или путь в `ACB_ENV_FILE`). Core API автоматически подхватит его на каждом запросе.
- Nginx + php-fpm: задать переменные в конфигурации сервера (например через `fastcgi_param` или `env[]` в pool php-fpm) и перезапустить `php8.1-fpm`.
- Apache: задать `SetEnv` в конфиге виртуального хоста (лучше, чем в .htaccess) и перезапустить `apache2`.

Пример `/var/www/www-root/data/.acb-core.env`:

`ACB_JWT_SECRET=ЗАМЕНИТЬ_НА_СЕКРЕТ`

`ACB_YANDEX_CLIENT_ID=ЗАМЕНИТЬ_НА_CLIENT_ID`

`ACB_YANDEX_CLIENT_SECRET=ЗАМЕНИТЬ_НА_CLIENT_SECRET`

`ACB_YANDEX_REDIRECT_URI=https://ВАШ_ДОМЕН/api/core/auth-yandex-callback.php`

`ACB_CORS_ORIGINS=https://ВАШ_ДОМЕН`

`ACB_AVITO_REDIRECT_URI=https://xn--80abnjzcaex7a.xn--p1ai/api/core/auth-avito-callback.php`

### Redirect URL для Avito OAuth

Для текущего проекта используйте этот Redirect URL:

`https://xn--80abnjzcaex7a.xn--p1ai/api/core/auth-avito-callback.php`

## 4) Быстрая проверка API

Health:

`curl -sS https://ВАШ_ДОМЕН/api/core/health.php`

Старт OAuth (вернет `authorize_url`):

`curl -sS https://ВАШ_ДОМЕН/api/core/auth-yandex-start.php`

После успешного входа Яндекс вернет пользователя на callback (он отдаст JSON с токенами).

### Личный кабинет (UI)

Кабинет доступен по адресу:

`https://ВАШ_ДОМЕН/cabinet/`

Сценарий входа:
- Открываете кабинет → нажимаете «Войти».
- Вас перебрасывает на Яндекс.
- После успешного входа callback сохранит токены в `localStorage` и перенаправит обратно в кабинет.

Проверка пользователя:

`curl -sS -H "Authorization: Bearer ACCESS_JWT" https://ВАШ_ДОМЕН/api/core/me.php`

Создать объявление:

`curl -sS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ACCESS_JWT" \
  -d '{"title":"Тест","description":"Описание"}' \
  https://ВАШ_ДОМЕН/api/core/listings.php`

Список объявлений:

`curl -sS -H "Authorization: Bearer ACCESS_JWT" https://ВАШ_ДОМЕН/api/core/listings.php`

Аудит объявления:

`curl -sS -H "Authorization: Bearer ACCESS_JWT" "https://ВАШ_ДОМЕН/api/core/audit.php?id=LISTING_ID"`

Список шаблонов (из таблицы `templates` в текущей БД):

`curl -sS https://ВАШ_ДОМЕН/api/core/templates.php`
