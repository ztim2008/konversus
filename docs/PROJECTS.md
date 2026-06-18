# Проекты Konversus

**konversus.ru — хаб конверсионных модулей для сайта.**  
Каждый модуль отвечает на один человеческий вопрос владельца бизнеса.

## Активные модули

### 1. Архитектор — «Что мешает бизнесу расти?»
- **Статус**: Production
- **Домен**: konversus.ru/architect
- **Суть**: AI-анализ сайта: SEO, дизайн, скорость, позиционирование. Показывает точки роста.
- **Стек**: Next.js 16 + MySQL + OpenRouter GPT-4o

### 2. Factory Proposal Builder — «Как упаковать бизнес?»
- **Статус**: Production
- **Домен**: konversus.ru
- **Суть**: Конструктор digital-концептов для производственных компаний. Блоки → share-страница → PDF.
- **Стек**: Next.js 16 + MySQL + TipTap

### 3. SSL Doctor — «С моим сайтом всё в порядке?»
- **Статус**: MVP (фаза A-B)
- **Домен**: ssl.konversus.ru
- **Суть**: Проверка здоровья сайта за 3 секунды. SSL, HTTPS, DNS. Помощь с исправлением.
- **Стек**: Next.js 16 + PostgreSQL + Prisma + Node TLS API

### 4. Leads AI — «Где брать заказы?»
- **Статус**: MVP (Day 2)
- **Домен**: leads.konversus.ru
- **Суть**: Автоматический сбор заявок с Profi.ru. AI-оценка, отклики, Telegram.
- **Стек**: Next.js 16 + PostgreSQL + Prisma + Redis + DeepSeek + Playwright

## Архивные

### nordic-builder.ru — Конструктор сайтов

### prokuklyash.ru — Интернет-магазин

## Инфраструктура

| Сервис | Порт | Технология |
|--------|------|-----------|
| konversus-fpb | 3010 | PM2 |
| leads-konversus | 3005 | PM2 |
| leads-worker | — | PM2 |
| ssl-doctor | 3006 | PM2 |
| PostgreSQL (kuklyash) | 5432 | Docker |
| PostgreSQL (leads) | 5433 | Docker |
| PostgreSQL (ssl) | 5434 | Docker |
| Redis (leads) | 6379 | Docker |

## Документация

- [Идеология проекта](IDEOLOGY.md)
- [SSL Doctor — план](https://github.com/ztim2008/avitos/blob/main/docs/PLAN.md)
- [Leads AI — README](https://github.com/ztim2008/avitos/blob/main/docs/README.md)
