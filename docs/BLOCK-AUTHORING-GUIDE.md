# Правила изготовления блоков для редактора

> Этот документ — обязательная инструкция для любого агента или разработчика, который добавляет новый тип блока в proposal builder.
> Нарушение порядка шагов гарантированно приведёт к тому, что блок либо не появится в редакторе, либо не будет рендериться на публичной странице.

---

## Архитектура блочной системы

Каждый блок живёт в четырёх слоях одновременно:

| Слой | Файл | Роль |
|------|------|------|
| **Типы** | `src/types/domain.ts` | TypeScript-тип блока и его payload |
| **Каталог** | `src/lib/proposal-builder.ts` | Метаданные, шаблон создания, нормализатор |
| **Сервер** | `src/app/dashboard/proposals/[proposalId]/actions.ts` | Парсинг новых полей из FormData |
| **Редактор** | `src/components/builder/active-block-editor.tsx` | Inspector-панель (поля слева) |
| **Редактор v2** | `src/components/builder/editor-canvas-v2.tsx` | Кнопка в каталоге + правая панель настроек |
| **HTML preview** | `src/lib/proposal-html-renderer.ts` | Рендер блока в canvas-превью редактора (iframe) |
| **Рендер** | `src/components/share/block-renderers.tsx` | Визуальный компонент на публичной share-странице |
| **Стили** | `src/app/globals.css` | CSS-классы блока (внутри `.fpb-page`) |

**Важно:** редактор использует `editor-canvas-v2.tsx`, а не `_editor-canvas-v1.tsx`. Версия v1 — устаревший файл, не трогать.

**Важно:** canvas в редакторе — это `<iframe>` с отдельным HTML-документом, который генерирует `proposal-html-renderer.ts`. Этот файл содержит собственные inline-стили. Стили из `globals.css` туда **не попадают** — нужно дублировать CSS блока в renderer.

---


---

## Частые ошибки и best practices

### 1. Запрет на inline-стили
- Не используйте inline-стили для типографики, размеров, цветов — только CSS custom properties и медиазапросы.
- Все размеры шрифтов, отступы и цвета должны идти через переменные и правила в `.fpb-page { ... }`.

### 2. Дублирование CSS для canvas/SSR
- Canvas редактора — это отдельный iframe, стили из `globals.css` туда не попадают.
- Для каждого нового блока обязательно дублируйте CSS в `proposal-html-renderer.ts` (inline-стили).

### 3. Использование blockColorVars и токенов
- Для передачи цветов используйте функцию `blockColorVars(bg, ink, defaultBg, defaultInk)`.
- Цветовые переменные: `--block-bg`, `--block-ink`.

### 4. Пример правильного рендера HTML-блока

**Неправильно:**
```tsx
<div dangerouslySetInnerHTML={{ __html: html }} />
```

**Правильно:**
```tsx
<ClientHtmlBlock html={html} className="custom-block" />
```

### 5. JS-интерактив
- Любой JS для публичной страницы должен быть либо в IIFE `<script>`, либо в строго client-компоненте.

---

## Пошаговая инструкция

### Шаг 1 — `src/types/domain.ts`

Добавить новый тип в union `ProposalBlockType`:

```typescript
export type ProposalBlockType =
  | "hero"
  | "editorial"
  // ... остальные типы
  | "my-new-block";   // ← добавить сюда
```

Если блок имеет уникальные payload-поля (не существующие в других блоках), добавить их в `ProposalBlockPayload`:

```typescript
export type ProposalBlockPayload = {
  // ... существующие поля
  myNewField?: string;
  myNewFieldDesktopSize?: number;
};
```

Правило: все поля `ProposalBlockPayload` — **опциональные** (`?`). Никаких обязательных полей не добавлять.

---

### Шаг 2 — `src/lib/proposal-builder.ts`

Три места в этом файле.

#### 2а. Метаданные каталога

В объект `proposalBlockSemanticMetadata` добавить запись для нового типа:

```typescript
"my-new-block": {
  ...defaultSemanticMetadata,
  semanticCategory: "custom-blocks",  // одна из proposalBlockCategories
  icon: "IconName",                   // имя Lucide-иконки (строка)
  tags: ["tag1", "tag2"],
  schema: ["eyebrow", "headline", "myNewField"],
  variants: ["default"],
  catalogEnabled: true,               // false — не показывать в каталоге
  narrativeRole: "Описание блока.",
},
```

Доступные значения `semanticCategory`: `"hero-blocks"`, `"audit-blocks"`, `"problem-blocks"`, `"seo-blocks"`, `"trust-blocks"`, `"product-blocks"`, `"media-blocks"`, `"ai-enhanced-blocks"`, `"strategy-blocks"`, `"cta-blocks"`, `"process-blocks"`, `"industrial-blocks"`, `"analytics-blocks"`, `"contact-blocks"`, `"custom-blocks"`.

