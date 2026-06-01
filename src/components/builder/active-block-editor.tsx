"use client";

import { useState } from "react";

import { updateProposalBlockAction } from "@/app/dashboard/proposals/[proposalId]/actions";
import {
  getProposalBlockCategory,
  getProposalBlockLabel,
} from "@/lib/proposal-builder";
import type { ProposalBlock, ProposalBlockPayload } from "@/types/domain";
import { TiptapEditor } from "./tiptap-editor";

type ActiveBlockEditorProps = {
  proposalId: string;
  block: ProposalBlock;
  index: number;
  sidebar?: string;
};

// ── Вспомогательные форматтеры ──────────────────────────────────────────────

function formatMetrics(metrics: ProposalBlockPayload["metrics"]) {
  return (metrics ?? []).map((m) => `${m.label}: ${m.value}`).join("\n");
}

function formatTimelineSteps(steps: ProposalBlockPayload["timelineSteps"]) {
  return (steps ?? []).map((s) => [s.index, s.title, s.body].filter(Boolean).join(" | ")).join("\n");
}

function formatCommercialCards(cards: ProposalBlockPayload["commercialCards"]) {
  return (cards ?? [])
    .map((c) => [c.label, c.price, c.meta, c.featured ? "featured" : undefined].filter(Boolean).join(" | "))
    .join("\n");
}

function formatContacts(contacts: ProposalBlockPayload["contacts"]) {
  return (contacts ?? []).map((c) => [c.label, c.value, c.href].filter(Boolean).join(" | ")).join("\n");
}

function formatPhotos(photos: ProposalBlockPayload["photos"]) {
  return (photos ?? []).map((p) => [p.url, p.meta, p.caption].filter(Boolean).join(" | ")).join("\n");
}

// ── Поле выбора цвета ────────────────────────────────────────────────────────

function ColorField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <label className="editor-inspector-fieldset">
      <span className="editor-inspector-label">{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="color"
          value={value || "#101820"}
          onChange={(e) => setValue(e.target.value)}
          style={{
            width: 36,
            height: 32,
            padding: "2px 3px",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            cursor: "pointer",
            background: "transparent",
            flexShrink: 0,
          }}
        />
        <input
          className="editor-inspector-input"
          type="text"
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="пусто = по умолчанию"
          style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
        />
      </div>
    </label>
  );
}

function BlockColorFields({ payload }: { payload: ProposalBlockPayload }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <ColorField label="Фон блока" name="backgroundColor" defaultValue={payload.backgroundColor} />
      <ColorField label="Цвет текста" name="textColor" defaultValue={payload.textColor} />
    </div>
  );
}

// ── Поля конкретных типов ────────────────────────────────────────────────────

function HeroFields({ p }: { p: ProposalBlockPayload }) {
  return (
    <>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Вариант обложки</span>
        <select className="editor-inspector-input" name="heroVariant" defaultValue={p.heroVariant ?? "image-split"}>
          <option value="image-split">Тёмный фон + фото (разворот)</option>
          <option value="color-photo-right">Цветной фон + фото справа</option>
          <option value="color-photo-left">Цветной фон + фото слева</option>
        </select>
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">URL фонового изображения</span>
        <input className="editor-inspector-input" name="backgroundImageUrl" defaultValue={p.backgroundImageUrl ?? ""} placeholder="https://..." />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">URL фото (справа / слева)</span>
        <input className="editor-inspector-input" name="photoUrl" defaultValue={p.photoUrl ?? ""} placeholder="https://..." />
      </label>
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Заголовок desktop (px)</span>
          <input className="editor-inspector-input" type="number" name="headlineDesktopSize" min={32} max={120} defaultValue={p.headlineDesktopSize ?? 56} />
        </label>
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Заголовок mobile (px)</span>
          <input className="editor-inspector-input" type="number" name="headlineMobileSize" min={26} max={72} defaultValue={p.headlineMobileSize ?? 34} />
        </label>
      </div>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Прозрачность оверлея, % (0–92)</span>
        <input className="editor-inspector-input" type="number" name="overlayOpacity" min={0} max={92} defaultValue={p.overlayOpacity ?? 72} />
      </label>
      <BlockColorFields payload={p} />
    </>
  );
}

