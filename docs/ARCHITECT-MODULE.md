# 🏗️ AI Business Growth Architect — Системная документация

> **Последнее обновление:** 8 июня 2026  
> **Проект:** konversus.ru / Factory Proposal Builder  
> **Статус:** MVP v1 — задеплоен, работает  
> **Для:** AI-агентов, разработчиков, будущих сессий

---

## 🗺️ ЧТО ЭТО И ЗАЧЕМ

**AI Business Growth Architect** — публичный модуль konversus.ru, который превращает ссылку на любой бизнес (сайт, Ozon, WB, Авито) в персональную карту роста дохода + коммерческое предложение.

**Бизнес-логика:**
```
Пользователь вставляет URL → система определяет тип бизнеса → 
собирает данные → двухступенчатый AI анализ → 
отчёт из 6 секций → CTA на услуги разработчика
```

**Это не аналитика — это воронка продаж.**  
Каждый анализ = прогретый лид, который видел конкретные потери денег своего бизнеса.

**Виджет** (`public/architect-widget.js`) вставляется на любой сторонний сайт одной строкой — каждый сайт с виджетом = канал привлечения лидов в Konversus.

---

## 📁 ПОЛНАЯ КАРТА ФАЙЛОВ

```
src/lib/architect/           ← ядро модуля
├── types.ts                 ← все TypeScript типы
├── url-detector.ts          ← детект типа по URL (reuse в виджете)
├── data-collector.ts        ← fetch-only сбор данных
├── ai-analyzer.ts           ← двухступенчатый AI (stage1+stage2)
├── pipeline.ts              ← оркестратор (void async)
└── models.ts                ← реестр моделей OpenRouter (12 штук)

src/lib/data/
└── architect.ts             ← CRUD + stats + listArchitectProjects()

src/app/api/architect/
├── analyze/route.ts         ← POST (CORS open, rate limit, void pipeline)
└── [id]/route.ts            ← GET polling (CORS open)

src/app/architect/
├── page.tsx                 ← публичный лендинг /architect
└── [id]/page.tsx            ← SSR result wrapper /architect/[id]

src/app/dashboard/
└── architect/page.tsx       ← /dashboard/architect — история анализов (admin)

src/components/architect/
├── input-form.tsx           ← "use client" — URL форма с live-детектом
└── result-client.tsx        ← "use client" — polling + 6 секций отчёта

public/
└── architect-widget.js      ← embeddable vanilla JS, ~5KB

sql/
└── 003_architect_mysql.sql  ← миграция (уже применена)

docs/
└── ARCHITECT-MODULE.md      ← этот файл
```

---

## 🔄 КАК РАБОТАЕТ СИСТЕМА (поток данных)

```
1. ВВОД
   Пользователь → /architect (или виджет на чужом сайте)
   Вводит URL → live-детект типа в JS (ozon/wb/avito/website)
   
2. API ЗАПРОС
   POST /api/architect/analyze
   { url: "https://..." }
   → rate limit check (ip_hash, 24ч лимит из site_settings)
   → createArchitectProject() → id
   → void runArchitectPipeline(id, url, type, models, apiKey)
   ← { id, redirect_url }
   
3. PIPELINE (фоновый, без await)
   status: pending → collecting
   collectSnapshot(url, type) → ArchitectSnapshot
   → updateArchitectSnapshot() → status: analyzing
   stage1_extract(snapshot, fastModel) → structured JSON
   stage2_strategize(extracted, strongModel) → ArchitectReport
   → updateArchitectResult() → status: done
   При ошибке → markArchitectFailed() → status: failed

4. POLLING
   Клиент редиректится на /architect/[id]
   GET /api/architect/[id] каждые 3с
   loading state → done → рендер 6 секций
   
5. ОТЧЁТ
   Hero: verdict + growth_potential_%
   01 Позиционирование: current→potential, gaps, keywords
   02 Потери дохода: revenue_leaks[] с суммами в ₽
   03 Возможности: growth_opportunities[]
   04 Roadmap: задачи с +X% дохода
   05 Digital Assets: must/should/nice
   CTA: Telegram + новый анализ
```

---

## 🗄️ БАЗА ДАННЫХ

