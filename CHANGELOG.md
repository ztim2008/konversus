# Changelog

## 2026-05-27

### Удаление концептов и компаний (C-1)

- компонент `DeleteConfirmButton` (`src/components/dashboard/delete-confirm-button.tsx`) — `"use client"`, подтверждение через `window.confirm` перед server action
- кнопки удаления добавлены в карточки дашборда (компании + концепты) и в топбар редактора
- server actions: `deleteProposalAction`, `deleteCompanyAction`, `deleteCurrentProposalAction`
- каскадное удаление: сначала фидбек, затем концепт/компания

### Аналитика устройств (A-1)

- `share_link_views.device_type` — тип устройства (`mobile`/`tablet`/`desktop`/`unknown`)
- `share_links.mobile_view_count`, `share_links.desktop_view_count` — счётчики по типу
- функция `detectDevice(userAgent)` в `src/lib/data/share-links.ts`
- иконки 📱/💻 с цифрами в карточках концептов на дашборде (только при `uniqueViewCount > 0`)

### WOW — вступительная анимация share-страниц

- intro-занавес: монограмма компании + кикер → прогресс-бар → плавный уход
- CSS: `.fpb-intro`, `.fpb-intro.is-leaving`, `@keyframes fpbIntroLeave/Bar/Item`
- scroll-reveal через `IntersectionObserver`: `.reveal-pending` → `.reveal-done`
- hero-блок появляется с анимацией после intro (`fpb-hero-enter`)
- inline `<script dangerouslySetInnerHTML>` в share-page (нет зависимостей от клиентских компонентов)

### Exit-intent модал на share-страницах

- триггер: `document.mouseleave` через верхний край (desktop) / `setTimeout 35s` (mobile)
- показывается **один раз за сессию** (`sessionStorage`), не раньше 2.5 сек после intro
- контент: фото автора, имя, роль, убедительный текст, 3 кнопки (телефон, Telegram, Max.ru)
- закрывается на `Escape`, клик по backdrop, кнопку ×
- CSS: `.fpb-exit-backdrop`, `.fpb-exit-modal`, `.fpb-exit-card` и дочерние классы

### Студия КОНВЕРСУС на share-страницах

- badge «СТУДИЯ КОНВЕРСУС» (`studio-badge`) в топбаре share-page, ссылка на `https://konversus.ru`
- подвал `<footer class="fpb-page-footer">` после FeedbackForm: логотип КВ, слоган, ссылка

### 404 страница

- `src/app/not-found.tsx` — кинематографичная тёмная 404 в стиле проекта
- водяной знак «404», монограмма КВ, кнопки «На главную» и «Telegram»
- `robots: { index: false, follow: false }` — не засоряет индекс поиска
- CSS: `.fpb-404` и дочерние классы в `globals.css`

### Настройки сайта — полный редактор (`/dashboard/settings`)

#### База данных
- таблица `site_settings` (`key VARCHAR PRIMARY KEY`, `value LONGTEXT`, `updated_at`)
- изменения применяются без деплоя — данные читаются из БД на каждый запрос

#### Data layer
- `src/lib/data/settings.ts` — `getAllSettings()`, `getSetting()`, `setManySetting()`
- константа `SETTING_DEFAULTS` — все дефолтные значения, таблица может быть пустой
- ключи: `seo_title`, `seo_description`, `seo_keywords`, `seo_og_image`, `ym_id`, `ga_id`, `yw_verification`, `body_scripts`, `hero_badge`, `hero_title`, `hero_subtitle`, `hero_cta_primary`, `hero_cta_secondary`, `about_experience`, `about_bio_1`, `about_bio_2`, `contact_phone`, `contact_phone_href`, `contact_email`, `contact_telegram`, `contact_telegram_href`, `contact_max_href`

#### Server action
- `src/app/dashboard/settings/actions.ts` → `saveSettingsAction(formData)` — сохраняет все ключи из `SETTING_DEFAULTS`, вызывает `revalidatePath("/")`

