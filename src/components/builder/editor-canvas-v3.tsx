"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { TiptapEditor } from "./tiptap-editor";
import type { ContactItem, ProposalBlock, ProposalBlockPayload } from "@/types/domain";

// ── Типы ────────────────────────────────────────────────────────────────────
type V3BlockType = "doc-section" | "doc-text" | "doc-media" | "doc-embed" | "doc-ai" | "doc-contacts" | "doc-agency-pitch";

type PreviewMode = "mobile" | "desktop";

type EditorCanvasV3Props = {
  blocks: ProposalBlock[];
  shareUrl: string | null;
  saveState?: "idle" | "saving" | "saved" | "error";
  lastSavedAt?: string | null;
  onBlocksChange: (blocks: ProposalBlock[]) => void;
  onDraftBlocksChange?: (blocks: ProposalBlock[]) => void;
};

type MediaItem = { id: string; kind: "image" | "video"; name: string; url: string };

// ── Хелперы ──────────────────────────────────────────────────────────────────
function makeId(type: string) {
  return `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getV3Label(type: V3BlockType): string {
  const labels: Record<V3BlockType, string> = {
    "doc-section": "Раздел",
    "doc-text": "Текст",
    "doc-media": "Медиа",
    "doc-embed": "Вставка кода",
    "doc-ai": "AI блок",
    "doc-contacts": "Контакты",
    "doc-agency-pitch": "Агентский питч",
  };
  return labels[type] ?? type;
}

function blocksSignature(blocks: ProposalBlock[]) {
  return JSON.stringify(blocks);
}

function createV3Block(type: V3BlockType): ProposalBlock {
  const base = { id: makeId(type), type, visible: true, title: getV3Label(type) };
  switch (type) {
    case "doc-section":
      return { ...base, payload: { headline: "Новый раздел", body: "" } };
    case "doc-text":
      return { ...base, payload: { richTextHtml: "<p></p>" } };
    case "doc-media":
      return { ...base, payload: { photoUrl: "", mediaType: "image", mediaDisplay: "full", body: "" } };
    case "doc-embed":
      return { ...base, payload: { embedType: "youtube", embedCode: "" } };
    case "doc-ai":
      return { ...base, payload: { aiSourceUrl: "", aiPrompt: "", aiResult: "", aiStatus: "idle" } };
    case "doc-contacts":
      return {
        ...base,
        payload: {
          headline: "Обсудим ваш проект",
          body: "Пишите или звоните — расскажу, что можно сделать с цифровой упаковкой вашей компании",
          photoUrl: "",
          contacts: [
            { label: "Telegram", value: "@bilarius", href: "https://t.me/bilarius", meta: "Быстрее всего" },
            { label: "Телефон", value: "+7 921 201-32-52", href: "tel:+79212013252" },
            { label: "Email", value: "bilariuss@yandex.ru", href: "mailto:bilariuss@yandex.ru" },
          ],
          ctaLabel: "Написать в Telegram",
          ctaHref: "https://t.me/bilarius",
          ctaLabelSecondary: "Позвонить",
          ctaHrefSecondary: "tel:+79212013252",
        },
      };
    case "doc-agency-pitch":
      return {
        ...base,
        title: "Агентский питч",
        payload: {
          headline: "Без сайта вы теряете клиентов каждый день",
          body: "Современный продающий сайт — не расход, а инфраструктура роста.",
          eyebrow: "Коммерческое предложение",
          agencyName: "Konversus",
          pitchSections: ["problem", "stats", "composition", "benefits", "process", "faq", "cta"],
          pitchStats: [
            { value: "8+", label: "лет на рынке" },
            { value: "120+", label: "проектов" },
            { value: "×2.4", label: "рост конверсии" },
            { value: "14 дней", label: "средний срок" },
          ],
          pitchItems: [
            { num: "01", title: "Стратегия и структура", body: "Анализируем рынок, аудиторию и конкурентов." },
            { num: "02", title: "Дизайн и разработка", body: "Уникальный стиль под ваш бренд. Чистый код, SEO-фундамент." },
            { num: "03", title: "Контент и запуск", body: "Пишем тексты, обрабатываем фото. Запускаем сайт с аналитикой." },
          ],
          pitchBullets: [
            "Скорость загрузки до 1 сек — меньше отказов, выше позиции",
            "Мобильная версия с первого дня разработки",
            "Интеграция с CRM и мессенджерами под ключ",
            "Поддержка без дополнительных расходов",
          ],
          faqItems: [
            { question: "Сколько стоит сайт?", answer: "Базовый лендинг — от 80 000 Р, корпоративный сайт — от 250 000 Р." },
            { question: "Сроки разработки?", answer: "Лендинг — 10–14 дней, многостраничный сайт — 30–45 дней." },
            { question: "Что нужно от нас?", answer: "Логотип, фото продукта, описание услуг. Остальное берём на себя." },
            { question: "Есть поддержка после запуска?", answer: "Да, первые 2 недели бесплатно. Далее — по договору." },
          ],
          pitchCtaUrl: "https://t.me/bilarius",
          pitchCtaContact: "@bilarius",
          pitchBrandColor: "#0066CC",
        },
      };
  }
}

function uploadFile(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ url: string; kind: "image" | "video" }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("image", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText) as { url: string; kind?: "image" | "video" };
          resolve({ url: json.url, kind: json.kind ?? "image" });
        } catch {
          reject(new Error("Ошибка разбора ответа сервера"));
        }
      } else {
        try {
          const json = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(json.error ?? "Ошибка загрузки"));
        } catch {
          reject(new Error(`Ошибка загрузки: ${xhr.status}`));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Сетевая ошибка"));
    xhr.send(form);
  });
}

// ── Модальное окно медиатеки ──────────────────────────────────────────────────
function MediaModal({
  items,
  loading,
  uploading,
  uploadProgress,
  onSelect,
  onUpload,
  onClose,
}: {
  items: MediaItem[];
  loading: boolean;
  uploading: boolean;
  uploadProgress: number | null;
  onSelect: (url: string) => void;
  onUpload: (file: File) => void;
  onClose: () => void;
}) {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { onUpload(f); e.target.value = ""; }
  };

  return (
    <div className="ev3-modal-overlay" onClick={onClose}>
      <div className="ev3-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ev3-modal-head">
          <span>Медиатека</span>
          <button type="button" onClick={onClose} className="ev3-modal-close">×</button>
        </div>

        {/* Кнопки загрузки */}
        <div className="ev3-modal-uploads">
          <button
            type="button"
            className="ev3-modal-upload"
            disabled={uploading}
            onClick={() => photoRef.current?.click()}
          >
            🖼 Фото
          </button>
          <button
            type="button"
            className="ev3-modal-upload ev3-modal-upload--video"
            disabled={uploading}
            onClick={() => videoRef.current?.click()}
          >
            ▶ Видео
          </button>
          <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleChange} />
          <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo" style={{ display: "none" }} onChange={handleChange} />
        </div>

        {/* Прогресс загрузки */}
        {uploading && (
          <div className="ev3-modal-progress">
            <div className="ev3-modal-progress__track">
              <div
                className="ev3-modal-progress__fill"
                style={{ width: `${uploadProgress ?? 0}%` }}
              />
            </div>
            <span className="ev3-modal-progress__label">
              {uploadProgress === null || uploadProgress === 0
                ? "Подготовка..."
                : uploadProgress < 100
                ? `Загрузка ${uploadProgress}%`
                : "Обработка..."}
            </span>
          </div>
        )}

        {loading ? (
          <div className="ev3-modal-loading">Загрузка медиатеки…</div>
        ) : (
          <div className="ev3-modal-grid">
            {items.map((item) => (
              <button key={item.id} type="button" className="ev3-modal-thumb" onClick={() => onSelect(item.url)}>
                {item.kind === "image" ? (
                  <img src={item.url} alt={item.name} loading="lazy" />
                ) : (
                  <div className="ev3-modal-video-thumb">
                    <span style={{ fontSize: 28 }}>▶</span>
                    <span className="ev3-modal-video-name">{item.name}</span>
                  </div>
                )}
              </button>
            ))}
            {items.length === 0 && !loading && (
              <div className="ev3-modal-empty">Медиатека пуста — загрузите первое фото или видео</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Мастер аудита ─────────────────────────────────────────────────────────────
function AuditWizard({ onClose, onApply }: { onClose: () => void; onApply: (blocks: ProposalBlock[]) => void }) {
  const [url, setUrl] = useState("");
  const [context, setContext] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleGenerate() {
    if (!url.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const response = await fetch("/api/proposals/generate-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: url.trim(), extraContext: context.trim() }),
      });
      const json = await response.json() as { blocks?: ProposalBlock[]; error?: string };
      if (!response.ok || !json.blocks) throw new Error(json.error ?? "Ошибка генерации");
      setStatus("done");
      onApply(json.blocks);
      onClose();
    } catch (err) {
      setErrorMsg(String(err));
      setStatus("error");
    }
  }

  return (
    <div className="ev3-modal-overlay" onClick={onClose}>
      <div className="ev3-modal ev3-wizard" onClick={(e) => e.stopPropagation()}>
        <div className="ev3-modal-head">
          <span>⚡ AI Аудит компании</span>
          <button type="button" onClick={onClose} className="ev3-modal-close">×</button>
        </div>
        <div className="ev3-wizard-body">
          <p className="ev3-wizard-hint">
            Введите URL сайта или страницы компании. ИИ проанализирует её и создаст
            готовый аудит с коммерческим предложением — за ~30 секунд.
          </p>
          <label className="ev3-field">
            <span>Сайт или страница ВКонтакте</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://company.ru"
              disabled={status === "loading"}
            />
          </label>
          <label className="ev3-field">
            <span>Дополнительный контекст (необязательно)</span>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Производственная компания, делают металлоконструкции, хотят выйти на новые рынки..."
              rows={3}
              disabled={status === "loading"}
            />
          </label>
          {errorMsg && <div className="ev3-wizard-error">{errorMsg}</div>}
          <button
            type="button"
            className="ev3-wizard-btn"
            onClick={handleGenerate}
            disabled={status === "loading" || !url.trim()}
          >
            {status === "loading" ? "Анализирую..." : "Создать аудит"}
          </button>
          <p className="ev3-wizard-note">
            Использует OpenRouter (Gemini Flash). Бесплатно ~2–3 запроса в день.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Рендер блоков (центральная колонка) ────────────────────────────────────────

function DocSectionView({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const style = {
    ...(p.backgroundColor && { "--block-bg": p.backgroundColor }),
    ...(p.textColor && { "--block-ink": p.textColor }),
  } as React.CSSProperties;
  return (
    <div className="dv3-section" style={style}>
      {p.eyebrow && <div className="dv3-section__eyebrow">{p.eyebrow}</div>}
      <h2 className="dv3-section__title">{p.headline || "Раздел"}</h2>
      {p.body && <p className="dv3-section__sub">{p.body}</p>}
    </div>
  );
}

function DocTextView({
  block,
  onChange,
  onUpload,
}: {
  block: ProposalBlock;
  onChange: (patch: Partial<ProposalBlockPayload>) => void;
  onUpload: (file: File) => Promise<string>;
}) {
  return (
    <div className="dv3-text">
      <TiptapEditor
        value={block.payload.richTextHtml ?? ""}
        onChange={(html) => onChange({ richTextHtml: html })}
        placeholder="Начните вводить текст..."
        onUpload={onUpload}
        className="tiptap-light dv3-tiptap"
      />
    </div>
  );
}

function DocMediaView({
  block,
  onOpenMedia,
}: {
  block: ProposalBlock;
  onOpenMedia: () => void;
}) {
  const p = block.payload;
  const url = p.photoUrl ?? "";
  const display = p.mediaDisplay ?? "full";
  const isVideo = p.mediaType === "video";

  return (
    <div className={`dv3-media dv3-media--${display}`}>
      {url ? (
        isVideo ? (
          <video src={url} controls poster={p.videoPoster ?? undefined} className="dv3-media__video" />
        ) : (
          <img src={url} alt="" className="dv3-media__img" loading="lazy" />
        )
      ) : (
        <button type="button" className="dv3-media__placeholder" onClick={onOpenMedia}>
          <span>📷</span>
          <span>Выбрать изображение</span>
        </button>
      )}
      {p.body && <p className="dv3-media__caption">{p.body}</p>}
    </div>
  );
}

function DocEmbedView({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const code = (p.embedCode ?? "").trim();

  if (!code) {
    return (
      <div className="dv3-embed dv3-embed--empty">
        <span>Добавьте код вставки в настройках блока справа</span>
      </div>
    );
  }

  // Определяем YouTube по URL
  const ytMatch = code.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch ?? p.embedType === "youtube") {
    const videoId = ytMatch?.[1] ?? "";
    const src = videoId
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : code.startsWith("http") ? code : "";
    return (
      <div className="dv3-embed">
        <div className="dv3-embed__ratio">
          {src && <iframe src={src} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Видео" />}
        </div>
      </div>
    );
  }

  // Raw HTML
  return (
    <div className="dv3-embed">
      <div dangerouslySetInnerHTML={{ __html: code }} />
    </div>
  );
}

function DocAIView({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const result = (p.aiResult ?? "").trim();

  return (
    <div className="dv3-ai">
      {result ? (
        <div className="dv3-ai__result" dangerouslySetInnerHTML={{ __html: result }} />
      ) : (
        <div className="dv3-ai__placeholder">
          <div className="dv3-ai__icon">⚡</div>
          <div className="dv3-ai__label">AI блок</div>
          <div className="dv3-ai__hint">
            {p.aiSourceUrl
              ? `Источник: ${p.aiSourceUrl}`
              : "Укажите URL и нажмите «Сгенерировать» в панели справа"}
          </div>
        </div>
      )}
    </div>
  );
}

function DocContactsView({ block, onOpenMedia }: { block: ProposalBlock; onOpenMedia: () => void }) {
  const p = block.payload;
  const contacts = (p.contacts ?? []) as ContactItem[];

  return (
    <div className="dv3-contacts">
      <div className="dv3-contacts__inner">
        {p.photoUrl ? (
          <div className="dv3-contacts__photo">
            <img src={p.photoUrl} alt="" />
          </div>
        ) : (
          <button type="button" className="dv3-contacts__photo-add" onClick={onOpenMedia}>
            <span>📷 Фото</span>
          </button>
        )}
        <div className="dv3-contacts__body">
          {p.headline && <h2 className="dv3-contacts__title">{p.headline}</h2>}
          {p.body && <p className="dv3-contacts__sub">{p.body}</p>}
          {contacts.length > 0 && (
            <ul className="dv3-contacts__list">
              {contacts.map((c, i) => (
                <li key={i} className="dv3-contacts__item">
                  <span className="dv3-contacts__label">{c.label}</span>
                  {c.href
                    ? <a className="dv3-contacts__value" href={c.href}>{c.value}</a>
                    : <span className="dv3-contacts__value">{c.value}</span>
                  }
                </li>
              ))}
            </ul>
          )}
          <div className="dv3-contacts__ctas">
            {p.ctaHref && p.ctaLabel && (
              <a className="dv3-contacts__cta" href={p.ctaHref}>{p.ctaLabel}</a>
            )}
            {p.ctaHrefSecondary && p.ctaLabelSecondary && (
              <a className="dv3-contacts__cta dv3-contacts__cta--sec" href={p.ctaHrefSecondary}>{p.ctaLabelSecondary}</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const AP_SECTION_LABELS: Record<string, string> = {
  problem: "Проблема",
  stats: "Цифры",
  composition: "Состав",
  benefits: "Преимущества",
  process: "Этапы",
  tech: "Техника",
  faq: "FAQ",
  cta: "CTA",
};

function DocAgencyPitchView({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const sections: string[] = Array.isArray(p.pitchSections) ? p.pitchSections : [];
  const stats: { value: string; label: string }[] = Array.isArray(p.pitchStats) ? p.pitchStats : [];
  const items: { num: string; title: string; body: string }[] = Array.isArray(p.pitchItems) ? p.pitchItems : [];
  const faqs: { question: string; answer: string }[] = Array.isArray(p.faqItems) ? p.faqItems : [];

  return (
    <div className="dv3-agency-pitch">
      <div className="dv3-ap-header">
        {p.eyebrow && <div className="dv3-ap-kicker">{p.eyebrow}</div>}
        <div className="dv3-ap-title">{p.headline ?? "Агентский питч"}</div>
        {p.agencyName && <div className="dv3-ap-agency">— {p.agencyName}</div>}
      </div>
      {sections.length > 0 && (
        <div className="dv3-ap-sections">
          {sections.map((s) => (
            <span key={s} className={`dv3-ap-badge dv3-ap-badge--${s}`}>
              {AP_SECTION_LABELS[s] ?? s}
            </span>
          ))}
        </div>
      )}
      {stats.length > 0 && (
        <div className="dv3-ap-stats">
          {stats.map((st, i) => (
            <div key={i} className="dv3-ap-stat"><b>{st.value}</b><span>{st.label}</span></div>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <div className="dv3-ap-items">
          {items.map((it, i) => (
            <div key={i} className="dv3-ap-item">
              <span className="dv3-ap-item-num">{it.num}</span>
              <span className="dv3-ap-item-title">{it.title}</span>
            </div>
          ))}
        </div>
      )}
      <div className="dv3-ap-footer">
        {faqs.length > 0 && <span className="dv3-ap-faq-count">{faqs.length} FAQ</span>}
        {p.pitchCtaContact && <span className="dv3-ap-cta">→ {p.pitchCtaContact}</span>}
      </div>
    </div>
  );
}

// ── Обёртка блока ────────────────────────────────────────────────────────────
function BlockRow({
  block,
  isSelected,
  onSelect,
  children,
}: {
  block: ProposalBlock;
  isSelected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`ev3-block-row${isSelected ? " ev3-block-row--selected" : ""}`}
      onClick={onSelect}
    >
      <div className="ev3-block-type-badge">{getV3Label(block.type as V3BlockType)}</div>
      {children}
    </div>
  );
}

// ── Панель настроек выбранного блока (правая колонка) ─────────────────────────
function RightPanel({
  block,
  onChange,
  onOpenMedia,
  onRegenerateAI,
}: {
  block: ProposalBlock;
  onChange: (patch: Partial<ProposalBlockPayload>) => void;
  onOpenMedia: () => void;
  onRegenerateAI: () => void;
}) {
  const p = block.payload;

  if (block.type === "doc-agency-pitch") {
    return <AgencyPitchPanel block={block} onChange={onChange} />;
  }

  if (block.type === "doc-section") {
    return (
      <div className="ev3-right-fields">
        <label className="ev3-field">
          <span>Бейдж над заголовком</span>
          <input
            type="text"
            value={p.eyebrow ?? ""}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
            placeholder="Раздел 01"
          />
        </label>
        <label className="ev3-field">
          <span>Заголовок раздела</span>
          <input
            type="text"
            value={p.headline ?? ""}
            onChange={(e) => onChange({ headline: e.target.value })}
            placeholder="Аудит сайта"
          />
        </label>
        <label className="ev3-field">
          <span>Подзаголовок (необязательно)</span>
          <input
            type="text"
            value={p.body ?? ""}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="Текущее состояние"
          />
        </label>
        <div className="ev3-field-divider">Цвета</div>
        <label className="ev3-field">
          <span>Фон</span>
          <div className="ap-color-row">
            <input type="color" value={p.backgroundColor ?? "#111820"} onChange={(e) => onChange({ backgroundColor: e.target.value })} className="ap-color-input" />
            <input type="text" value={p.backgroundColor ?? "#111820"} onChange={(e) => onChange({ backgroundColor: e.target.value })} placeholder="#111820" className="ap-color-hex" />
          </div>
        </label>
        <label className="ev3-field">
          <span>Текст</span>
          <div className="ap-color-row">
            <input type="color" value={p.textColor ?? "#f6f2ea"} onChange={(e) => onChange({ textColor: e.target.value })} className="ap-color-input" />
            <input type="text" value={p.textColor ?? "#f6f2ea"} onChange={(e) => onChange({ textColor: e.target.value })} placeholder="#f6f2ea" className="ap-color-hex" />
          </div>
        </label>
      </div>
    );
  }

  if (block.type === "doc-text") {
    return (
      <div className="ev3-right-fields">
        <p className="ev3-right-hint">Текстовый блок редактируется прямо в документе слева.</p>
        <div className="ev3-field-row">
          <label className="ev3-field">
            <span>Фон</span>
            <input type="color" value={p.backgroundColor ?? "#ffffff"} onChange={(e) => onChange({ backgroundColor: e.target.value })} />
          </label>
          <label className="ev3-field">
            <span>Текст</span>
            <input type="color" value={p.textColor ?? "#111820"} onChange={(e) => onChange({ textColor: e.target.value })} />
          </label>
        </div>
      </div>
    );
  }

  if (block.type === "doc-media") {
    return (
      <div className="ev3-right-fields">
        <label className="ev3-field">
          <span>URL изображения / видео</span>
          <input
            type="url"
            value={p.photoUrl ?? ""}
            onChange={(e) => onChange({ photoUrl: e.target.value })}
            placeholder="https://..."
          />
        </label>
        <button type="button" className="ev3-field-btn" onClick={onOpenMedia}>
          Выбрать из медиатеки
        </button>
        <label className="ev3-field">
          <span>Тип медиа</span>
          <select value={p.mediaType ?? "image"} onChange={(e) => onChange({ mediaType: e.target.value as "image" | "video" })}>
            <option value="image">Изображение</option>
            <option value="video">Видео</option>
          </select>
        </label>
        <label className="ev3-field">
          <span>Отображение</span>
          <select value={p.mediaDisplay ?? "full"} onChange={(e) => onChange({ mediaDisplay: e.target.value as "full" | "contained" | "portrait" })}>
            <option value="full">На всю ширину (горизонтальное)</option>
            <option value="contained">В сетке (пропорционально)</option>
            <option value="portrait">Портрет (вертикальное, по высоте)</option>
          </select>
        </label>
        {p.mediaType === "video" && (
          <label className="ev3-field">
            <span>Формат плеера</span>
            <select value={p.videoAspect ?? "landscape"} onChange={(e) => onChange({ videoAspect: e.target.value as "landscape" | "portrait" | "stories" })}>
              <option value="landscape">Горизонтальный 16:9</option>
              <option value="portrait">Вертикальный 9:16</option>
              <option value="stories">Сторис 9:16 (центрирован)</option>
            </select>
          </label>
        )}
        <label className="ev3-field">
          <span>Подпись (необязательно)</span>
          <input
            type="text"
            value={p.body ?? ""}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="Описание фото"
          />
        </label>
      </div>
    );
  }

  if (block.type === "doc-embed") {
    return (
      <div className="ev3-right-fields">
        <label className="ev3-field">
          <span>Тип вставки</span>
          <select
            value={p.embedType ?? "youtube"}
            onChange={(e) => onChange({ embedType: e.target.value as "youtube" | "html" | "iframe" })}
          >
            <option value="youtube">YouTube / Vimeo</option>
            <option value="html">HTML-код</option>
            <option value="iframe">iframe</option>
          </select>
        </label>
        <label className="ev3-field">
          <span>
            {p.embedType === "youtube" ? "Ссылка на видео" :
             p.embedType === "html" ? "HTML-код" : "URL для iframe"}
          </span>
          <textarea
            value={p.embedCode ?? ""}
            onChange={(e) => onChange({ embedCode: e.target.value })}
            rows={5}
            placeholder={
              p.embedType === "youtube"
                ? "https://youtu.be/..."
                : p.embedType === "html"
                ? "<section>...</section>"
                : "https://..."
            }
          />
        </label>
      </div>
    );
  }

  if (block.type === "doc-ai") {
    return (
      <div className="ev3-right-fields">
        <label className="ev3-field">
          <span>URL источника</span>
          <input
            type="url"
            value={p.aiSourceUrl ?? ""}
            onChange={(e) => onChange({ aiSourceUrl: e.target.value })}
            placeholder="https://company.ru"
          />
        </label>
        <label className="ev3-field">
          <span>Дополнительный промпт (необязательно)</span>
          <textarea
            value={p.aiPrompt ?? ""}
            onChange={(e) => onChange({ aiPrompt: e.target.value })}
            rows={3}
            placeholder="Обрати особое внимание на мобильную версию..."
          />
        </label>
        <button
          type="button"
          className="ev3-field-btn ev3-field-btn--primary"
          onClick={onRegenerateAI}
          disabled={p.aiStatus === "generating" || !p.aiSourceUrl}
        >
          {p.aiStatus === "generating" ? "Генерирую..." : "Сгенерировать текст"}
        </button>
        {p.aiStatus === "done" && p.aiResult && (
          <label className="ev3-field">
            <span>Результат (можно отредактировать)</span>
            <textarea
              value={p.aiResult}
              onChange={(e) => onChange({ aiResult: e.target.value })}
              rows={8}
            />
          </label>
        )}
        {p.aiStatus === "error" && (
          <div className="ev3-right-error">Ошибка генерации. Проверьте URL и попробуйте снова.</div>
        )}
      </div>
    );
  }

  if (block.type === "doc-contacts") {
    const contacts = (p.contacts ?? []) as ContactItem[];
    return (
      <div className="ev3-right-fields">
        <label className="ev3-field">
          <span>Заголовок</span>
          <input type="text" value={p.headline ?? ""} onChange={(e) => onChange({ headline: e.target.value })} />
        </label>
        <label className="ev3-field">
          <span>Подзаголовок</span>
          <textarea rows={2} value={p.body ?? ""} onChange={(e) => onChange({ body: e.target.value })} />
        </label>
        <label className="ev3-field">
          <span>URL фото</span>
          <input type="url" value={p.photoUrl ?? ""} onChange={(e) => onChange({ photoUrl: e.target.value })} placeholder="https://..." />
        </label>
        <button type="button" className="ev3-field-btn" onClick={onOpenMedia}>Выбрать фото из медиатеки</button>
        <div className="ev3-field-divider">Контакты</div>
        {contacts.map((c, i) => (
          <div key={i} className="ev3-contacts-row">
            <input
              type="text"
              value={c.label}
              onChange={(e) => {
                const next = [...contacts];
                next[i] = { ...c, label: e.target.value };
                onChange({ contacts: next });
              }}
              placeholder="Telegram"
            />
            <input
              type="text"
              value={c.value}
              onChange={(e) => {
                const next = [...contacts];
                next[i] = { ...c, value: e.target.value };
                onChange({ contacts: next });
              }}
              placeholder="@username"
            />
            <input
              type="text"
              value={c.href ?? ""}
              onChange={(e) => {
                const next = [...contacts];
                next[i] = { ...c, href: e.target.value };
                onChange({ contacts: next });
              }}
              placeholder="https://..."
            />
            <button type="button" onClick={() => onChange({ contacts: contacts.filter((_, j) => j !== i) })} className="ev3-contacts-remove">×</button>
          </div>
        ))}
        <button type="button" className="ev3-field-btn" onClick={() => onChange({ contacts: [...contacts, { label: "", value: "", href: "" }] })}>
          + Добавить контакт
        </button>
        <div className="ev3-field-divider">Кнопки CTA</div>
        <label className="ev3-field">
          <span>Кнопка 1 — текст</span>
          <input type="text" value={p.ctaLabel ?? ""} onChange={(e) => onChange({ ctaLabel: e.target.value })} />
        </label>
        <label className="ev3-field">
          <span>Кнопка 1 — ссылка</span>
          <input type="url" value={p.ctaHref ?? ""} onChange={(e) => onChange({ ctaHref: e.target.value })} />
        </label>
        <label className="ev3-field">
          <span>Кнопка 2 — текст</span>
          <input type="text" value={p.ctaLabelSecondary ?? ""} onChange={(e) => onChange({ ctaLabelSecondary: e.target.value })} />
        </label>
        <label className="ev3-field">
          <span>Кнопка 2 — ссылка</span>
          <input type="url" value={p.ctaHrefSecondary ?? ""} onChange={(e) => onChange({ ctaHrefSecondary: e.target.value })} />
        </label>
      </div>
    );
  }

  return <div className="ev3-right-hint">Настройки недоступны для этого типа блока.</div>;
}

// ── Agency Pitch правая панель ───────────────────────────────────────────────
const PITCH_SECTIONS_V3 = [
  { id: "problem",     label: "Проблема / решение" },
  { id: "stats",       label: "Цифры о компании" },
  { id: "composition", label: "Состав услуги" },
  { id: "benefits",    label: "Преимущества" },
  { id: "process",     label: "Этапы работ" },
  { id: "tech",        label: "Технические выгоды" },
  { id: "faq",         label: "FAQ" },
  { id: "cta",         label: "CTA" },
];

function AgencyPitchPanel({
  block,
  onChange,
}: {
  block: ProposalBlock;
  onChange: (patch: Partial<ProposalBlockPayload>) => void;
}) {
  const p = block.payload;
  const sections: string[] = Array.isArray(p.pitchSections) ? p.pitchSections : [];
  const stats: { value: string; label: string }[] = Array.isArray(p.pitchStats) ? p.pitchStats : [];
  const items: { num: string; title: string; body: string }[] = Array.isArray(p.pitchItems) ? p.pitchItems : [];
  const bullets: string[] = Array.isArray(p.pitchBullets) ? p.pitchBullets : [];
  const faqs: { question: string; answer: string }[] = Array.isArray(p.faqItems) ? p.faqItems : [];

  function toggleSection(id: string) {
    const next = sections.includes(id) ? sections.filter(s => s !== id) : [...sections, id];
    onChange({ pitchSections: next });
  }

  return (
    <div className="ev3-right-fields">
      {/* ── Основной текст ── */}
      <label className="ev3-field">
        <span>Кикер (над заголовком)</span>
        <input type="text" value={p.eyebrow ?? ""} onChange={(e) => onChange({ eyebrow: e.target.value })} placeholder="Коммерческое предложение" />
      </label>
      <label className="ev3-field">
        <span>Заголовок питча</span>
        <input type="text" value={p.headline ?? ""} onChange={(e) => onChange({ headline: e.target.value })} />
      </label>
      <label className="ev3-field">
        <span>Лид-абзац</span>
        <textarea rows={3} value={p.body ?? ""} onChange={(e) => onChange({ body: e.target.value })} />
      </label>
      <label className="ev3-field">
        <span>Название агентства</span>
        <input type="text" value={p.agencyName ?? ""} onChange={(e) => onChange({ agencyName: e.target.value })} placeholder="Konversus" />
      </label>

      {/* ── Видимые секции ── */}
      <div className="ev3-field-divider">Видимые секции</div>
      <div className="ap-sections-grid">
        {PITCH_SECTIONS_V3.map((s) => (
          <label key={s.id} className="ev3-toggle-row">
            <input type="checkbox" checked={sections.includes(s.id)} onChange={() => toggleSection(s.id)} />
            <span>{s.label}</span>
          </label>
        ))}
      </div>

      {/* ── Цифры компании ── */}
      <div className="ev3-field-divider">Цифры компании</div>
      {stats.map((st, i) => (
        <div key={i} className="ap-stat-row">
          <input
            type="text"
            value={st.value}
            onChange={(e) => { const n = [...stats]; n[i] = { ...n[i], value: e.target.value }; onChange({ pitchStats: n }); }}
            placeholder="8+"
            className="ap-stat-value"
          />
          <input
            type="text"
            value={st.label}
            onChange={(e) => { const n = [...stats]; n[i] = { ...n[i], label: e.target.value }; onChange({ pitchStats: n }); }}
            placeholder="лет на рынке"
            className="ap-stat-label"
          />
          <button type="button" className="ev3-contacts-remove" onClick={() => onChange({ pitchStats: stats.filter((_, j) => j !== i) })}>×</button>
        </div>
      ))}
      <button type="button" className="ev3-field-btn" onClick={() => onChange({ pitchStats: [...stats, { value: "", label: "" }] })}>+ Добавить цифру</button>

      {/* ── Состав / Этапы ── */}
      <div className="ev3-field-divider">Состав / Этапы</div>
      {items.map((it, i) => (
        <div key={i} className="ap-item-card">
          <div className="ap-item-card-header">
            <input
              type="text"
              value={it.num}
              onChange={(e) => { const n = [...items]; n[i] = { ...n[i], num: e.target.value }; onChange({ pitchItems: n }); }}
              placeholder="01"
              className="ap-item-num"
            />
            <input
              type="text"
              value={it.title}
              onChange={(e) => { const n = [...items]; n[i] = { ...n[i], title: e.target.value }; onChange({ pitchItems: n }); }}
              placeholder="Название этапа"
              className="ap-item-title"
            />
            <button type="button" className="ev3-contacts-remove" onClick={() => onChange({ pitchItems: items.filter((_, j) => j !== i) })}>×</button>
          </div>
          <textarea
            rows={2}
            value={it.body}
            onChange={(e) => { const n = [...items]; n[i] = { ...n[i], body: e.target.value }; onChange({ pitchItems: n }); }}
            placeholder="Краткое описание"
            className="ap-item-body"
          />
        </div>
      ))}
      <button type="button" className="ev3-field-btn" onClick={() => onChange({ pitchItems: [...items, { num: String(items.length + 1).padStart(2, "0"), title: "", body: "" }] })}>+ Добавить шаг</button>

      {/* ── Технические выгоды ── */}
      <div className="ev3-field-divider">Технические выгоды</div>
      {bullets.map((b, i) => (
        <div key={i} className="ap-bullet-row">
          <input
            type="text"
            value={b}
            onChange={(e) => { const n = [...bullets]; n[i] = e.target.value; onChange({ pitchBullets: n }); }}
            placeholder="Выгода или преимущество"
          />
          <button type="button" className="ev3-contacts-remove" onClick={() => onChange({ pitchBullets: bullets.filter((_, j) => j !== i) })}>×</button>
        </div>
      ))}
      <button type="button" className="ev3-field-btn" onClick={() => onChange({ pitchBullets: [...bullets, ""] })}>+ Добавить выгоду</button>

      {/* ── FAQ ── */}
      <div className="ev3-field-divider">FAQ</div>
      {faqs.map((f, i) => (
        <div key={i} className="ap-faq-card">
          <div className="ap-faq-card-header">
            <input
              type="text"
              value={f.question}
              onChange={(e) => { const n = [...faqs]; n[i] = { ...n[i], question: e.target.value }; onChange({ faqItems: n }); }}
              placeholder="Вопрос?"
              className="ap-faq-question"
            />
            <button type="button" className="ev3-contacts-remove" onClick={() => onChange({ faqItems: faqs.filter((_, j) => j !== i) })}>×</button>
          </div>
          <textarea
            rows={2}
            value={f.answer}
            onChange={(e) => { const n = [...faqs]; n[i] = { ...n[i], answer: e.target.value }; onChange({ faqItems: n }); }}
            placeholder="Ответ"
            className="ap-faq-answer"
          />
        </div>
      ))}
      <button type="button" className="ev3-field-btn" onClick={() => onChange({ faqItems: [...faqs, { question: "", answer: "" }] })}>+ Добавить вопрос</button>

      {/* ── CTA ── */}
      <div className="ev3-field-divider">CTA</div>
      <label className="ev3-field">
        <span>Цвет бренда клиента</span>
        <div className="ap-color-row">
          <input
            type="color"
            value={p.pitchBrandColor ?? "#0066CC"}
            onChange={(e) => onChange({ pitchBrandColor: e.target.value })}
            className="ap-color-input"
          />
          <input
            type="text"
            value={p.pitchBrandColor ?? "#0066CC"}
            onChange={(e) => onChange({ pitchBrandColor: e.target.value })}
            placeholder="#0066CC"
            className="ap-color-hex"
          />
        </div>
      </label>
      <label className="ev3-field">
        <span>Ссылка CTA</span>
        <input type="url" value={p.pitchCtaUrl ?? ""} onChange={(e) => onChange({ pitchCtaUrl: e.target.value })} placeholder="https://t.me/username" />
      </label>
      <label className="ev3-field">
        <span>Отображаемый контакт</span>
        <input type="text" value={p.pitchCtaContact ?? ""} onChange={(e) => onChange({ pitchCtaContact: e.target.value })} placeholder="@username" />
      </label>
    </div>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────────────
export function EditorCanvasV3({
  blocks: initialBlocks,
  shareUrl,
  saveState = "idle",
  lastSavedAt = null,
  onBlocksChange,
  onDraftBlocksChange,
}: EditorCanvasV3Props) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedRef = useRef(blocksSignature(initialBlocks));

  const [draftBlocks, setDraftBlocks] = useState<ProposalBlock[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialBlocks.filter((b) => b.visible !== false)[0]?.id ?? null
  );
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<string | null>(null); // blockId
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const visible = draftBlocks.filter((b) => b.visible !== false);
  const selectedBlock = draftBlocks.find((b) => b.id === selectedId) ?? null;

  // Загружаем медиатеку
  useEffect(() => {
    let active = true;
    fetch("/api/media-library", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => { if (active) setMediaItems(Array.isArray((json as { items?: MediaItem[] }).items) ? (json as { items: MediaItem[] }).items : []); })
      .catch(() => { if (active) setMediaItems([]); })
      .finally(() => { if (active) setMediaLoading(false); });
    return () => { active = false; };
  }, []);

  // Debounce-сохранение
  useEffect(() => {
    const sig = blocksSignature(draftBlocks);
    if (sig === lastPersistedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      lastPersistedRef.current = sig;
      onBlocksChange(draftBlocks);
    }, 900);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [draftBlocks, onBlocksChange]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const commitBlocks = useCallback((next: ProposalBlock[]) => {
    setDraftBlocks(next);
    onDraftBlocksChange?.(next);
  }, [onDraftBlocksChange]);

  const addBlock = useCallback((type: V3BlockType) => {
    const block = createV3Block(type);
    const idx = selectedId ? draftBlocks.findIndex((b) => b.id === selectedId) : draftBlocks.length - 1;
    const next = [...draftBlocks];
    next.splice(idx + 1, 0, block);
    setSelectedId(block.id);
    commitBlocks(next);
  }, [commitBlocks, draftBlocks, selectedId]);

  const removeBlock = useCallback((id: string) => {
    const idx = draftBlocks.findIndex((b) => b.id === id);
    const next = draftBlocks.filter((b) => b.id !== id);
    if (selectedId === id) {
      setSelectedId(next[Math.max(idx - 1, 0)]?.id ?? next[0]?.id ?? null);
    }
    commitBlocks(next);
  }, [commitBlocks, draftBlocks, selectedId]);

  const duplicateBlock = useCallback((id: string) => {
    const src = draftBlocks.find((b) => b.id === id);
    if (!src) return;
    const copy: ProposalBlock = {
      ...src,
      id: makeId(src.type),
      title: src.title ? `${src.title} копия` : src.title,
      payload: JSON.parse(JSON.stringify(src.payload)) as ProposalBlockPayload,
    };
    const idx = draftBlocks.findIndex((b) => b.id === id);
    const next = [...draftBlocks];
    next.splice(idx + 1, 0, copy);
    setSelectedId(copy.id);
    commitBlocks(next);
  }, [commitBlocks, draftBlocks]);

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    const idx = draftBlocks.findIndex((b) => b.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= draftBlocks.length) return;
    const next = [...draftBlocks];
    const [b] = next.splice(idx, 1);
    next.splice(nextIdx, 0, b);
    commitBlocks(next);
  }, [commitBlocks, draftBlocks]);

  const updateBlock = useCallback((id: string, patch: Partial<ProposalBlockPayload>) => {
    commitBlocks(draftBlocks.map((b) => b.id === id
      ? { ...b, payload: { ...b.payload, ...patch } }
      : b
    ));
  }, [commitBlocks, draftBlocks]);

  // Загрузка фото/видео и применение к блоку
  const handleMediaUpload = useCallback(async (file: File) => {
    setMediaUploading(true);
    setUploadProgress(0);
    try {
      const { url, kind } = await uploadFile(file, (pct) => setUploadProgress(pct));
      const item: MediaItem = { id: `up-${Date.now()}`, kind, name: file.name, url };
      setMediaItems((prev) => [item, ...prev]);
      if (mediaTarget) updateBlock(mediaTarget, { photoUrl: url, mediaType: kind });
      setMediaOpen(false);
    } finally {
      setMediaUploading(false);
      setUploadProgress(null);
    }
  }, [mediaTarget, updateBlock]);

  const handleMediaSelect = useCallback((url: string) => {
    if (mediaTarget) updateBlock(mediaTarget, { photoUrl: url });
    setMediaOpen(false);
  }, [mediaTarget, updateBlock]);

  const openMedia = useCallback((blockId: string) => {
    setMediaTarget(blockId);
    setMediaOpen(true);
  }, []);

  // AI блок — генерация текста по URL (вызывает тот же audit API для одного блока)
  const regenerateAI = useCallback(async (id: string) => {
    const block = draftBlocks.find((b) => b.id === id);
    if (!block) return;
    const url = block.payload.aiSourceUrl ?? "";
    if (!url) return;

    updateBlock(id, { aiStatus: "generating" });

    try {
      const response = await fetch("/api/proposals/generate-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: url, extraContext: block.payload.aiPrompt ?? "", singleBlock: true }),
      });
      const json = await response.json() as { html?: string; error?: string };
      if (!response.ok || !json.html) throw new Error(json.error ?? "Ошибка генерации");
      updateBlock(id, { aiResult: json.html, aiStatus: "done" });
    } catch {
      updateBlock(id, { aiStatus: "error" });
    }
  }, [draftBlocks, updateBlock]);

  // AI Wizard — применяет сгенерированные блоки к документу
  const handleWizardApply = useCallback((newBlocks: ProposalBlock[]) => {
    // Добавляем после текущей позиции или заменяем всё (если документ пустой)
    const isDocEmpty = visible.length === 0;
    if (isDocEmpty) {
      commitBlocks(newBlocks);
      setSelectedId(newBlocks[0]?.id ?? null);
    } else {
      const idx = selectedId ? draftBlocks.findIndex((b) => b.id === selectedId) : draftBlocks.length - 1;
      const next = [...draftBlocks];
      next.splice(idx + 1, 0, ...newBlocks);
      commitBlocks(next);
      setSelectedId(newBlocks[0]?.id ?? selectedId);
    }
  }, [commitBlocks, draftBlocks, selectedId, visible.length]);

  // ── Render ────────────────────────────────────────────────────────────────
  const blockTypes: V3BlockType[] = ["doc-section", "doc-text", "doc-media", "doc-embed", "doc-ai", "doc-contacts", "doc-agency-pitch"];
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null);

  return (
    <div className="ev3-layout">
      {/* ── Превью оверлей ── */}
      {previewMode && shareUrl && (
        <div className="ev3-preview-overlay" onClick={() => setPreviewMode(null)}>
          <div
            className={`ev3-preview-frame ev3-preview-frame--${previewMode}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ev3-preview-frame__bar">
              <span className="ev3-preview-frame__label">
                {previewMode === "mobile" ? "📱 Мобайл · 390px" : "🖥 Десктоп · 1280px"}
              </span>
              <div className="ev3-preview-frame__switcher">
                <button
                  type="button"
                  className={`ev3-preview-switch ${previewMode === "mobile" ? "active" : ""}`}
                  onClick={() => setPreviewMode("mobile")}
                >📱</button>
                <button
                  type="button"
                  className={`ev3-preview-switch ${previewMode === "desktop" ? "active" : ""}`}
                  onClick={() => setPreviewMode("desktop")}
                >🖥</button>
              </div>
              <button type="button" className="ev3-preview-frame__close" onClick={() => setPreviewMode(null)}>✕ Закрыть</button>
            </div>
            <div className="ev3-preview-frame__screen">
              <iframe
                key={previewMode}
                src={shareUrl}
                title="Превью"
                className="ev3-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Топбар ── */}
      <header className="ev3-topbar">
        <span className="ev3-topbar__title">Редактор документа</span>
        <div className="ev3-topbar__actions">
          {shareUrl && (
            <>
              <button
                type="button"
                className="ev3-topbar__preview-btn"
                onClick={() => setPreviewMode("mobile")}
                title="Превью на мобиле"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
                Превью
              </button>
              <a className="ev3-topbar__share" href={shareUrl} target="_blank" rel="noreferrer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Открыть публичную страницу
              </a>
            </>
          )}
        </div>
      </header>

      {/* ── Левая панель ── */}
      <aside className="ev3-left">
        <div className="ev3-panel">
          <button type="button" className="ev3-wizard-trigger" onClick={() => setWizardOpen(true)}>
            <span>⚡</span> Создать аудит по URL
          </button>

          <div className="ev3-panel-head">Добавить блок</div>
          {blockTypes.map((type) => (
            <button key={type} type="button" className="ev3-add-btn" onClick={() => addBlock(type)}>
              <span className="ev3-add-icon">
                {type === "doc-section" && "#"}
                {type === "doc-text" && "T"}
                {type === "doc-media" && "□"}
                {type === "doc-embed" && "</>"}
                {type === "doc-ai" && "⚡"}
                {type === "doc-contacts" && "@"}
                {type === "doc-agency-pitch" && "★"}
              </span>
              {getV3Label(type)}
            </button>
          ))}

          {visible.length > 0 && (
            <>
              <div className="ev3-panel-head ev3-panel-head--mt">Структура</div>
              {visible.map((block, i) => (
                <div
                  key={block.id}
                  className={`ev3-layer-row${block.id === selectedId ? " active" : ""}`}
                >
                  <button
                    type="button"
                    className="ev3-layer-item"
                    onClick={() => setSelectedId(block.id)}
                  >
                    <span className="ev3-layer-num">{i + 1}</span>
                    <span className="ev3-layer-label">{block.payload.headline || getV3Label(block.type as V3BlockType)}</span>
                  </button>
                  <div className="ev3-layer-actions">
                    <button type="button" disabled={i === 0} onClick={() => moveBlock(block.id, -1)} title="Вверх">↑</button>
                    <button type="button" disabled={i === visible.length - 1} onClick={() => moveBlock(block.id, 1)} title="Вниз">↓</button>
                    <button type="button" onClick={() => removeBlock(block.id)} title="Удалить" className="ev3-layer-delete">×</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* ── Центр: документ ── */}
      <main className="ev3-center">
        <div className="ev3-doc">
          {visible.length === 0 ? (
            <div className="ev3-empty-state">
              <div className="ev3-empty-icon">⊞</div>
              <h2>Пустой документ</h2>
              <p>Начните с кнопки «Создать аудит по URL» — и ИИ сгенерирует готовый концепт.<br />Или добавьте блоки вручную слева.</p>
              <button type="button" className="ev3-empty-cta" onClick={() => setWizardOpen(true)}>
                ⚡ Создать аудит по URL
              </button>
            </div>
          ) : (
            visible.map((block, i) => (
              <BlockRow
                key={block.id}
                block={block}
                isSelected={block.id === selectedId}
                onSelect={() => setSelectedId(block.id)}
              >
                {block.type === "doc-section" && <DocSectionView block={block} />}
                {block.type === "doc-text" && (
                  <DocTextView
                    block={block}
                    onChange={(patch) => updateBlock(block.id, patch)}
                    onUpload={async (f) => uploadFile(f).then(r => r.url)}
                  />
                )}
                {block.type === "doc-media" && (
                  <DocMediaView block={block} onOpenMedia={() => openMedia(block.id)} />
                )}
                {block.type === "doc-embed" && <DocEmbedView block={block} />}
                {block.type === "doc-ai" && <DocAIView block={block} />}
                {block.type === "doc-contacts" && (
                  <DocContactsView block={block} onOpenMedia={() => openMedia(block.id)} />
                )}
                {block.type === "doc-agency-pitch" && <DocAgencyPitchView block={block} />}
              </BlockRow>
            ))
          )}
        </div>
      </main>

      {/* ── Правая панель ── */}
      <aside className="ev3-right">
        <div className="ev3-panel">
          <div className="ev3-panel-head ev3-panel-head-state">
            <span>{selectedBlock ? getV3Label(selectedBlock.type as V3BlockType) : "—"}</span>
            <span className={`ev3-save-state ${saveState}`}>
              {saveState === "saving" && "Сохраняю"}
              {saveState === "saved" && (lastSavedAt ? `Сохранено ${lastSavedAt}` : "Сохранено")}
              {saveState === "error" && "Ошибка"}
              {saveState === "idle" && "Live"}
            </span>
          </div>

          {/* share-link перенесён в топбар */}

          {selectedBlock ? (
            <RightPanel
              block={selectedBlock}
              onChange={(patch) => updateBlock(selectedBlock.id, patch)}
              onOpenMedia={() => openMedia(selectedBlock.id)}
              onRegenerateAI={() => regenerateAI(selectedBlock.id)}
            />
          ) : (
            <div className="ev3-right-hint">Выберите блок в документе слева</div>
          )}
        </div>
      </aside>

      {/* ── Медиатека ── */}
      {mediaOpen && (
        <MediaModal
          items={mediaItems}
          loading={mediaLoading}
          uploading={mediaUploading}
          uploadProgress={uploadProgress}
          onSelect={handleMediaSelect}
          onUpload={handleMediaUpload}
          onClose={() => setMediaOpen(false)}
        />
      )}

      {/* ── Мастер аудита ── */}
      {wizardOpen && (
        <AuditWizard
          onClose={() => setWizardOpen(false)}
          onApply={handleWizardApply}
        />
      )}
    </div>
  );
}