**Таблица:** `architect_projects`

```sql
id            CHAR(36)     -- UUID
url           TEXT         -- исходный URL
source_type   ENUM         -- website|ozon|wb|avito-seller|avito-listing
ip_hash       VARCHAR(64)  -- SHA-256 от IP (rate limiting)
status        ENUM         -- pending|collecting|analyzing|done|failed
snapshot_json LONGTEXT     -- ArchitectSnapshot (данные сайта)
result_json   LONGTEXT     -- ArchitectReport (6 секций)
model_used    VARCHAR(120) -- "fast-model → strong-model"
error_message VARCHAR(500) -- причина ошибки если failed
created_at    DATETIME
updated_at    DATETIME
```

**Индексы:** `idx_status`, `idx_ip_created (ip_hash, created_at)`

---

## ⚙️ НАСТРОЙКИ (site_settings таблица)

| Ключ | Дефолт | Назначение |
|------|--------|-----------|
| `openrouter_api_key` | `""` | Ключ OpenRouter — БЕЗ него Architect не работает |
| `architect_fast_model` | `google/gemini-2.5-flash-lite` | Stage 1 (extraction) — дёшево/быстро |
| `architect_strong_model` | `google/gemini-2.5-flash` | Stage 2 (strategy) — думающая модель |
| `architect_daily_limit` | `10` | Лимит анализов с одного IP за 24ч |

**Управление:** `/dashboard/settings` → раздел «AI Business Growth Architect»  
Модели выбираются из выпадающего списка с карточками (цена, провайдер, тир, описание).

---

## 🤖 AI ENGINE

### Модели (src/lib/architect/models.ts)
12 актуальных моделей OpenRouter с метаданными:

| Тир | Цвет | Модели |
|-----|------|--------|
| 🟢 Бесплатно | #4ade80 | Llama 3.3 70B, Llama 3.1 8B |
| 🔵 Дёшево | #60a5fa | Gemini 2.5 Flash Lite, Gemini 2.5 Flash, Claude 3.5 Haiku, GPT-4o Mini, DeepSeek V3 |
| 🟡 Средняя | #f59e0b | Gemini 3 Flash, Claude 3.5 Sonnet, GPT-4o, DeepSeek R1 |
| 🩷 Премиум | #f472b6 | Claude Sonnet 4.5, Gemini 3.5 Flash |

### Stage 1 (Gemini Flash Lite — дёшево)
- Вход: `ArchitectSnapshot` (данные сайта)
- Выход JSON: `{ niche, target_audience, business_type, key_products, detected_problems[], missing_assets[], seo_signals, trust_signals }`
- Промпт: структурная экстракция, не стратегия

### Stage 2 (сильная модель — стратегия)
- Вход: Stage 1 результат
- Выход JSON: полный `ArchitectReport` (6 секций)
- Промпт: «AI-архитектор роста, НЕ аналитик, показывай ПУТИ РОСТА ДОХОДА»
- Суммы потерь в рублях, конкретные задачи с +X%

**Один анализ ≈ $0.01–0.05** при настройках по умолчанию.

---

## 📦 ВИДЖЕТ (public/architect-widget.js)

**Вставка на любой сайт:**
```html
<div id="architect-widget"></div>
<script src="https://konversus.ru/architect-widget.js" data-theme="dark"></script>
```

**Атрибуты:**
- `data-theme="dark|light"` — тема виджета
- `data-container="my-id"` — свой div id вместо `architect-widget`

**Поведение:**
1. Инжектирует форму с inline-стилями (нет зависимостей, нет конфликтов)
2. Live-детект типа при вводе — badge появляется: «Ozon» / «Wildberries» / «Авито — продавец» / «Сайт»
3. Submit → `POST https://konversus.ru/api/architect/analyze` (CORS open)
4. Открывает результат в новой вкладке
5. «Powered by Konversus» — маркетинговая ссылка

**Совместим с:** WordPress, Tilda, Bitrix, статический HTML, любой фреймворк

---

## 🔐 API (CORS открыт — принимает запросы с любых доменов)