#### UI страницы настроек
- `src/app/dashboard/settings/page.tsx` — полностью переписан
- секции: Hero, О себе, Контакты, SEO, Аналитика, Вставка кода, Статус интеграций
- sticky save-bar сверху + кнопка снизу
- компоненты `Field` (input/textarea) и `SectionHeader` — внутренние helpers

#### Сквозная вставка кода (виджеты, чаты, пиксели)
- `src/components/body-script-injector.tsx` — `"use client"` компонент
- парсит произвольный HTML: извлекает `<script>` теги и создаёт их через `document.createElement("script")` (единственный способ исполнить скрипты из innerHTML)
- монтируется в `src/app/layout.tsx` → работает на **всех страницах** проекта
- пример: вставить код Jivochat → сохранить → обновить страницу → виджет работает везде

#### layout.tsx — динамические метаданные
- `export const metadata` заменён на `export async function generateMetadata()` — читает SEO из БД
- Яндекс.Метрика: ID берётся из `s.ym_id` вместо хардкода
- `BodyScriptInjector` рендерится в `<body>` с `s.body_scripts`

#### page.tsx (главная) — тексты из БД
- все ключевые тексты hero-секции, биографии, контактов читаются через `getAllSettings()`



### V2-редактор концептов

- редактор переведен на простой контур JSON -> HTML preview в iframe,
- добавлены блоки Hero-вариантов, фактов, текста с фото, фото 100%, видео 100%, галереи до 6 фото, HTML-вставки и контактов,
- слои вынесены в выпадающий список с действиями поднять, опустить, дублировать и удалить,
- левая медиатека убрана из постоянной панели; выбор изображений работает через модальное окно из полей,
- каталог блоков стал прокручиваемым и получил явный плюс для добавления,
- исправлены сбросы preview при вводе текста и смене палитры: ввод работает через спокойный debounce, палитра меняет iframe без перезагрузки.

### Публикация и доставка

- кнопка публикации стала кнопкой обновления share для уже опубликованных концептов,
- перед публикацией принудительно сохраняются актуальные блоки и палитра,
- добавлен PDF download route `/share/[slug]/pdf` как вторичный формат для пересылки,
- фокус MVP зафиксирован на share-ссылке как главном клиентском сценарии.

### Стабилизация

- увеличен лимит Server Actions до `8mb` для сохранения крупных структур,
- production-сборки и перезапуск PM2 выполнялись после ключевых изменений,
- браузерные проверки подтвердили сохранение scroll-позиции preview и отсутствие ошибки сохранения в проверенном сценарии.

## 2026-05-25

### Перезапуск проекта

- старый проект вынесен из рабочего web-root в архив,
- в корне проекта развернут новый Next.js baseline,
- зафиксирован новый продуктовый вектор: цифровая упаковка для производств.

### Backend и авторизация

- runtime переведен на локальную MySQL-базу,
- добавлена локальная cookie-сессия владельца,
- введены `DB_*`, `ADMIN_*` и `AUTH_SECRET` переменные окружения,
- подготовлена MySQL-схема в `sql/001_mvp_core_mysql.sql`.

### Dashboard и сущности

- реализованы компании и концепты как базовые сущности,
- собран первый dashboard владельца,
- добавлены server actions для создания компаний и концептов.

### Builder и delivery

- добавлен proposal builder с блочной структурой документа,
- введены типы блоков и шаблоны payload,
- добавлена публикация share-link,
- поднята публичная share-page по URL `/share/[slug]`.

### Деплой

- проект переведен на production-деплой через nginx + PM2,
- домен `konversus.ru` отдает Next.js production build,
- настроен отдельный production-процесс `konversus-fpb`.

### Документация

- обновлены архитектурные документы под MySQL и builder-first модель,
- зафиксированы block system, роль Ollama и медиаслой,
- добавлены индекс документации и статус проекта.