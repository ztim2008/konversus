# ENV

## Required Variables

DATABASE_URL=
REDIS_URL=

JWT_SECRET=
JWT_REFRESH_SECRET=

# Core API (PHP /api/core)
ACB_JWT_SECRET=
ACB_JWT_ACCESS_TTL_SECONDS=900
ACB_REFRESH_TTL_SECONDS=2592000
ACB_CORS_ORIGINS=

# Авторизация через Яндекс ID (OAuth)
ACB_YANDEX_CLIENT_ID=
ACB_YANDEX_CLIENT_SECRET=
ACB_YANDEX_REDIRECT_URI=
ACB_YANDEX_SCOPE=

# Авторизация через Avito OAuth
ACB_AVITO_CLIENT_ID=
ACB_AVITO_CLIENT_SECRET=
ACB_AVITO_REDIRECT_URI=https://xn--80abnjzcaex7a.xn--p1ai/api/core/auth-avito-callback.php
ACB_AVITO_SCOPE=

# Роли (Core API)
# Список email администраторов через запятую. Эти email будут получать is_admin=1 при входе.
ACB_ADMIN_EMAILS=

S3_ENDPOINT=
S3_KEY=
S3_SECRET=

APP_URL=

## Optional Variables
MAIL_PROVIDER=
MAIL_FROM=
TELEGRAM_BOT_TOKEN=
LOG_LEVEL=info

## Security Rules
- Do not commit secrets to git.
- Use per-environment secret sets (dev/stage/prod).
- Rotate JWT and integration secrets regularly.
- Keep root .env ownership restricted.

## Core API env-файл (PHP /api/core)
Core API умеет подхватывать переменные из файла (по умолчанию `/var/www/www-root/data/.acb-core.env`).

- Путь можно переопределить переменной `ACB_ENV_FILE`.
- Значения из файла не перетирают уже заданные переменные окружения.

## Environments
- dev: local and isolated test credentials.
- stage: production-like config and masked data.
- prod: strict least-privilege and monitored access.