#### 2б. Шаблон создания блока

В массив `proposalBlockTemplates` добавить объект:

```typescript
{
  type: "my-new-block",
  category: "Структура",       // отображаемая категория в select
  label: "Мой блок",
  description: "Короткое описание для подсказки в каталоге.",
  defaultTitle: "Новый блок",
  createPayload: () => ({
    headline: "Заголовок по умолчанию",
    backgroundColor: "#101820",
    textColor: "#f7f2ea",
    myNewField: "значение",
  }),
},
```

#### 2в. Нормализатор

В функции `normalizeProposalBlocks` в финальный spread добавить дефолты для новых полей:

```typescript
myNewField: block.payload?.myNewField ?? "default",
myNewFieldDesktopSize: typeof block.payload?.myNewFieldDesktopSize === "number"
  ? block.payload.myNewFieldDesktopSize
  : 20,
```

Правило: числа проверять через `typeof ... === "number"`, строки через `?? "default"`.

---

### Шаг 3 — `src/app/dashboard/proposals/[proposalId]/actions.ts`

В функции `updateProposalBlockAction` добавить парсинг новых полей из FormData (сразу после существующих полей аналогичного типа):

```typescript
// строковое поле
const myNewField = getStringValue(formData, "myNewField") || undefined;

// числовое поле
const myNewFieldDesktopSizeRaw = getStringValue(formData, "myNewFieldDesktopSize");
const myNewFieldDesktopSize = myNewFieldDesktopSizeRaw
  ? parseInt(myNewFieldDesktopSizeRaw, 10)
  : undefined;

// enum-поле
const myAlignRaw = getStringValue(formData, "myAlign");
const myAlign = (["left", "center", "right"].includes(myAlignRaw)
  ? myAlignRaw
  : undefined) as "left" | "center" | "right" | undefined;
```

В блок построения payload добавить условный spread:

```typescript
...(myNewField !== undefined && { myNewField }),
...(myNewFieldDesktopSize !== undefined && { myNewFieldDesktopSize }),
...(myAlign !== undefined && { myAlign }),
```

---

### Шаг 4 — `src/components/builder/active-block-editor.tsx`

#### 4а. Компонент полей inspector-а

Добавить новую функцию-компонент (после последнего существующего `*Fields` компонента, перед RENDER DISPATCH):

```tsx
function MyNewBlockFields({ p }: { p: ProposalBlockPayload }) {
  return (
    <>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Заголовок</span>
        <input className="editor-inspector-input" name="headline" defaultValue={p.headline ?? ""} />
      </label>
      {/* числовое поле */}
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Размер desktop (px)</span>
        <input
          className="editor-inspector-input"
          type="number"
          name="myNewFieldDesktopSize"
          min={14} max={120}
          defaultValue={p.myNewFieldDesktopSize ?? 20}
        />
      </label>
      {/* цвета — готовый компонент */}
      <BlockColorFields payload={p} />
    </>
  );
}
```

Доступные переиспользуемые компоненты внутри inspector-а:
- `<BlockColorFields payload={p} />` — поля фона и цвета текста
- `<RichTextWithHidden defaultValue={...} />` — TipTap WYSIWYG

#### 4б. Регистрация в `isFullyCustom`

Найти строку с `isFullyCustom` и добавить новый тип в массив:

```typescript
const isFullyCustom = ["hero", ..., "rich-text", "section-heading", "my-new-block"].includes(type);
```

#### 4в. Рендер поля в JSX inspector-а

В основном JSX `ActiveBlockEditor` найти место после других блоков и добавить строку:

```tsx
{type === "my-new-block" && <MyNewBlockFields p={p} />}
```

---

### Шаг 5 — `src/components/builder/editor-canvas-v2.tsx`

Три места.

#### 5а. Тип

Добавить новый тип в `InsertableBlockType`:

```typescript
type InsertableBlockType = "metrics" | "editorial" | ... | "section-heading" | "my-new-block";
```

#### 5б. Кнопка в каталоге

В JSX с кнопками `editor-v2-block-card` добавить кнопку в логическом месте:

```tsx
<button type="button" className="editor-v2-block-card" onClick={() => addBlock("my-new-block")}>
  <span>Мой блок</span>
  <small>Короткое описание для подсказки.</small>
</button>
```

#### 5в. Правая панель настроек

Правая панель — длинная цепочка `selectedBlock?.type === "..." ? (...) : selectedBlock?.type === "..." ? (...)`. Добавить новое звено **перед** финальным `: (` (fallback "Создать первый Hero"):

