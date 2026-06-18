# Проекты Konversus

## Активные

### 1. konversus.ru — Factory Proposal Builder
- **Статус**: Production
- **Суть**: Конструктор digital-концептов для производственных компаний
- **Стек**: Next.js 16 + MySQL + HMAC-auth
- **Пользователи**: Алексей (single-owner)
- **Документация**: `/var/www/www-root/data/www/konversus.ru/docs/`

### 2. leads.konversus.ru — Konversus Leads AI
- **Статус**: MVP (Day 2)
- **Суть**: Автоматический поиск и AI-анализ заказов с фриланс-площадок
- **Стек**: Next.js 16 + PostgreSQL + Redis + Prisma + DeepSeek
- **Пользователи**: SaaS (регистрация открыта)
- **Документация**: `/var/www/www-root/data/www/leads.konversus.ru/docs/`

### 3. ssl.konversus.ru — SSL Doctor 🆕
- **Статус**: Планирование
- **Суть**: Диагностика и восстановление SSL-сертификатов
- **Стек**: Next.js 16 + PostgreSQL + Node TLS API
- **Пользователи**: SaaS
- **Документация**: `/var/www/www-root/data/www/ssl.konversus.ru/docs/PLAN.md`

## Архивные

### nordic-builder.ru
- **Статус**: Production (архив)
- **Суть**: Конструктор сайтов

### prokuklyash.ru
- **Статус**: Production
- **Суть**: Next.js 15 + Directus 11 + PostgreSQL

## Инфраструктура

| Сервис | Порт | Технология |
|--------|------|-----------|
| konversus-fpb | 3010 | PM2 |
| leads-konversus | 3005 | PM2 |
| leads-worker | — | PM2 |
| PostgreSQL (kuklyash) | 5432 | Docker |
| PostgreSQL (leads) | 5433 | Docker |
| Redis (leads) | 6379 | Docker |

## Домены

- konversus.ru → Nginx → :3010
- leads.konversus.ru → Nginx → :3005
- ssl.konversus.ru → Nginx → :3006 (план)