```
POST /api/architect/analyze
Body: { "url": "https://example.com" }
Response 201: { "id": "uuid", "redirect_url": "https://konversus.ru/architect/uuid" }
Response 400: { "error": "Укажите корректный URL" }
Response 429: { "error": "Лимит анализов исчерпан" }
Response 503: { "error": "AI Architect временно недоступен" }  (нет ключа)

GET /api/architect/:id
Response: { id, url, source_type, status, result, error, created_at }
```

---

## 👨‍💼 ADMIN DASHBOARD

**История анализов:** `/dashboard/architect`
- Доступ: только авторизованный admin (`requireCurrentAdmin()`)
- Статистика: всего / завершено / сегодня / ошибок
- Таблица: URL+ниша, тип, статус (цветной badge), рост +X%, модель, дата, ссылка на отчёт
- Навигация: ссылка «Architect» в шапке `/dashboard`

---

## 🎨 CSS NAMESPACE

`.arc-*` — все стили модуля Architect  
Не пересекается с: `.fpb-*` (share), `.ev3-*` (редактор V3), `.db-*` (дашборд), `.dv3-*` (документ)

Ключевые классы:
- `.arc-page`, `.arc-page-inner` — layout страниц
- `.arc-loading`, `.arc-loading-orb` — состояние загрузки
- `.arc-result-hero`, `.arc-section` — секции отчёта
- `.arc-leak-card`, `.arc-opp-card`, `.arc-roadmap-row`, `.arc-asset-card` — контент
- `.arc-hist-*` — таблица истории в дашборде

---

## 🔗 URL-ДЕТЕКТОР (src/lib/architect/url-detector.ts)

```typescript
detectSourceType("https://ozon.ru/...")           // → "ozon"
detectSourceType("https://wildberries.ru/...")    // → "wb"
detectSourceType("https://avito.ru/user/...")     // → "avito-seller"
detectSourceType("https://avito.ru/moskva/...")   // → "avito-listing"
detectSourceType("https://example.com")           // → "website"

validateUrl(url)       // → boolean
SOURCE_TYPE_LABELS     // → { ozon: "Ozon", wb: "Wildberries", ... }
SOURCE_TYPE_ICONS      // → { ozon: "📦", wb: "🛍️", ... }
```

**Важно:** та же логика зеркально реализована в `public/architect-widget.js` — синхронизировать при изменении.

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ (приоритизированы)

### 🔥 Phase 2 — WOW-эффекты (следующая сессия)

| # | Задача | Файл | Описание |
|---|--------|------|----------|
| 1 | Progress steps | `src/components/architect/progress-steps.tsx` | Живая лента событий вместо спиннера: "Обнаружен WordPress → Найдено 47 страниц..." |
| 2 | Count-up анимация | `result-client.tsx` | 0% → 45% за 2с при появлении секции Hero |
| 3 | Revenue ticker | `result-client.tsx` | Тикающий счётчик потерь: 0₽ → 127 000₽/мес |
| 4 | Chart.js графики | `src/components/architect/report-charts.tsx` | Donut (потери по каналам) + Bar (roadmap impact) |
| 5 | Stagger reveal | `globals.css` | Секции появляются последовательно с задержкой |

### 🟣 Phase 3 — Marketplace API (глубокая аналитика)

| Маркетплейс | Источник | Данные | Файл |
|-------------|---------|--------|------|
| **Ozon** | docs.ozon.ru/api/seller | Выручка, просмотры, рейтинг, позиции, возвраты, финансы | `src/lib/architect/ozon-collector.ts` |
| **Wildberries** | openapi.wb.ru + github.com/salacoste/daytona-wildberries-typescript-sdk | Продажи, остатки, поисковые запросы | `src/lib/architect/wb-collector.ts` |
| **Авито** | developers.avito.ru | Объявления, просмотры, статистика | `src/lib/architect/avito-collector.ts` |

**Flow:** URL детект Ozon/WB → «Хотите глубокую аналитику? Добавьте API ключ продавца» → без ключа: базовый fetch → с ключом: реальные данные продавца

### 🟡 Phase 4 — Генерация контента

- Кнопка «Создать КП из анализа» → Architect отчёт конвертируется в Proposal V3 (`doc-*` блоки)
- SEO-статья по нише из `growth_opportunities`
- Pinterest стратегия (10–15 идей пинов)
- Контент-план на месяц