```tsx
) : selectedBlock?.type === "my-new-block" ? (
  <div className="editor-v2-props">
    <label className="editor-v2-field">
      <span>Заголовок</span>
      <textarea rows={3} value={selectedBlock.payload.headline || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { headline: event.target.value })} />
    </label>
    <div className="editor-v2-field-pair">
      <label className="editor-v2-field">
        <span>Цвет фона</span>
        <input type="color" value={selectedBlock.payload.backgroundColor || "#101820"} onChange={(event) => updateBlockPayload(selectedBlock.id, { backgroundColor: event.target.value })} />
      </label>
      <label className="editor-v2-field">
        <span>Цвет текста</span>
        <input type="color" value={selectedBlock.payload.textColor || "#f7f2ea"} onChange={(event) => updateBlockPayload(selectedBlock.id, { textColor: event.target.value })} />
      </label>
    </div>
    <button type="button" className="editor-v2-danger" onClick={removeSelectedBlock}>Удалить блок</button>
  </div>
) : (
```

---

### Шаг 6 — `src/lib/proposal-html-renderer.ts`

Canvas редактора — это `<iframe>` с отдельным HTML-документом. Стили из `globals.css` туда **не попадают**. Нужно добавить рендер блока и его CSS прямо в этот файл.

#### 6а. Рендер HTML

В функции `renderBlock` добавить `if`-ветку **перед** `return ""`

```typescript
if (block.type === "my-new-block") {
  const p = block.payload;
  const bg = p.backgroundColor || "#101820";
  const ink = p.textColor || "#f7f2ea";
  return `<section class="my-block" style="background:${bg};color:${ink};">
  <div class="my-block-inner">
    ${p.headline ? `<h2 class="my-block-headline">${escapeHtml(p.headline)}</h2>` : ""}
  </div>
</section>`;
}
```

#### 6б. CSS в inline-стилях

Найти конец блока стилей (перед закрывающим `</style>`) и добавить CSS:

```css
/* ── my-new-block ── */
.my-block { padding: 80px 0; }
.my-block-inner { max-width: 1200px; margin: 0 auto; padding: 0 clamp(24px, 5vw, 72px); }
.my-block-headline { font-size: 20px; font-weight: 700; margin: 0; }
@media (max-width: 768px) {
  .my-block { padding: 56px 0; }
}
```

---

### Шаг 7 — `src/components/share/block-renderers.tsx`

#### 7а. Компонент рендера

Добавить функцию-компонент перед секцией `RENDER DISPATCH`:

```tsx
// ══════════════════════════════════════════════════
// MY NEW BLOCK
// ══════════════════════════════════════════════════
function BlockMyNewBlock({ block }: { block: ProposalBlock }) {
  const p = block.payload;

  const style: CSSProperties = {
    ...blockColorVars(p.backgroundColor, p.textColor, "#101820", "#f7f2ea"),
    "--my-size": `${p.myNewFieldDesktopSize ?? 20}px`,
  } as CSSProperties;

  return (
    <section className="block my-block" style={style}>
      <div className="my-block-inner">
        {p.headline && <h2 className="my-block-headline">{p.headline}</h2>}
      </div>
    </section>
  );
}
```

Вспомогательная функция `blockColorVars(bg, ink, defaultBg, defaultInk)` уже есть в файле — использовать её.

#### 7б. Кейс в switch

В функции `renderBlock` добавить новый `case` (до `default`):

```typescript
case "my-new-block": return <BlockMyNewBlock key={block.id} block={block} />;
```

---

### Шаг 8 — `src/app/globals.css`

Все CSS блока пишутся **строго внутри** правила `.fpb-page { }`. Иначе стили попадут и в dashboard (сломают редактор).

```css
/* ══════════════════════════════════════════════════
   MY NEW BLOCK
   ══════════════════════════════════════════════════ */
.fpb-page .my-block {
  background: var(--block-bg, #101820);
  color: var(--block-ink, #f7f2ea);
  padding: 80px 0;
}

.fpb-page .my-block .my-block-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 48px;
}

.fpb-page .my-block-headline {
  font-size: var(--my-size, 20px);
  font-weight: 700;
  margin: 0;
}

@media (max-width: 768px) {
  .fpb-page .my-block { padding: 56px 0; }
  .fpb-page .my-block .my-block-inner { padding: 0 24px; }
}
```

Токены цвета блока устанавливаются через `blockColorVars` в компоненте:
- `--block-bg` — цвет фона (из `p.backgroundColor`)
- `--block-ink` — цвет текста (из `p.textColor`)

---

### Шаг 9 — Сборка и деплой

```bash
npm run build && pm2 restart konversus-fpb --update-env
```

Сборка должна пройти без TypeScript-ошибок. Если есть ошибки — исправить до деплоя.

---

## Контрольный чеклист

Перед деплоем проверить каждый пункт:

