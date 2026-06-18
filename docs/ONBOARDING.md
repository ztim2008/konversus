# Чеклист: Добавление нового модуля в экосистему

Для агентов и разработчиков. Каждый новый модуль должен пройти этот список.

---

## 1. Проект

- [ ] Новый Next.js проект в `/var/www/www-root/data/www/<модуль>.konversus.ru`
- [ ] Домен `<модуль>.konversus.ru`
- [ ] Docker Compose с PostgreSQL (новый порт 5434+)
- [ ] Prisma схема с multi-tenant (User → Workspace → ...)
- [ ] `.env` с DATABASE_URL, NEXTAUTH_URL, AUTH_SECRET
- [ ] Права `.env` = 600

## 2. Дизайн-система (общая для всех)

- [ ] `src/app/globals.css` — скопировать токены из любого модуля
- [ ] `src/app/layout.tsx`:
  - Inter шрифт (`next/font/google`)
  - `<html className="dark">`
  - Тёмная тема по умолчанию
- [ ] Иконки: `npm install lucide-react`
- [ ] Цвета: `--accent` свой для каждого модуля
  - SSL Doctor: `#10b981` (зелёный)
  - Leads AI: `#6366f1` (индиго)
  - Архитектор: `#f59e0b` (янтарный)

## 3. Авторизация (общая для всех)

- [ ] `npm install next-auth@4 bcryptjs`
- [ ] `src/lib/auth/auth.ts` — скопировать из любого модуля:
  - Credentials (email + пароль)
  - Яндекс ID (clientId: `a04c612860784ffb8a21a83a32084263`)
  - Автосоздание Workspace при первом входе
- [ ] `src/app/api/auth/[...nextauth]/route.ts`
- [ ] `src/app/api/auth/register/route.ts`
- [ ] `src/middleware.ts` — защита `/dashboard/*`
- [ ] `src/lib/db/index.ts` — Prisma singleton

## 4. SEO и аналитика

- [ ] Метатеги в `layout.tsx`: title, description, keywords, OpenGraph
- [ ] Schema.org JSON-LD (WebApplication)
- [ ] Favicon (SVG)
- [ ] Яндекс Метрика:
  ```tsx
  <Script id="yandex-metrika" strategy="afterInteractive">
    {`...ym(109448101,"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}
  </Script>
  ```
- [ ] ID счётчика: **109448101** (единый для всей экосистемы)

## 5. Кросс-ссылки (обязательно)

- [ ] В футере лендинга — ссылки на другие модули
- [ ] На главной konversus.ru — добавить блок с новым модулем
- [ ] В других модулях — добавить ссылку на новый

## 6. Страницы (MVP)

- [ ] `/` — лендинг: что делает модуль, форма/кнопка действия
- [ ] `/auth` — вход и регистрация (табы)
- [ ] `/dashboard` — кабинет пользователя
- [ ] `/api/...` — API-эндпоинты

## 7. Деплой

- [ ] Nginx: `/etc/nginx/vhosts/www-root/<модуль>.konversus.ru.conf`
  - `@fallback` → `proxy_pass http://127.0.0.1:300X`
- [ ] SSL через ISPmanager
- [ ] PM2: `pm2 start npm --name "<модуль>" -- run start -- --port 300X`
- [ ] `pm2 save`

## 8. Документация

- [ ] `docs/PLAN.md` — план модуля
- [ ] `docs/README.md` — описание для агентов
- [ ] Обновить `konversus.ru/docs/PROJECTS.md` — добавить модуль
- [ ] Обновить `konversus.ru/docs/SITEMAP.md` — маршруты и ссылки

## 9. Git

- [ ] `git init` + первый коммит
- [ ] Тег `v0.1.0-mvp`

---

## Переменные окружения (шаблон)

```env
DATABASE_URL="postgresql://user:pass@localhost:543X/db_name?schema=public"
NEXTAUTH_URL="https://<модуль>.konversus.ru"
NEXTAUTH_SECRET="<генерировать>"
AUTH_SECRET="<генерировать>"
AUTH_TRUST_HOST=true
YANDEX_CLIENT_ID=a04c612860784ffb8a21a83a32084263
YANDEX_CLIENT_SECRET=72de15f92e6a4d3e9bdbee74c4330c0f
```

## Порты (занятые)

| Порт | Сервис |
|------|--------|
| 5432 | PostgreSQL (kuklyash) |
| 5433 | PostgreSQL (leads) |
| 5434 | PostgreSQL (ssl) |
| 5435 | PostgreSQL (следующий) |
| 6379 | Redis (leads) |
| 3005 | leads-konversus |
| 3006 | ssl-doctor |
| 3007 | (следующий) |
| 3010 | konversus-fpb |