### 🔴 Phase 5 — SaaS

- Тарифы: Free (3/день) / Pro (unlimited + API) / Agency (white-label)
- `architect_widget_installs` таблица — отслеживание сайтов с виджетом
- Playwright worker для платного тарифа (отдельный Node.js процесс, MySQL queue)

---

## 🔧 DEPLOY КОМАНДА

```bash
npm run build && pm2 restart konversus-fpb --update-env
```

**Process:** PM2 id=4, name=konversus-fpb  
**Live:** https://konversus.ru/architect

---

*Документ поддерживается актуальным. При добавлении нового функционала — обновлять этот файл.*

---

## 📋 ЧТО БЫЛО СДЕЛАНО СЕГОДНЯ

### ✅ ЗАВЕРШЕНО

---

#### 🟢 [DONE] Фаза 1 — Foundation

| Файл | Описание |
|------|----------|
| `sql/003_architect_mysql.sql` | Таблица `architect_projects` — id, url, source_type, ip_hash, status ENUM, snapshot_json, result_json, model_used, error_message |
| `src/lib/architect/types.ts` | Все TypeScript-типы: `SourceType`, `ProjectStatus`, `ArchitectSnapshot`, `ArchitectReport` (6 секций: positioning_map, revenue_leaks, growth_opportunities, roadmap, digital_assets, summary) |
| `src/lib/data/architect.ts` | Data layer: `createArchitectProject()`, `getArchitectProject()`, `updateArchitectSnapshot()`, `updateArchitectResult()`, `markArchitectFailed()`, `countTodayProjectsByIp()` |
| `src/lib/data/settings.ts` | Добавлены ключи: `openrouter_api_key`, `architect_fast_model`, `architect_strong_model`, `architect_daily_limit` |

---

#### 🟢 [DONE] Фаза 2 — URL Auto-Detection

| Файл | Описание |
|------|----------|
| `src/lib/architect/url-detector.ts` | `detectSourceType(url)` — regex-детект Ozon / WB / Авито-продавец / Авито-объявление / Сайт. `validateUrl()`. Reuse в виджете и на сервере |

**Паттерны детекта:**
- `ozon.ru/*` → `"ozon"`
- `wildberries.ru/wb.ru/*` → `"wb"`
- `avito.ru/companies|brands|user|shop/*` → `"avito-seller"`
- `avito.ru/*` → `"avito-listing"`
- остальное → `"website"`

---

#### 🟢 [DONE] Фаза 3 — Data Collector (fetch-only, без Playwright)

| Файл | Описание |
|------|----------|
| `src/lib/architect/data-collector.ts` | `collectSnapshot(url, type)` — 5 сценариев: website, ozon, wb, avito-seller, avito-listing |

**Website snapshot извлекает:**
- title, description, h1, headings[] (до 20)
- word_count, image_count, link_count
- CMS detection (WordPress/Tilda/Bitrix/Shopify/Wix/InSales/Ecwid/Joomla/Drupal)
- SEO: title length, description length, h1_count, has_schema_org, has_og_tags
- Speed heuristic: external_scripts_count, inline_styles_bytes, has_resource_hints
- raw_text (5000 символов для AI)

---

#### 🟢 [DONE] Фаза 4 — AI Engine (двухступенчатый)

| Файл | Описание |
|------|----------|
| `src/lib/architect/ai-analyzer.ts` | Stage 1 + Stage 2, reuse `callOpenRouter()` |

**Архитектура:**
```
Stage 1 → Gemini Flash (дёшево, быстро)
  Вход: ArchitectSnapshot
  Выход: ниша, аудитория, detected_problems[], missing_assets[], seo_signals, trust_signals

Stage 2 → Claude 3.5 Sonnet / GPT-4 (умная модель)
  Вход: Stage 1 результат
  Выход: ArchitectReport с 6 секциями
```

**Промпт Stage 2** формирует:
- `growth_potential_pct` (реалистичная оценка 10–80%)
- `verdict` — краткий честный вердикт
- `positioning_map` — текущий образ vs потенциал, gaps, brand keywords
- `revenue_leaks[]` — канал, статус (missing/weak/present), estimated_loss в рублях
- `growth_opportunities[]` — title, description, impact, effort, type
- `roadmap[]` — task, category, complexity, timeline, revenue_impact_pct
- `digital_assets[]` — asset, purpose, priority (must/should/nice)
- `summary` — призыв к действию