function VideoFields({ p }: { p: ProposalBlockPayload }) {
  return (
    <>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Ссылка на видео (YouTube / Vimeo / mp4)</span>
        <input className="editor-inspector-input" name="videoUrl" defaultValue={p.videoUrl ?? ""} placeholder="https://youtu.be/..." />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">URL постера (превью)</span>
        <input className="editor-inspector-input" name="videoPoster" defaultValue={p.videoPoster ?? ""} placeholder="https://..." />
      </label>
      <BlockColorFields payload={p} />
    </>
  );
}

function GalleryPhotoFields({ p }: { p: ProposalBlockPayload }) {
  return (
    <>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Надзаголовок</span>
        <input className="editor-inspector-input" name="eyebrow" defaultValue={p.eyebrow ?? ""} />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Заголовок галереи</span>
        <input className="editor-inspector-input" name="headline" defaultValue={p.headline ?? ""} />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Описание</span>
        <textarea className="editor-inspector-area min-h-20" name="body" defaultValue={p.body ?? ""} />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Фотографии (url | описание | подпись)</span>
        <textarea
          className="editor-inspector-area min-h-28"
          name="photos"
          defaultValue={formatPhotos(p.photos)}
          placeholder={"https://example.com/photo1.jpg | Описание | Подпись\nhttps://example.com/photo2.jpg"}
        />
      </label>
      <BlockColorFields payload={p} />
    </>
  );
}

function GalleryShowcaseFields({ p }: { p: ProposalBlockPayload }) {
  return (
    <>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">URL фото</span>
        <input className="editor-inspector-input" name="photoUrl" defaultValue={p.photoUrl ?? ""} placeholder="https://..." />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Подпись под фото</span>
        <textarea
          className="editor-inspector-area min-h-16"
          name="body"
          defaultValue={p.body ?? ""}
          placeholder="Необязательный текст под фотографией"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Размер текста Desktop (px)</span>
          <input className="editor-inspector-input" type="number" name="captionDesktopSize" min={12} max={40} defaultValue={p.captionDesktopSize ?? 16} />
        </label>
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Размер текста Mobile (px)</span>
          <input className="editor-inspector-input" type="number" name="captionMobileSize" min={12} max={32} defaultValue={p.captionMobileSize ?? 14} />
        </label>
      </div>
      <BlockColorFields payload={p} />
    </>
  );
}

function BeforeAfterFields({ p }: { p: ProposalBlockPayload }) {
  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Заголовок «До»</span>
          <input className="editor-inspector-input" name="beforeTitle" defaultValue={p.beforeTitle ?? ""} />
        </label>
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Заголовок «После»</span>
          <input className="editor-inspector-input" name="afterTitle" defaultValue={p.afterTitle ?? ""} />
        </label>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Пункты «До»</span>
          <textarea
            className="editor-inspector-area min-h-28"
            name="beforeItems"
            defaultValue={(p.beforeItems ?? []).join("\n")}
            placeholder="Один пункт на строку"
          />
        </label>
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Пункты «После»</span>
          <textarea
            className="editor-inspector-area min-h-28"
            name="afterItems"
            defaultValue={(p.afterItems ?? []).join("\n")}
            placeholder="Один пункт на строку"
          />
        </label>
      </div>
      <BlockColorFields payload={p} />
    </>
  );
}

function TimelineFields({ p }: { p: ProposalBlockPayload }) {
  return (
    <>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Этапы (номер | название | описание)</span>
        <textarea
          className="editor-inspector-area min-h-32"
          name="timelineSteps"
          defaultValue={formatTimelineSteps(p.timelineSteps)}
          placeholder={"01 | Анализ | Изучаем задачу\n02 | Разработка | Создаём решение"}
        />
      </label>
      <BlockColorFields payload={p} />
    </>
  );
}

function CommercialFields({ p }: { p: ProposalBlockPayload }) {
  return (
    <>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Карточки (название | цена | описание | featured)</span>
        <textarea
          className="editor-inspector-area min-h-28"
          name="commercialCards"
          defaultValue={formatCommercialCards(p.commercialCards)}
          placeholder={"Базовый | от 50 000 ₽ | Подходит для старта\nПремиум | от 120 000 ₽ | Полный цикл | featured"}
        />
      </label>
      <BlockColorFields payload={p} />
    </>
  );
}