- [ ] `ProposalBlockType` содержит новый тип
- [ ] `ProposalBlockPayload` содержит новые поля (если есть)
- [ ] `proposalBlockSemanticMetadata` содержит запись с `catalogEnabled: true`
- [ ] `proposalBlockTemplates` содержит шаблон с `createPayload`
- [ ] `normalizeProposalBlocks` содержит дефолты для новых полей
- [ ] `updateProposalBlockAction` парсит новые поля из FormData
- [ ] `active-block-editor.tsx` содержит `*Fields` компонент
- [ ] `active-block-editor.tsx`: тип добавлен в `isFullyCustom`
- [ ] `active-block-editor.tsx`: JSX содержит `{type === "..." && <...Fields p={p} />}`
- [ ] `editor-canvas-v2.tsx`: тип добавлен в `InsertableBlockType`
- [ ] `editor-canvas-v2.tsx`: кнопка добавлена в каталог
- [ ] `editor-canvas-v2.tsx`: секция настроек добавлена в правую панель
- [ ] `proposal-html-renderer.ts`: HTML-рендер добавлен в `renderBlock`
- [ ] `proposal-html-renderer.ts`: CSS добавлен в inline-стили
- [ ] `block-renderers.tsx`: компонент-рендер добавлен
- [ ] `block-renderers.tsx`: `case "..."` добавлен в `renderBlock`
- [ ] `globals.css`: стили добавлены внутри `.fpb-page {}`
- [ ] `npm run build` прошёл без ошибок

---

## Типовые ошибки

**Блок не появился в каталоге справа**
→ Забыли добавить тип в `InsertableBlockType` или кнопку в `editor-canvas-v2.tsx`. Каталог слева (`_editor-canvas-v1.tsx`) — устаревший файл, не используется.

**Canvas в редакторе пустой (знак вопроса)**
→ Забыли добавить рендер в `proposal-html-renderer.ts`. Canvas — это отдельный iframe, стили из `globals.css` туда не попадают.

**Блок не рендерится на share-странице**
→ Забыли добавить `case` в `renderBlock` или сам компонент в `block-renderers.tsx`.

**TypeScript-ошибка при сборке**
→ Новый тип не добавлен в `ProposalBlockType`, или поле не добавлено в `ProposalBlockPayload`.

**Нет настроек справа при выборе блока**
→ Забыли добавить звено в цепочку условий правой панели `editor-canvas-v2.tsx`. Оно падает в fallback "Создать первый Hero".

**Inspector не показывает поля (active-block-editor)**
→ Забыли добавить тип в `isFullyCustom`, или забыли `{type === "..." && ...}` в JSX.

**Стили ломают dashboard**
→ CSS написан вне `.fpb-page {}`. Всё должно быть внутри этого правила.

**Новые поля не сохраняются**
→ Не добавлен парсинг в `updateProposalBlockAction` (Шаг 3) или нормализатор (Шаг 2в).

**React error #418 — share-страница крашится целиком**
→ Блок использует `dangerouslySetInnerHTML` с произвольным HTML (Tiptap, пользовательский HTML) в server-компоненте. Браузер нормализует некоторые HTML-структуры иначе чем Node.js SSR (например `<div>` внутри `<p>`) → мисматч гидрации → крэш. `suppressHydrationWarning` на одном элементе не помогает — он игнорирует только атрибуты, не дочерние узлы.

**Правило**: любой блок с произвольным HTML-контентом на share-странице ДОЛЖЕН использовать `ClientHtmlBlock` из `src/components/share/client-html-block.tsx`:
```tsx
import { ClientHtmlBlock } from "./client-html-block";

// Для rich-text (Tiptap):
<ClientHtmlBlock html={p.richTextHtml} className="rich-text-content"
  wrapperClassName="block" wrapperStyle={style} eyebrow={p.eyebrow} />

// Для custom HTML:
<ClientHtmlBlock html={p.customHtml} className="custom-block" />
```
Этот компонент рендерит пустой контейнер на сервере и заполняет `innerHTML` через `useEffect` на клиенте → гидрация всегда чистая.

**Мобильный размер шрифта не меняется на реальном устройстве (share-страница)**
→ В компоненте `block-renderers.tsx` на элемент поставлен inline `style={{ fontSize }}`. Inline-стили имеют наивысший приоритет CSS (specificity 1,0,0,0) и перекрывают `@media (max-width: 768px)` в globals.css.

**Правило для share-страницы**: типографические размеры задаются через CSS custom properties (`--my-size-desktop`, `--my-size-mobile`) на родительском `<section>`, а сами правила — в `globals.css` через `var()` + media query. Inline `fontSize` в JSX не использовать.

**Правило для editor preview** (`proposal-html-renderer.ts`): там media queries ненадёжны в srcdoc iframe, поэтому там inline font-size — это норма. `renderBlock(block, options)` принимает `options.mobile` и сам выбирает нужный размер.
