# Лид-радар — Документация для разработчиков

## Концепция

Лид-радар — внутренний инструмент поиска клиентов через аудит сайтов. Находит компании в Google Maps и 2GIS, проверяет сайты на проблемы (SSL, H1, мобильная версия, CMS), оценивает «горячесть» лида и помогает формировать персональные коммерческие предложения с отправкой на email.

## Технологический стек

| Слой | Технология |
|------|-----------|
| Фреймворк | Next.js 16 (App Router) + TypeScript |
| Стили | Tailwind CSS |
| База данных | MySQL 8 (mysql2) |
| Браузер | Playwright (Chromium headless) |
| Почта | Nodemailer + Яндекс SMTP |
| AI | DeepSeek Chat (OpenRouter) |
| Иконки | Lucide React |

## Архитектура

```
src/app/dashboard/secret-shopper/
  └── page.tsx                    # Главный UI (клиентский компонент)

src/lib/
  ├── website-checker.ts          # Аудит сайта
  ├── data/lead-radar.ts          # Data layer (MySQL)
  └── db.ts                       # MySQL connection pool

src/app/api/
  ├── lead-radar/route.ts         # CRUD радаров и сайтов
  └── secret-shopper/
      ├── search/route.ts         # Поиск компаний (Google Maps + 2GIS)
      ├── audit/route.ts          # Массовый аудит сайтов
      ├── contacts/route.ts       # Извлечение контактов
      ├── generate-kp/route.ts    # AI-генерация КП
      ├── send-email/route.ts     # Отправка писем
      └── track-open/route.ts     # Трекинг открытий
```

## База данных (MySQL)

### lead_radars — сохранённые поиски
| Поле | Тип | Описание |
|------|-----|----------|
| id | CHAR(36) PK | UUID |
| city | VARCHAR(255) | Город |
| niche | VARCHAR(255) | Ниша |
| filters | JSON | Фильтры |
| active | TINYINT(1) | Активен |
| last_check_at | DATETIME | Последняя проверка |
| lead_count | INT | Найдено лидов |

### lead_radar_sites — найденные сайты
| Поле | Тип | Описание |
|------|-----|----------|
| id | CHAR(36) PK | UUID |
| radar_id | CHAR(36) FK | → lead_radars |
| domain | VARCHAR(255) | Домен |
| name | VARCHAR(255) | Название компании |
| ssl_status | ENUM | ok/warning/error/unknown |
| ssl_days | INT | Дней до истечения |
| score | INT | Оценка проблем (0-10) |
| phone | VARCHAR(50) | Телефон |
| email | VARCHAR(255) | Email |
| problems | JSON | Список проблем |
| status | ENUM | new/contacted/replied/won/lost |
| contacted_at | DATETIME | Когда связались |
| replied_at | DATETIME | Когда ответили |
| hotScore | INT | Горячесть 0-100 |

### lead_emails — история писем
| Поле | Тип | Описание |
|------|-----|----------|
| id | CHAR(36) PK | UUID |
| site_id | CHAR(36) FK | → lead_radar_sites |
| to_email | VARCHAR(255) | Кому |
| subject | VARCHAR(500) | Тема |
| sent_at | DATETIME | Когда отправлено |
| status | ENUM | sent/opened/clicked/bounced/failed |

### lead_follow_ups — отслеживание контактов
| Поле | Тип | Описание |
|------|-----|----------|
| id | CHAR(36) PK | UUID |
| site_id | CHAR(36) FK | → lead_radar_sites |
| type | ENUM | email/call/message |
| sent_at | DATETIME | Когда |
| opened_at | DATETIME | Когда открыли |
| replied_at | DATETIME | Когда ответили |

## API-эндпоинты

### GET /api/lead-radar
Список всех радаров.

### POST /api/lead-radar
Мульти-экшен. Параметры:
- `action: "create"` + `city, niche, filters` → создать радар
- `action: "delete"` + `id` → удалить радар
- `action: "save-sites"` + `radarId, sites[]` → сохранить сайты
- `action: "list-sites"` + `radarId` → список сайтов радара
- `action: "update-status"` + `siteId, status` → сменить статус