function CtaFields({ p }: { p: ProposalBlockPayload }) {
  return (
    <>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">URL фото</span>
        <input className="editor-inspector-input" name="photoUrl" defaultValue={p.photoUrl ?? ""} placeholder="https://..." />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Контакты (название | значение | ссылка)</span>
        <textarea
          className="editor-inspector-area min-h-24"
          name="contacts"
          defaultValue={formatContacts(p.contacts)}
          placeholder={"Телефон | +7 900 123-45-67 | tel:+79001234567\nEmail | hello@company.ru | mailto:hello@company.ru"}
        />
      </label>
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Кнопка 2 (текст)</span>
          <input className="editor-inspector-input" name="ctaLabelSecondary" defaultValue={p.ctaLabelSecondary ?? ""} />
        </label>
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Кнопка 2 (ссылка)</span>
          <input className="editor-inspector-input" name="ctaHrefSecondary" defaultValue={p.ctaHrefSecondary ?? ""} placeholder="#contact или https://..." />
        </label>
      </div>
      <BlockColorFields payload={p} />
    </>
  );
}

function AboutFields({ p }: { p: ProposalBlockPayload }) {
  return (
    <>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Пункты списка</span>
        <textarea
          className="editor-inspector-area min-h-24"
          name="bullets"
          defaultValue={(p.bullets ?? []).join("\n")}
          placeholder="Один пункт на строку"
        />
      </label>
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Кнопка 2 (текст)</span>
          <input className="editor-inspector-input" name="ctaLabelSecondary" defaultValue={p.ctaLabelSecondary ?? ""} />
        </label>
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Кнопка 2 (ссылка)</span>
          <input className="editor-inspector-input" name="ctaHrefSecondary" defaultValue={p.ctaHrefSecondary ?? ""} placeholder="#contact или https://..." />
        </label>
      </div>
      <BlockColorFields payload={p} />
    </>
  );
}

// ── TipTap + hidden input для передачи через form ───────────────────────────

function RichTextWithHidden({ defaultValue }: { defaultValue: string }) {
  const [html, setHtml] = useState(defaultValue);
  return (
    <>
      <input type="hidden" name="richTextHtml" value={html} />
      <TiptapEditor value={defaultValue} onChange={setHtml} placeholder="Введите текст. Можно вставить фото, видео YouTube, код..." />
    </>
  );
}

function SectionHeadingFields({ p }: { p: ProposalBlockPayload }) {
  return (
    <>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Кикер (тонкий текст над заголовком)</span>
        <input className="editor-inspector-input" name="eyebrow" defaultValue={p.eyebrow ?? ""} placeholder="Например: 03 / Производство" />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Главный заголовок</span>
        <input className="editor-inspector-input" name="headline" defaultValue={p.headline ?? ""} />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Подзаголовок</span>
        <textarea className="editor-inspector-area min-h-20" name="body" defaultValue={p.body ?? ""} />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Выравнивание</span>
        <select className="editor-inspector-input" name="headingAlign" defaultValue={p.headingAlign ?? "left"}>
          <option value="left">По левому краю</option>
          <option value="center">По центру</option>
          <option value="right">По правому краю</option>
        </select>
      </label>
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Заголовок desktop (px)</span>
          <input className="editor-inspector-input" type="number" name="headlineDesktopSize" min={32} max={160} defaultValue={p.headlineDesktopSize ?? 80} />
        </label>
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Заголовок mobile (px)</span>
          <input className="editor-inspector-input" type="number" name="headlineMobileSize" min={26} max={80} defaultValue={p.headlineMobileSize ?? 44} />
        </label>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Подзаголовок desktop (px)</span>
          <input className="editor-inspector-input" type="number" name="subheadlineDesktopSize" min={14} max={40} defaultValue={p.subheadlineDesktopSize ?? 20} />
        </label>
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label">Подзаголовок mobile (px)</span>
          <input className="editor-inspector-input" type="number" name="subheadlineMobileSize" min={13} max={28} defaultValue={p.subheadlineMobileSize ?? 17} />
        </label>
      </div>
      <BlockColorFields payload={p} />
    </>
  );
}

const PITCH_SECTIONS: { id: string; label: string }[] = [
  { id: "problem",     label: "Проблема / решение" },
  { id: "stats",       label: "Цифры о компании" },
  { id: "composition", label: "Состав услуги" },
  { id: "benefits",    label: "Преимущества" },
  { id: "process",     label: "Этапы работ" },
  { id: "tech",        label: "Технические выгоды" },
  { id: "faq",         label: "FAQ (аккордеон)" },
  { id: "cta",         label: "CTA (призыв к действию)" },
];