---

#### 🟢 [DONE] Фаза 5 — Pipeline + API

| Файл | Описание |
|------|----------|
| `src/lib/architect/pipeline.ts` | `runArchitectPipeline()` — collect → stage1 → stage2 → save, при ошибке → markFailed |
| `src/app/api/architect/analyze/route.ts` | POST, **CORS открыт** (виджет с любого домена), rate limit по ip_hash, `void runArchitectPipeline()` |
| `src/app/api/architect/[id]/route.ts` | GET polling endpoint |

**Rate limiting:** ip_hash (SHA-256) + COUNT за 24ч < `architect_daily_limit` из site_settings

---

#### 🟢 [DONE] Фаза 6 — Frontend

| Файл | Описание |
|------|----------|
| `src/components/architect/input-form.tsx` | `"use client"` — URL input с live-детектом типа (badge появляется при вводе), Submit → fetch API → redirect |
| `src/app/architect/page.tsx` | Публичный лендинг: badge + hero + форма + 3 benefit карточки |
| `src/components/architect/result-client.tsx` | Polling каждые 3с, loading states, 6 секций отчёта |
| `src/app/architect/[id]/page.tsx` | SSR wrapper: `getArchitectProject()` → `ArchitectResultClient` |

**6 секций результата:**
1. Hero (URL, вердикт, growth_potential_%)
2. Позиционирование (текущий → потенциал, gaps, keywords)
3. Потери дохода (карточки по каналам с цветовой кодировкой)
4. Возможности роста (карточки с impact/effort)
5. Roadmap (таблица задач с +X% дохода)
6. Digital Assets (must/should/nice)
7. CTA → Telegram + новый анализ

---

#### 🟢 [DONE] Фаза 7 — Embeddable Widget

| Файл | Описание |
|------|----------|
| `public/architect-widget.js` | Vanilla JS, без зависимостей, ~5KB, inline стили |

**Вставка на любой сайт:**
```html
<div id="architect-widget"></div>
<script src="https://konversus.ru/architect-widget.js" data-theme="dark"></script>
```

**Атрибуты:** `data-theme="dark|light"`, `data-container="custom-id"`  
**Live-детект:** badge показывается при вводе URL (Ozon/WB/Авито/Сайт)  
**Submit:** открывает результат в новой вкладке  
**Брендинг:** "Powered by Konversus" (маркетинговый буст)

---

#### 🟢 [DONE] Фаза 8 — Admin Settings

- В `/dashboard/settings` добавлена секция **«AI Business Growth Architect»**
- Поля: API Key, Fast Model, Strong Model, Daily Limit
- Копируемый embed-код виджета
- Статус-таблица интеграций

---

#### 🟢 [DONE] CSS Namespace

- `.arc-*` — 400+ строк в `globals.css`
- Не пересекается с `.fpb-*`, `.ev3-*`, `.db-*`, `.dv3-*`
- Dark theme by default
- Responsive (mobile breakpoints для positioning grid и benefits)

---

#### 🟢 [DONE] Деплой

```bash
mysql ... < sql/003_architect_mysql.sql  # ✓ Migration applied
npm run build                            # ✓ Build successful
pm2 restart konversus-fpb --update-env  # ✓ Process restarted (id=4)
```

