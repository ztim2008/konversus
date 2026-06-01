# Factory Proposal Builder

Новый проект для сборки premium digital proposals, share-страниц и PDF-презентаций для производственных компаний, инженерного B2B и industrial-сегмента.

## Текущий стек

- Next.js 16
- TypeScript
- Tailwind CSS 4
- App Router
- MySQL 8

## Что уже сделано

- Старый проект `konversus` вынесен из web-root во внешний архивный каталог сервера.
- В корне поднят новый Next.js baseline.
- Дефолтный starter заменен на стартовую продающую витрину продукта.
- Зафиксирован продуктовый концепт агентства и платформы.
- Поднят локальный MySQL backend и личная авторизация владельца.
- Собран первый dashboard компаний и концептов.
- Добавлен proposal builder с блочной структурой документа.
- Добавлены публичные share-page по URL для клиентской передачи.
- На домене включен production-деплой через nginx + PM2.

## Позиционирование

Проект строится вокруг идеи:

**Новая цифровая упаковка для производств**

Мы продаем не просто сайт, а современный digital-образ компании: доверие, масштаб, современность и готовую систему презентации бизнеса в digital-среде.

## Ближайший MVP

1. Публичная продающая главная как витрина услуг и кейсов.
2. Авторизация и личный закрытый кабинет владельца.
3. Dashboard компаний.
4. Wizard создания концепта.
5. Share-page для клиента.
6. PDF generation.

## Текущий статус

На конец текущего рабочего дня в проекте уже есть рабочий первый цикл:

1. вход владельца,
2. создание компании,
3. создание концепта,
4. переход в builder,
5. редактирование блоков,
6. публикация share-page,
7. открытие share-page по реальному URL.

Подробный статус зафиксирован в [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md).

## Правила проекта

- Вся продуктовая разработка, документация, интерфейсы и терминология ведутся на русском языке.
- Англоязычные идентификаторы в коде допускаются только там, где это естественно для экосистемы Next.js, TypeScript и MySQL.
- В MVP используем локальную MySQL-базу на сервере и простой закрытый вход владельца.
- Directus не ставим в центр первой версии продукта. Возвращаемся к нему позже только как к возможному контентному или backoffice-слою.
- На текущем этапе система проектируется под одного владельца-админа без ролей и без командного режима.

## Команды

```bash
npm install
npm run dev
npm run build
```

## Переменные окружения

Перед запуском нужно создать локальный `.env.local` на основе `.env.example`.

Минимальный набор:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `AUTH_SECRET`

Полный пошаговый запуск локальной базы описан в [docs/LOCAL-DB-SETUP.md](docs/LOCAL-DB-SETUP.md).

## Где сейчас лежит основная логика

- [src/app/layout.tsx](src/app/layout.tsx) — шрифты, метаданные, корневой layout.
- [src/app/page.tsx](src/app/page.tsx) — текущая стартовая витрина продукта.
- [src/app/globals.css](src/app/globals.css) — глобальная тема и базовые стили.
- [src/lib/env.ts](src/lib/env.ts) — чтение и проверка переменных окружения.
- [src/lib/db.ts](src/lib/db.ts) — подключение к локальной MySQL-базе.
- [src/lib/auth/session.ts](src/lib/auth/session.ts) — локальная cookie-сессия владельца.
- [src/lib/data/companies.ts](src/lib/data/companies.ts) — запросы к компаниям.
- [src/lib/data/proposals.ts](src/lib/data/proposals.ts) — запросы к концептам.
- [src/lib/data/share-links.ts](src/lib/data/share-links.ts) — публикация и получение share-link.
- [src/lib/proposal-builder.ts](src/lib/proposal-builder.ts) — каталог блоков и builder-модель.
- [src/types/domain.ts](src/types/domain.ts) — доменные типы MVP.
- [src/app/dashboard/proposals/[proposalId]/page.tsx](src/app/dashboard/proposals/[proposalId]/page.tsx) — editor концепта.
- [src/app/share/[slug]/page.tsx](src/app/share/[slug]/page.tsx) — публичная share-page клиента.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — зафиксированная архитектура MVP.
- [docs/BUILDER-SYSTEM.md](docs/BUILDER-SYSTEM.md) — блоковая система, ручной builder-flow и медиаслой.
- [docs/DOMAIN-MODEL.md](docs/DOMAIN-MODEL.md) — первая рабочая модель данных MVP.
- [docs/PROJECT-CONCEPT.md](docs/PROJECT-CONCEPT.md) — продуктовый концепт агентства и платформы.
- [docs/LOCAL-DB-SETUP.md](docs/LOCAL-DB-SETUP.md) — подключение локальной MySQL, накат схемы и запуск владельца.
- [docs/DOCUMENTATION-INDEX.md](docs/DOCUMENTATION-INDEX.md) — карта документации проекта.
- [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) — актуальный статус, что уже сделано и что начато.

## Следующий инженерный шаг

Довести builder до полноценного media workflow: фото, видео, клиентскую страницу и дальнейший PDF-экспорт.

---

## Архитектурные паттерны и правила

### 1. Вставка пользовательского HTML (Tiptap, Custom HTML)
- **Всегда** используйте компонент `ClientHtmlBlock` для вывода любого HTML, который был сгенерирован пользователем или редактором (Tiptap, Custom HTML).
- Это единственный способ избежать ошибок гидрации (#418) между SSR и CSR: сервер рендерит пустой контейнер, а на клиенте HTML вставляется через DOM API.
- Прямой `dangerouslySetInnerHTML` в SSR-компонентах запрещён.

### 2. CSS-скоупинг и медиазапросы
- Все стили блоков должны быть строго внутри `.fpb-page { ... }` — это защищает редактор от конфликтов и гарантирует корректную работу share-page.
- Для адаптивности используйте только CSS custom properties и медиазапросы, не прописывайте inline-стили для размеров шрифтов.
- Для цветовых токенов используйте функцию `blockColorVars` и переменные `--block-bg`, `--block-ink`.

### 3. JS-интерактив на share-странице
- Весь интерактив (exit-intent modal, scroll-reveal, before/after slider, mobile share) реализован через IIFE в `<script>` — это гарантирует независимость от React и SSR.
- Exit-intent modal появляется только один раз за сессию (sessionStorage), слушатели событий изолированы и не конфликтуют с остальным кодом.

### 4. Строгие правила для новых блоков
- Любой новый блок должен соблюдать архитектурные паттерны:
	- HTML только через клиентский компонент;
	- стили только через CSS custom properties;
	- JS только через IIFE или строго scoped client-компоненты;
	- дублирование CSS для canvas/SSR обязательно (см. BLOCK-AUTHORING-GUIDE.md).

**Подробнее см.**: [docs/BLOCK-AUTHORING-GUIDE.md](docs/BLOCK-AUTHORING-GUIDE.md), [src/components/share/client-html-block.tsx](src/components/share/client-html-block.tsx), [src/app/globals.css](src/app/globals.css).