function AgencyPitchFields({ p }: { p: ProposalBlockPayload }) {
  const [sections, setSections] = useState<string[]>(
    Array.isArray(p.pitchSections) ? p.pitchSections : ["problem", "stats", "composition", "benefits", "process", "faq", "cta"]
  );
  const [pitchStats, setPitchStats] = useState(
    JSON.stringify(Array.isArray(p.pitchStats) ? p.pitchStats : [], null, 2)
  );
  const [pitchItems, setPitchItems] = useState(
    JSON.stringify(Array.isArray(p.pitchItems) ? p.pitchItems : [], null, 2)
  );
  const [pitchBullets, setPitchBullets] = useState(
    JSON.stringify(Array.isArray(p.pitchBullets) ? p.pitchBullets : [], null, 2)
  );
  const [faqItems, setFaqItems] = useState(
    JSON.stringify(Array.isArray(p.faqItems) ? p.faqItems : [], null, 2)
  );

  function toggleSection(id: string) {
    setSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  return (
    <>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Кикер (тонкий текст над заголовком)</span>
        <input className="editor-inspector-input" name="eyebrow" defaultValue={p.eyebrow ?? "Коммерческое предложение"} />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Заголовок питча</span>
        <input className="editor-inspector-input" name="headline" defaultValue={p.headline ?? ""} />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Лид-абзац</span>
        <textarea className="editor-inspector-area min-h-20" name="body" defaultValue={p.body ?? ""} />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Название агентства</span>
        <input className="editor-inspector-input" name="agencyName" defaultValue={p.agencyName ?? "Konversus"} placeholder="Konversus" />
      </label>

      {/* Видимые секции */}
      <div className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Видимые секции</span>
        <div className="flex flex-col gap-1.5 mt-2">
          {PITCH_SECTIONS.map((s) => (
            <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={sections.includes(s.id)}
                onChange={() => toggleSection(s.id)}
                className="rounded"
              />
              <span>{s.label}</span>
            </label>
          ))}
        </div>
        {/* Скрытый input для сохранения */}
        <input type="hidden" name="pitchSections" value={JSON.stringify(sections)} />
      </div>

      {/* Цифры компании */}
      <div className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Цифры компании (JSON)</span>
        <textarea
          className="editor-inspector-area min-h-28 font-mono text-xs"
          value={pitchStats}
          onChange={(e) => setPitchStats(e.target.value)}
        />
        <input type="hidden" name="pitchStats" value={pitchStats} />
        <span className="editor-inspector-hint">Формат: [{`{"value":"8+","label":"лет"}`}]</span>
      </div>

      {/* Состав / шаги */}
      <div className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Состав услуги / Этапы (JSON)</span>
        <textarea
          className="editor-inspector-area min-h-28 font-mono text-xs"
          value={pitchItems}
          onChange={(e) => setPitchItems(e.target.value)}
        />
        <input type="hidden" name="pitchItems" value={pitchItems} />
        <span className="editor-inspector-hint">Формат: [{`{"num":"01","title":"Стратегия","body":"..."}`}]</span>
      </div>

      {/* Технические выгоды */}
      <div className="editor-inspector-fieldset">
        <span className="editor-inspector-label">Технические выгоды (JSON)</span>
        <textarea
          className="editor-inspector-area min-h-20 font-mono text-xs"
          value={pitchBullets}
          onChange={(e) => setPitchBullets(e.target.value)}
        />
        <input type="hidden" name="pitchBullets" value={pitchBullets} />
        <span className="editor-inspector-hint">Формат: ["Выгода 1", "Выгода 2"]</span>
      </div>

      {/* FAQ */}
      <div className="editor-inspector-fieldset">
        <span className="editor-inspector-label">FAQ (JSON)</span>
        <textarea
          className="editor-inspector-area min-h-32 font-mono text-xs"
          value={faqItems}
          onChange={(e) => setFaqItems(e.target.value)}
        />
        <input type="hidden" name="faqItems" value={faqItems} />
        <span className="editor-inspector-hint">Формат: [{`{"question":"Вопрос?","answer":"Ответ."}`}]</span>
      </div>

      {/* CTA */}
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">CTA ссылка</span>
        <input className="editor-inspector-input" name="pitchCtaUrl" defaultValue={p.pitchCtaUrl ?? ""} placeholder="https://t.me/username" />
      </label>
      <label className="editor-inspector-fieldset">
        <span className="editor-inspector-label">CTA контакт (отображаемый)</span>
        <input className="editor-inspector-input" name="pitchCtaContact" defaultValue={p.pitchCtaContact ?? ""} placeholder="@username" />
      </label>
    </>
  );
}

// ── Основной компонент ───────────────────────────────────────────────────────

export function ActiveBlockEditor({ proposalId, block, index, sidebar }: ActiveBlockEditorProps) {
  const p = block.payload;
  const type = block.type;

  // Типы, которые управляют своими полями полностью самостоятельно
  const isFullyCustom = ["hero", "gallery-photo", "gallery-showcase", "before-after", "timeline", "commercial", "cta", "about-panel", "rich-text", "section-heading", "doc-agency-pitch"].includes(type);
  // Типы с CTA-кнопкой (первичной)
  const hasCta = ["editorial", "metrics", "video-block", "cta", "about-panel"].includes(type);

  return (
    <article id={`block-${block.id}`} className="editor-inspector-card">
      <div className="editor-inspector-head">
        <div>
          <div className="editor-inspector-kicker">
            Блок {index + 1} • {getProposalBlockCategory(type)}
          </div>
          <div className="editor-inspector-title mt-3">{getProposalBlockLabel(type)}</div>
        </div>
      </div>

      <form action={updateProposalBlockAction} className="editor-inspector-form">
        <input type="hidden" name="proposalId" value={proposalId} />
        <input type="hidden" name="blockId" value={block.id} />
        <input type="hidden" name="panel" value="block" />
        <input type="hidden" name="sidebar" value={sidebar ?? "structure"} />

        {/* ── Общий текстовый блок (editorial, metrics, video, timeline с заголовком) ── */}
        {!isFullyCustom && (
          <>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Надзаголовок</span>
              <input className="editor-inspector-input" name="eyebrow" defaultValue={p.eyebrow ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Главный заголовок</span>
              <input className="editor-inspector-input" name="headline" defaultValue={p.headline ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Основной текст</span>
              <textarea className="editor-inspector-area min-h-24" name="body" defaultValue={p.body ?? ""} />
            </label>
          </>
        )}

        {/* Hero: заголовок + лид без eyebrow */}
        {type === "hero" && (
          <>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Главный заголовок</span>
              <input className="editor-inspector-input" name="headline" defaultValue={p.headline ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Подзаголовок / лид</span>
              <textarea className="editor-inspector-area min-h-20" name="body" defaultValue={p.body ?? ""} />
            </label>
          </>
        )}

        {/* About-panel и Editorial: заголовок + текст + bullets */}
        {(type === "about-panel" || type === "editorial") && (
          <>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Надзаголовок</span>
              <input className="editor-inspector-input" name="eyebrow" defaultValue={p.eyebrow ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Главный заголовок</span>
              <input className="editor-inspector-input" name="headline" defaultValue={p.headline ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Основной текст</span>
              <textarea className="editor-inspector-area min-h-24" name="body" defaultValue={p.body ?? ""} />
            </label>
          </>
        )}

        {/* CTA: заголовок + текст */}
        {type === "cta" && (
          <>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Надзаголовок</span>
              <input className="editor-inspector-input" name="eyebrow" defaultValue={p.eyebrow ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Главный заголовок</span>
              <input className="editor-inspector-input" name="headline" defaultValue={p.headline ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Основной текст</span>
              <textarea className="editor-inspector-area min-h-24" name="body" defaultValue={p.body ?? ""} />
            </label>
          </>
        )}

        {/* Before/After: заголовок + текст */}
        {type === "before-after" && (
          <>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Надзаголовок</span>
              <input className="editor-inspector-input" name="eyebrow" defaultValue={p.eyebrow ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Заголовок</span>
              <input className="editor-inspector-input" name="headline" defaultValue={p.headline ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Описание</span>
              <textarea className="editor-inspector-area min-h-20" name="body" defaultValue={p.body ?? ""} />
            </label>
          </>
        )}

        {/* Timeline: заголовок + intro */}
        {type === "timeline" && (
          <>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Надзаголовок</span>
              <input className="editor-inspector-input" name="eyebrow" defaultValue={p.eyebrow ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Заголовок</span>
              <input className="editor-inspector-input" name="headline" defaultValue={p.headline ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Вводный текст</span>
              <textarea className="editor-inspector-area min-h-20" name="body" defaultValue={p.body ?? ""} />
            </label>
          </>
        )}

        {/* Commercial: заголовок + текст */}
        {type === "commercial" && (
          <>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Надзаголовок</span>
              <input className="editor-inspector-input" name="eyebrow" defaultValue={p.eyebrow ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Заголовок</span>
              <input className="editor-inspector-input" name="headline" defaultValue={p.headline ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Описание</span>
              <textarea className="editor-inspector-area min-h-20" name="body" defaultValue={p.body ?? ""} />
            </label>
          </>
        )}

        {/* ── Тип-специфичные поля ── */}
        {type === "hero" && <HeroFields p={p} />}
        {type === "video-block" && <VideoFields p={p} />}
        {type === "gallery-photo" && <GalleryPhotoFields p={p} />}
        {type === "gallery-showcase" && <GalleryShowcaseFields p={p} />}
        {type === "before-after" && <BeforeAfterFields p={p} />}
        {type === "timeline" && <TimelineFields p={p} />}
        {type === "commercial" && <CommercialFields p={p} />}
        {type === "cta" && <CtaFields p={p} />}
        {type === "about-panel" && <AboutFields p={p} />}

        {/* Rich Text (TipTap WYSIWYG) */}
        {type === "rich-text" && (
          <>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Надзаголовок (необязательно)</span>
              <input className="editor-inspector-input" name="eyebrow" defaultValue={p.eyebrow ?? ""} placeholder="Например: О компании" />
            </label>
            <div className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Текст блока</span>
              <RichTextWithHidden defaultValue={p.richTextHtml ?? ""} />
            </div>
          </>
        )}

        {/* Section Heading — разделитель */}
        {type === "section-heading" && <SectionHeadingFields p={p} />}

        {/* Agency Pitch */}
        {type === "doc-agency-pitch" && <AgencyPitchFields p={p} />}

        {/* Metrics */}
        {type === "metrics" && (
          <>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Метрики (название: значение)</span>
              <textarea
                className="editor-inspector-area min-h-24"
                name="metrics"
                defaultValue={formatMetrics(p.metrics)}
                placeholder={"Проектов: 120\nКлиентов: 48"}
              />
            </label>
            <BlockColorFields payload={p} />
          </>
        )}

        {/* Editorial: дополнительно фото + цвета */}
        {type === "editorial" && (
          <>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">URL фото (справа)</span>
              <input className="editor-inspector-input" name="photoUrl" defaultValue={p.photoUrl ?? ""} placeholder="https://..." />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Пункты (bullets)</span>
              <textarea
                className="editor-inspector-area min-h-20"
                name="bullets"
                defaultValue={(p.bullets ?? []).join("\n")}
                placeholder="Один пункт на строку"
              />
            </label>
            <BlockColorFields payload={p} />
          </>
        )}

        {/* ── CTA кнопка (первичная) ── */}
        {hasCta && type !== "cta" && type !== "about-panel" && (
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Подпись кнопки</span>
              <input className="editor-inspector-input" name="ctaLabel" defaultValue={p.ctaLabel ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Ссылка кнопки</span>
              <input className="editor-inspector-input" name="ctaHref" defaultValue={p.ctaHref ?? ""} placeholder="#contact или https://..." />
            </label>
          </div>
        )}

        {/* CTA кнопка для about-panel */}
        {type === "about-panel" && (
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Кнопка 1 (текст)</span>
              <input className="editor-inspector-input" name="ctaLabel" defaultValue={p.ctaLabel ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Кнопка 1 (ссылка)</span>
              <input className="editor-inspector-input" name="ctaHref" defaultValue={p.ctaHref ?? ""} placeholder="#contact или https://..." />
            </label>
          </div>
        )}

        {/* CTA кнопка для cta-block */}
        {type === "cta" && (
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Кнопка 1 (текст)</span>
              <input className="editor-inspector-input" name="ctaLabel" defaultValue={p.ctaLabel ?? ""} />
            </label>
            <label className="editor-inspector-fieldset">
              <span className="editor-inspector-label">Кнопка 1 (ссылка)</span>
              <input className="editor-inspector-input" name="ctaHref" defaultValue={p.ctaHref ?? ""} placeholder="#contact или https://..." />
            </label>
          </div>
        )}

        {/* ── Видимость и название ── */}
        <label className="editor-inspector-toggle">
          <input className="editor-inspector-checkbox" type="checkbox" name="visible" defaultChecked={block.visible} />
          <span>Блок виден на клиентской странице</span>
        </label>
        <label className="editor-inspector-fieldset">
          <span className="editor-inspector-label" style={{ opacity: 0.5 }}>Внутреннее название (для навигации)</span>
          <input className="editor-inspector-input" name="title" defaultValue={block.title ?? ""} />
        </label>

        <button className="editor-inspector-submit" type="submit">
          Сохранить блок
        </button>
      </form>
    </article>
  );
}