**Live:** [konversus.ru/architect](https://konversus.ru/architect)  
*Примечание: для работы нужен OpenRouter API ключ в settings*

---

---

## 🗺️ ДОРОЖНАЯ КАРТА РАЗВИТИЯ

---

### 🔵 PHASE 2 — WOW-ЭФФЕКТЫ (приоритет: высокий)

> Цель: сделать момент анализа незабываемым. Пользователь должен почувствовать что AI реально "думает" над его бизнесом.

---

#### 🌟 2.1 Анимированный прогресс анализа

**Идея:** Вместо простого спиннера — живая лента событий.

```
[■■■□□□□□□□]  Сканируем сайт...
[■■■■■■□□□□]  Определяем нишу...
[■■■■■■■■□□]  AI анализирует позиционирование...
[■■■■■■■■■■]  Формируем стратегию роста...
```

**Реализация:**
- `status` из polling → набор псевдо-шагов с таймингом
- CSS `@keyframes` для появления строк (typewriter effect)
- Факты о бизнесе появляются по мере анализа (если snapshot уже готов)
- Статус `collecting` → показываем найденные данные: "Обнаружен WordPress", "Найдено 47 страниц", "CMS: Tilda"

---

#### 🌟 2.2 Reveal-анимация результата

**Идея:** Секции появляются не сразу, а последовательно с эффектом.

```css
/* stagger animation */
.arc-section:nth-child(1) { animation-delay: 0s }
.arc-section:nth-child(2) { animation-delay: 0.15s }
...
```

- Hero → fade+scale up
- Цифра growth_potential_pct — **count-up анимация** (0% → 45%)
- Карточки revenue_leaks — slide in from left
- Roadmap строки — появляются одна за другой

---

#### 🌟 2.3 Интерактивные графики (Chart.js — легковесный)

**Revenue Leaks → Donut chart:**
```
Потери по каналам: SEO 40% | Pinterest 25% | Контент 20% | Соцсети 15%
```

**Roadmap → Impact bar chart:**
```
SEO статьи     ████████ +35%
Лендинг        ██████   +25%
Pinterest      ████     +18%
```

**Реализация:**
- `chart.js` через CDN в виджете (или lazy import в Next)
- Данные из `ArchitectReport` → Chart.js datasets
- Анимация при появлении canvas в viewport (IntersectionObserver)

---

#### 🌟 2.4 "Живой" счётчик потерь

**Идея:** В секции Revenue Leaks — анимированный счётчик который "считает потери".

```
Ежемесячные потери: 0 ₽ → 127 000 ₽
(анимация 2 секунды, count-up)
```

Психологический эффект: пользователь видит как "деньги утекают" — мотивация действовать.

---

#### 🌟 2.5 Sharing & virality

**Кнопки после анализа:**
- "Поделиться анализом" → публичная ссылка (уже работает через `/architect/[id]`)
- "Скачать PDF" → через `/architect/[id]/pdf` (используя существующий `proposal-html-renderer`)
- "Скопировать краткий отчёт" → markdown-summary для мессенджеров

---

---

### 🟣 PHASE 3 — MARKETPLACE DEEP ANALYTICS

> Ключевое открытие из исследования: **Ozon и Wildberries имеют официальные API**

---

#### 🔑 3.1 Ozon Seller API (официальный)

**Источник:** [docs.ozon.ru/api/seller/](https://docs.ozon.ru/api/seller/)  
**GitHub reference:** [woyaxnini/mcp-ozon-seller](https://github.com/woyaxnini/mcp-ozon-seller) — TypeScript, MIT

**Доступные данные через API:**

| Группа | Метод | Данные |
|--------|-------|--------|
| Analytics | `get_analytics` | Продажи, выручка, просмотры, возвраты за любой период |
| Products | `list_products` | Карточки, статусы, атрибуты |
| Prices | `get_prices` | Цены + ценовой индекс (позиция vs конкуренты) |
| Stocks | `get_stocks` | Остатки по складам |
| Rating | `get_seller_rating` | Индекс качества продавца |
| Finance | `get_finance_report` | Cash flow, комиссии, выплаты |
| Returns | `list_fbo_returns` | Возвраты с причинами |

**Как интегрировать:**
```
Пользователь вводит:
  1. URL магазина на Ozon
  2. (опционально) Client-Id + Api-Key из личного кабинета

Режим без ключа → public fetch (заголовок, категории, рейтинг)
Режим с ключом → полный API (продажи, позиции, финансы)
```

**Файл для создания:** `src/lib/architect/ozon-collector.ts`

---

#### 🔑 3.2 Wildberries API (официальный)

**Документация:** [openapi.wb.ru](https://openapi.wb.ru/)  
**GitHub reference:** [salacoste/daytona-wildberries-typescript-sdk](https://github.com/salacoste/daytona-wildberries-typescript-sdk) — TypeScript, 5★

**Доступные данные:**
- Статистика продаж (`/api/v1/supplier/sales`)
- Остатки и заказы (`/api/v1/supplier/orders`)
- Поисковые запросы по товарам
- Позиции в поиске

**Файл для создания:** `src/lib/architect/wb-collector.ts`

---

#### 🔑 3.3 Авито (публичное API)

**Доступен через:** [developers.avito.ru](https://developers.avito.ru/)  
**Данные продавца:** объявления, просмотры, сообщения, статистика по категориям

---

#### 🔑 3.4 Новый flow с API-ключами

```
/architect → ввод URL → детект Ozon/WB
     ↓
"Хотите получить глубокую аналитику?"
"Подключите API ключ продавца (необязательно)"
     ↓
Без ключа → public snapshot → AI → базовый отчёт
С ключом → seller API → реальные данные → premium отчёт
```

**Дополнительные поля в `architect_projects`:**
```sql
marketplace_api_key VARCHAR(255) NULL  -- зашифрован
marketplace_client_id VARCHAR(64) NULL
has_api_access TINYINT DEFAULT 0
```

---

---

### 🟡 PHASE 4 — АВТОМАТИЗАЦИЯ И КОНТЕНТ

---

#### ⚡ 4.1 Генерация SEO-статей

После анализа — кнопка "Сгенерировать SEO-статью".
- AI берёт нишу + growth_opportunities → пишет статью под ключевые запросы
- Статья → сохраняется как `doc-text` блок в новом Proposal
- Экспорт в HTML/PDF

#### ⚡ 4.2 Pinterest-стратегия

- AI генерирует 10–15 идей пинов по нише
- Заголовки + описания + теги
- Экспорт как content plan в PDF/таблицу

#### ⚡ 4.3 Контент-план на месяц

- Из `growth_opportunities` → расписание постов
- Форматы: ВК, Telegram, email
- Сохранение в Proposal как `doc-section` + `doc-text`

#### ⚡ 4.4 Конвертация отчёта в Proposal

**Кнопка "Создать КП из анализа"** на странице результата:
- Architect отчёт → `proposalBlockTemplates` V3
- Каждая секция → `doc-section` + `doc-text` блок
- Автоматически создаётся новый Proposal в дашборде
- Открывается редактор V3 с предзаполненным контентом

---

---

### 🔴 PHASE 5 — SAAS & MONETIZATION

---

#### 💰 5.1 Лимиты и тарифы

```
Free:    3 анализа/день, только сайты, базовый отчёт
Pro:     unlimited, маркетплейсы, API-доступ, PDF export
Agency:  white-label виджет, кастомный CTA, аналитика виджетов
```

#### 💰 5.2 Аналитика виджетов

Таблица `architect_widget_installs`:
- domain, install_date, total_submissions
- conversion_rate (submissions → visits to konversus.ru)

Дашборд в admin → видно на каких сайтах стоит виджет и сколько лидов приносит.

#### 💰 5.3 Playwright Worker (фаза 5)

Для платного тарифа — полный краулинг:
- Отдельный Node.js worker process
- MySQL queue `architect_scan_queue`
- Batch: random delay 2–7s, user-agent rotation, no concurrency per domain
- Snapshot независим от анализа (переиспользуется 24ч)

---

---

## 🔍 ИССЛЕДОВАНИЕ: ОТКРЫТЫЕ ИНСТРУМЕНТЫ

### Ozon & Wildberries

| Инструмент | Тип | Stars | Ссылка | Применимость |
|-----------|-----|-------|--------|-------------|
| **mcp-ozon-seller** | TypeScript MCP Server | 2★ | [github](https://github.com/woyaxnini/mcp-ozon-seller) | 🟢 Высокая — 26 методов Ozon API: аналитика, продажи, рейтинг |
| **daytona-wildberries-typescript-sdk** | TypeScript SDK | 5★ | [github](https://github.com/salacoste/daytona-wildberries-typescript-sdk) | 🟢 Высокая — type-safe WB API client с rate limiting |
| **wb-analytics-app** | Vue 3 SPA | 0★ | [github](https://github.com/KiryaChukreev/wb-analytics-app) | 🟡 Средняя — референс для UI графиков |
| **WB-Analytics-Parser** | Python FastAPI | 0★ | [github](https://github.com/Scarsgard-S/WB-Analytics-Parser) | 🟡 Средняя — идеи для парсинга |
| **sellico-ads-intelligence** | Go backend | 1★ | [github](https://github.com/panfiloveshow/sellico-ads-intelligence-backend) | 🟡 Референс — multi-tenant реклама WB |

### Вывод
> ✅ **Официальный Ozon Seller API** (docs.ozon.ru/api/seller) — это правильный путь.  
> Доступ через `Client-Id` + `Api-Key` из личного кабинета продавца.  
> Даёт реальные данные: выручка, просмотры, позиции, возвраты — без scraping.  
> **Рекомендация:** Добавить в Phase 3 — поле для API ключа на странице `/architect` с объяснением зачем.

---

---

## 📁 СТРУКТУРА ФАЙЛОВ МОДУЛЯ

```
src/
├── lib/
│   ├── architect/
│   │   ├── types.ts          ✅ готово
│   │   ├── url-detector.ts   ✅ готово
│   │   ├── data-collector.ts ✅ готово (fetch-only)
│   │   ├── ai-analyzer.ts    ✅ готово (2-stage)
│   │   ├── pipeline.ts       ✅ готово
│   │   ├── ozon-collector.ts 📋 планируется (Phase 3)
│   │   └── wb-collector.ts   📋 планируется (Phase 3)
│   └── data/
│       └── architect.ts      ✅ готово
├── app/
│   ├── api/
│   │   └── architect/
│   │       ├── analyze/route.ts  ✅ готово
│   │       └── [id]/route.ts     ✅ готово
│   └── architect/
│       ├── page.tsx              ✅ готово
│       └── [id]/page.tsx         ✅ готово
├── components/
│   └── architect/
│       ├── input-form.tsx        ✅ готово
│       ├── result-client.tsx     ✅ готово
│       ├── progress-steps.tsx    📋 планируется (Phase 2)
│       └── report-charts.tsx     📋 планируется (Phase 2)
sql/
└── 003_architect_mysql.sql       ✅ применена
public/
└── architect-widget.js           ✅ готово
```

---

---

## ⚡ БЛИЖАЙШИЕ ЗАДАЧИ (следующая сессия)

### Приоритет 1 — Настроить и протестировать

- [ ] Вставить OpenRouter API ключ в `/dashboard/settings → AI Architect`
- [ ] Протестировать реальный анализ на konversus.ru
- [ ] Проверить polling и результат
- [ ] Вставить виджет на тестовый HTML и проверить CORS

### Приоритет 2 — WOW эффекты (Phase 2)

- [ ] Компонент `progress-steps.tsx` — живая лента событий при анализе
- [ ] Count-up анимация для `growth_potential_pct` и потерь дохода
- [ ] Stagger reveal для секций результата
- [ ] Chart.js интеграция (donut для потерь, bar для roadmap)

### Приоритет 3 — Ozon API

- [ ] Изучить [docs.ozon.ru/api/seller](https://docs.ozon.ru/api/seller/)
- [ ] Создать `src/lib/architect/ozon-collector.ts` с методами `get_analytics`, `get_seller_rating`, `get_prices`
- [ ] Добавить опциональное поле API ключа на `/architect` для Ozon/WB

---

---

## 🔧 ТЕХНИЧЕСКАЯ КОНФИГУРАЦИЯ

```yaml
URL: https://konversus.ru/architect
API: POST /api/architect/analyze (CORS open)
     GET  /api/architect/[id] (CORS open)

DB: factory_proposal_builder.architect_projects
Process: PM2 id=4 konversus-fpb

Settings keys:
  openrouter_api_key    → ключ от openrouter.ai
  architect_fast_model  → default: google/gemini-flash-1.5
  architect_strong_model → default: anthropic/claude-3.5-sonnet
  architect_daily_limit → default: 10

Widget embed:
  <div id="architect-widget"></div>
  <script src="https://konversus.ru/architect-widget.js" data-theme="dark"></script>
```

---

*Документ для AI агентов. Последнее обновление: 8 июня 2026.*