### POST /api/secret-shopper/search
Поиск компаний. Тело: `{ city, niche }`.
Ищет через Google Maps + 2GIS (Playwright).
Возвращает: `{ sites: [{domain, name, url}], source, count }`

### POST /api/secret-shopper/audit
Массовый аудит сайтов. Тело: `{ sites: [{domain, name, url}] }`.
Для каждого сайта запускает `checkWebsite()`.
Возвращает: `{ results: [{domain, audit: {...}}] }`

### POST /api/secret-shopper/contacts
Извлечение контактов. Тело: `{ sites: [{domain}] }`.
Парсит HTML сайтов, ищет телефон/email/VK/Telegram.

### POST /api/secret-shopper/generate-kp
AI-генерация КП. Тело: `{ domain, issues, niche, city }`.
Использует DeepSeek Chat. Fallback — шаблон.

### POST /api/secret-shopper/send-email
Отправка письма. Тело: `{ to, subject, html, testMode, siteId }`.
Использует nodemailer + Яндекс SMTP.
Логирует в lead_emails, создаёт follow-up.

### GET /api/secret-shopper/track-open?siteId=X
Трекинг-пиксель. Возвращает 1×1 GIF. Обновляет opened_at.

## Аудит сайта (website-checker.ts)

### Что проверяется
| Параметр | Метод | Баллы |
|----------|-------|-------|
| HTTPS | Заголовок URL | +2 |
| H1 | `<h1>` в HTML | +2 (нет) / +1 (кривой) |
| Viewport | `<meta viewport>` | +2 |
| Copyright | © ГГГГ в футере | +2 |
| Скорость | responseTime > 5с | +1 |
| Телефон | regex +7/8... | +1 |
| CMS | Сигнатуры | инфор |

### Скоринг горячести (hotScore 0-100)
| Сигнал | Баллы |
|--------|-------|
| SSL истёк | +30 |
| Нет H1 | +25 |
| Кривой H1 | +15 |
| SSL < 14 дн | +20 |
| Нет viewport | +10 |
| Копирайт старый | +5 |
| Нет телефона | +5 |
| Телефон ЕСТЬ | -15 |
| Email ЕСТЬ | -10 |

```typescript
🔥 75+ — ГОРЯЧИЙ (звонить сейчас)
🟡 60-74 — ТЁПЛЫЙ (отправить КП)
🔵 30-59 — ХОЛОДНЫЙ (в очередь)
⚪ <30 — ЛЁД (пропустить)
```

## Бизнес-логика

### Полный цикл
```
Новый радар → Google Maps + 2GIS → аудит сайтов → контакты →
→ таблица лидов → КП → +Architect → отправка email →
→ follow-up (3 дня) → трекинг открытий → статус
```

### Статусы лида
```
new → contacted (отправлено) → replied (ответил) → won (сделка)
                                               → lost (проиграл)
```

### Follow-up
- После отправки создаётся запись в lead_follow_ups
- follow_up_at = +3 дня
- Трекинг-пиксель в письме отслеживает открытия
- Просроченные follow-up показываются в интерфейсе

## Переменные окружения (.env)

```env
SMTP_USER=bilariuss@yandex.ru
SMTP_PASS=taspbdxpwszljeey
OPENROUTER_API_KEY=sk-or-v1-...
```

## Деплой

Проект — часть konversus.ru. Деплой через PM2:
```bash
pm2 restart konversus-fpb
```

## Точки отката

```bash
git checkout checkpoint/day3-secret-shopper-start
```

## Дальнейшее развитие

Актуальное полное ТЗ по автоматизации (утро / 20 шт / lead-web.pro / Telegram / Harness·Loop·Graph):

→ **[LEAD-RADAR-AUTO-TZ.md](./LEAD-RADAR-AUTO-TZ.md)**

Исторический бэклог:

- [ ] Ежедневный автопоиск по расписанию
- [ ] Telegram-уведомления о новых горячих лидах
- [ ] Экспорт в CRM (AmoCRM, Bitrix24)
- [ ] SaaS-версия (отдельный продукт)
- [ ] Интеграция с каталогами (Zoon, Flamp, Yell)
- [ ] A/B тестирование шаблонов КП
