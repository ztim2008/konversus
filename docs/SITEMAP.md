# Карта экосистемы Konversus

## Структура доменов и маршрутов

```
konversus.ru (ХАБ)
│
├── /                                          # Главная — Factory Proposal Builder + витрина экосистемы
│   ├── Блок: Архитектор (ссылкой)
│   ├── Блок: SSL Doctor (ссылкой)
│   ├── Блок: Leads AI (ссылкой)
│   └── Блок: Экосистема Konversus
│
├── /architect                                 # AI Business Growth Architect
│   ├── /architect/[id]                        # Результат анализа
│   └── /architect/[id]/print                  # Версия для печати
│
├── /dashboard                                 # Кабинет владельца (Factory Proposal Builder)
│   ├── /dashboard/proposals/[id]              # Редактор концепта
│   ├── /dashboard/architect                   # Управление AI-анализами
│   └── /dashboard/settings                    # Настройки
│
├── /cases                                     # Портфолио работ
├── /reviews                                   # Отзывы
├── /auth                                      # Вход владельца
│
├── ssl.konversus.ru ───────────────────────── # SSL Doctor
│   ├── /                                      # Лендинг + форма проверки
│   ├── /auth                                  # Вход / Регистрация
│   ├── /dashboard                             # Кабинет: список доменов
│   └── /api/check                             # API проверки SSL/HTTP/DNS
│
├── leads.konversus.ru ─────────────────────── # Konversus Leads AI
│   ├── /                                      # Лендинг: тарифы, фичи
│   ├── /auth                                  # Вход / Регистрация
│   ├── /dashboard                             # Обзор: статистика, заявки
│   │   ├── /dashboard/leads                   # Лента заявок с карточками
│   │   ├── /dashboard/sources                 # Подключение источников
│   │   ├── /dashboard/settings                # Настройки: фильтры, Telegram
│   │   ├── /dashboard/admin                   # Админка: пользователи, активность
│   │   └── /dashboard/analytics               # Аналитика
│   ├── /docs                                  # Документация для новичков
│   └── /api/worker                            # Статус воркера
│
└── nordic-builder.ru ──────────────────────── # Архивный проект
```

## Кросс-ссылки между модулями

```
konversus.ru (главная)
    │
    ├──→ ssl.konversus.ru          (блок «Экосистема»)
    │       └──→ konversus.ru/architect   (блок «Карта роста»)
    │       └──→ leads.konversus.ru       (блок «Поиск заказов»)
    │
    ├──→ leads.konversus.ru        (блок «Экосистема»)
    │       └──→ konversus.ru             (← навбар)
    │       └──→ контакты                 (навбар)
    │
    └──→ konversus.ru/architect    (главная)
            └──→ ssl.konversus.ru         (нет — добавить!)
```

## Точки входа (лидогенерация)

| Точка входа | Куда ведёт | Монетизация |
|-------------|-----------|-------------|
| SSL Doctor — проблема | t.me/bilarius | Платная помощь |
| Архитектор — слабые места | Factory Proposal Builder | Заказ концепта |
| Leads AI — нет заявок | t.me/bilarius | Настройка сервиса |
| Любой модуль — регистрация | SaaS-кабинет | Подписка Pro |

## Дизайн-система (общая)

| Элемент | Значение |
|---------|----------|
| Шрифт | Inter (400-800) |
| Иконки | Lucide (локально) |
| Тема | Тёмная по умолчанию |
| Токены | CSS-переменные (--bg-root, --accent, ...) |
| Сетка | 0px gap, border вместо карточек |
| Радиусы | 8-20px |
| Кнопки | Акцентный цвет фона + чёрный текст |

## Технологический стек (общий)

| Слой | Технология |
|------|-----------|
| Фреймворк | Next.js 16 + TypeScript |
| Стили | Tailwind + CSS-токены |
| БД | PostgreSQL 16 + Prisma 5 |
| Кеш | Redis 7 |
| Очереди | BullMQ |
| AI | OpenRouter (DeepSeek / GPT-4o) |
| Авторизация | NextAuth v4 + Яндекс ID |
| Браузер | Playwright |
| Деплой | Docker + PM2 + Nginx |
