import type { CSSProperties } from "react";
import type { ProposalBlock } from "@/types/domain";
import { ClientHtmlBlock } from "./client-html-block";

// ── Colour helpers ────────────────────────────────────────────────────────────
function isDarkHex(hex: string): boolean {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/** Сдвинуть яркость hex-цвета на amount (−255..+255) */
function shiftHex(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(parseInt(full.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(full.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(full.slice(4, 6), 16) + amount);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function blockColorVars(
  bg: string | undefined,
  ink: string | undefined,
  defaultBg?: string,
  defaultInk?: string
): CSSProperties {
  const finalBg = bg ?? defaultBg;
  const finalInk = ink ?? (bg ? (isDarkHex(bg) ? '#f7f2ea' : '#171d24') : defaultInk);
  return {
    ...(finalBg !== undefined && { '--block-bg': finalBg }),
    ...(finalInk !== undefined && { '--block-ink': finalInk }),
  } as CSSProperties;
}

// ══════════════════════════════════════════════════
// HERO — обложка с тёмным фото-фоном
// ══════════════════════════════════════════════════
function BlockHero({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const variant = p.heroVariant || "image-split";
  const overlayOpacity = Math.min(Math.max(p.overlayOpacity ?? 72, 0), 92) / 100;
  const backgroundImage = p.backgroundImageUrl || p.photoUrl;
  const headlineDesktopSize = Math.min(Math.max(p.headlineDesktopSize ?? 56, 32), 120);
  const headlineMobileSize = Math.min(Math.max(p.headlineMobileSize ?? 34, 26), 72);
  const backgroundColor = p.backgroundColor || "#ffffff";
  const textColor = p.textColor || "#f6f2ea";

  return (
    <section
      className={`hero variant-${variant}`}
      style={{
        "--hero-title-desktop": `${headlineDesktopSize}px`,
        "--hero-title-mobile": `${headlineMobileSize}px`,
        "--hero-bg-color": backgroundColor,
        "--hero-text-color": textColor,
      } as CSSProperties}
    >
      <div
        className="hero-visual"
        id="cover"
        style={variant === "image-split" && backgroundImage ? {
          backgroundImage: `linear-gradient(90deg, rgba(10,14,19,${overlayOpacity}) 0%, rgba(10,14,19,${Math.max(overlayOpacity - 0.12, 0.36)}) 52%, rgba(10,14,19,${Math.max(overlayOpacity - 0.22, 0.24)}) 100%), url(${JSON.stringify(backgroundImage)})`,
        } : undefined}
      >
        <div className="hero-visual-grid">
          <div className="hero-content">
            {p.headline && <h1 className="hero-title">{p.headline}</h1>}
            {p.body && <p className="hero-copy">{p.body}</p>}
          </div>
          {p.photoUrl && (
            <div className="hero-side-photo">
              <div className="hero-photo-frame">
                <div
                  className="hero-photo"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(10,14,19,0.04) 0%, rgba(10,14,19,0.3) 100%), url(${JSON.stringify(p.photoUrl)})`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// EDITORIAL — редакционный текстовый блок
// ══════════════════════════════════════════════════
function BlockEditorial({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const notes = p.bullets ?? [];
  const style = blockColorVars(p.backgroundColor, p.textColor);

  return (
    <section className="block share-text-photo" style={style}>
      <div className="share-text-photo-copy">
        {p.eyebrow && <div className="section-kicker">{p.eyebrow}</div>}
        {p.headline && <h2 className="editorial-title">{p.headline}</h2>}
        {p.body && <p className="editorial-copy">{p.body}</p>}
        {notes.length > 0 && (
          <div className="editorial-columns">
            {notes.map((note, i) => (
              <div key={i} className="editorial-note">{note}</div>
            ))}
          </div>
        )}
      </div>
      {p.photoUrl && (
        <div className="share-text-photo-media">
          <img src={p.photoUrl} alt="" loading="lazy" />
        </div>
      )}
    </section>
  );
}

// ══════════════════════════════════════════════════
// METRICS — цифры / показатели
// ══════════════════════════════════════════════════
function BlockMetrics({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const metrics = p.metrics ?? [];
  const style = blockColorVars(p.backgroundColor, p.textColor);

  return (
    <section className="block share-metrics" style={style}>
      {p.eyebrow && <div className="section-kicker">{p.eyebrow}</div>}
      {p.headline && <h2 className="block-title">{p.headline}</h2>}
      {p.body && <p className="editorial-copy">{p.body}</p>}
      <div className="metrics-grid">
        {metrics.map((m, i) => (
          <div key={i} className="metric-card">
            <div className="metric-value">{m.value}</div>
            <div className="metric-label">{m.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// GALLERY PHOTO — сетка 3 фото
// ══════════════════════════════════════════════════
function BlockGalleryPhoto({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const photos = p.photos ?? [];
  const photoClasses = ["photo-1", "photo-2", "photo-3"];
  const style = blockColorVars(p.backgroundColor, p.textColor);

  return (
    <section className="block" style={style}>
      {p.eyebrow && <div className="section-kicker">{p.eyebrow}</div>}
      {p.headline && <h2 className="block-title">{p.headline}</h2>}
      {p.body && <p className="slider-copy">{p.body}</p>}
      <div className="gallery-photo-grid">
        {photos.map((photo, i) => (
          <article
            key={i}
            className={`gallery-photo ${photoClasses[i] ?? ""}`}
            style={photo.url ? {
              backgroundImage: `linear-gradient(180deg, rgba(10,14,19,0.08) 0%, rgba(10,14,19,0.72) 100%), url(${JSON.stringify(photo.url)})`,
            } : undefined}
          >
            {photo.meta && <div className="gallery-meta">{photo.meta}</div>}
            {photo.caption && <div className="gallery-caption">{photo.caption}</div>}
          </article>
        ))}
      </div>
    </section>
  );
}

// ── Video embed helper ────────────────────────────────────────────────────────
function getEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
function BlockGalleryShowcase({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const photoUrl = p.photoUrl || p.photos?.[0]?.url;
  const bg = p.backgroundColor || "#ffffff";
  const ink = p.textColor || "#f7f2ea";
  const desktopSize = Math.min(Math.max(p.captionDesktopSize ?? 16, 12), 40);
  const mobileSize = Math.min(Math.max(p.captionMobileSize ?? 14, 12), 32);

  return (
    <section
      className="block gs-block"
      style={{ "--gs-cap-desktop": `${desktopSize}px`, "--gs-cap-mobile": `${mobileSize}px` } as React.CSSProperties}
    >
      {photoUrl && (
        <img src={photoUrl} alt="" loading="lazy" className="gs-img" />
      )}
      {p.body && (
        <div className="gs-caption" style={{ background: bg, color: ink }}>
          {p.body}
        </div>
      )}
    </section>
  );
}

// ══════════════════════════════════════════════════
// VIDEO BLOCK — полная ширина + встроенный плеер
// ══════════════════════════════════════════════════
function BlockVideo({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const style = blockColorVars(p.backgroundColor, p.textColor);
  const embedUrl = p.videoUrl ? getEmbedUrl(p.videoUrl) : null;
  const isDirectVideo = p.videoUrl ? /\.(mp4|webm|ogg)(\?.*)?$/i.test(p.videoUrl) : false;

  return (
    <section className="block video-block" style={style}>
      {p.eyebrow && <div className="section-kicker">{p.eyebrow}</div>}
      {p.headline && <h2 className="video-title">{p.headline}</h2>}
      {p.body && <p className="video-copy">{p.body}</p>}
      <div className="video-player-wrap">
        {isDirectVideo && p.videoUrl ? (
          <video controls preload="metadata" poster={p.videoPoster ?? undefined}>
            <source src={p.videoUrl} />
          </video>
        ) : embedUrl ? (
          <iframe
            src={embedUrl}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title={p.headline || "Видео"}
          />
        ) : p.videoPoster ? (
          <div
            className="video-poster-fallback"
            style={{ backgroundImage: `url(${JSON.stringify(p.videoPoster)})` }}
          />
        ) : (
          <div className="video-placeholder" />
        )}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// BEFORE / AFTER — compare slider
// ══════════════════════════════════════════════════
function BlockBeforeAfter({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const beforeItems = p.beforeItems ?? [];
  const afterItems = p.afterItems ?? [];

  const baStyle = blockColorVars(p.backgroundColor, p.textColor);

  return (
    <section className="block" id="compare" style={baStyle}>
      {p.eyebrow && <div className="section-kicker">{p.eyebrow}</div>}
      {p.headline && <h2 className="compare-title">{p.headline}</h2>}
      {p.body && <p className="before-after-copy">{p.body}</p>}
      <div className="compare-grid">
        <article className="compare-card">
          <div className="compare-label">Перетяните разделитель</div>
          <div className="before-after-shell" data-before-after>
            <div className="before-after-pane before">
              <div className="caption" style={{ color: "#6c645d" }}>Текущее состояние</div>
              {p.beforeTitle && <div className="before-after-title">{p.beforeTitle}</div>}
              <div className="before-after-list">
                {beforeItems.map((item, i) => <div key={i}>{item}</div>)}
              </div>
            </div>
            <div className="before-after-pane after">
              <div className="caption" style={{ color: "rgba(247,245,240,0.72)" }}>Новая подача</div>
              {p.afterTitle && <div className="before-after-title">{p.afterTitle}</div>}
              <div className="before-after-list">
                {afterItems.map((item, i) => <div key={i}>{item}</div>)}
              </div>
            </div>
            <div className="before-after-handle" />
            <input
              className="before-after-range screen-only"
              type="range"
              min={15}
              max={85}
              defaultValue={52}
              aria-label="Сравнение до и после"
            />
          </div>
        </article>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// TIMELINE — этапы
// ══════════════════════════════════════════════════
function BlockTimeline({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const steps = p.timelineSteps ?? [];
  const style = blockColorVars(p.backgroundColor, p.textColor);

  return (
    <section className="block" style={style}>
      {p.eyebrow && <div className="section-kicker">{p.eyebrow}</div>}
      {p.headline && <h2 className="timeline-title">{p.headline}</h2>}
      {p.body && <div className="timeline-intro">{p.body}</div>}
      <div className="timeline-grid">
        {steps.map((step, i) => (
          <article key={i} className="timeline-step">
            <div className="timeline-step-index">{step.index}</div>
            <div className="timeline-step-title">{step.title}</div>
            {step.body && <div className="timeline-copy">{step.body}</div>}
          </article>
        ))}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// COMMERCIAL — коммерческий блок
// ══════════════════════════════════════════════════
function BlockCommercial({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const cards = p.commercialCards ?? [];

  const commercialStyle = blockColorVars(p.backgroundColor, p.textColor);

  return (
    <section className="block" style={commercialStyle}>
      {p.eyebrow && <div className="section-kicker">{p.eyebrow}</div>}
      {p.headline && <h2 className="commercial-title">{p.headline}</h2>}
      {p.body && <p className="commercial-copy">{p.body}</p>}
      <div className="commercial-grid">
        {cards.map((card, i) => (
          <article key={i} className={`commercial-card${card.featured ? " featured" : ""}`}>
            <div className="commercial-label">{card.label}</div>
            {card.price && <div className="price">{card.price}</div>}
            {card.meta && <div className={card.price ? "price-meta" : "commercial-copy-small"}>{card.meta}</div>}
          </article>
        ))}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// ABOUT PANEL — тёмный блок об авторе
// ══════════════════════════════════════════════════
function BlockAboutPanel({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const bullets = p.bullets ?? [];

  const aboutStyle = blockColorVars(p.backgroundColor, p.textColor);

  return (
    <section className="about-panel" id="about" style={aboutStyle}>
      <div className="about-grid">
        <div>
          {p.eyebrow && <div className="section-kicker">{p.eyebrow}</div>}
          {p.headline && <h2 className="about-title">{p.headline}</h2>}
          {p.body && <p className="about-copy">{p.body}</p>}
          {(p.ctaLabel || p.ctaLabelSecondary) && (
            <div className="about-actions">
              {p.ctaLabel && (
                <a className="button" href={p.ctaHref ?? "#"}>{p.ctaLabel}</a>
              )}
              {p.ctaLabelSecondary && (
                <a className="button-ghost" href={p.ctaHrefSecondary ?? "#"}>{p.ctaLabelSecondary}</a>
              )}
            </div>
          )}
        </div>
        {bullets.length > 0 && (
          <div className="about-list">
            {bullets.map((text, i) => (
              <article key={i} className="about-card">
                <div className="about-card-title">{text}</div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// CTA — финальный блок контакта
// ══════════════════════════════════════════════════
function BlockCta({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const contacts = p.contacts ?? [];
  const style = blockColorVars(p.backgroundColor, p.textColor);

  return (
    <section className="block cta-block" id="cta" style={style}>
      <div className="cta-grid">
        <div className="cta-panel">
          {p.eyebrow && <div className="section-kicker">{p.eyebrow}</div>}
          {p.headline && <h2 className="cta-title">{p.headline}</h2>}
          {p.body && <p className="cta-copy">{p.body}</p>}
          {(p.ctaLabel || p.ctaLabelSecondary) && (
            <div className="cta-actions">
              {p.ctaLabel && (
                <a className="button" href={p.ctaHref ?? "#"}>{p.ctaLabel}</a>
              )}
              {p.ctaLabelSecondary && (
                <a className="button-ghost" href={p.ctaHrefSecondary ?? "#"}>{p.ctaLabelSecondary}</a>
              )}
            </div>
          )}
        </div>
        {(contacts.length > 0 || p.photoUrl !== undefined) && (
          <div className="cta-side">
            <div className="cta-photo-card">
              <div
                className="cta-photo"
                style={p.photoUrl ? {
                  backgroundImage: `linear-gradient(180deg, rgba(10,14,19,0.06) 0%, rgba(10,14,19,0.72) 100%), url(${JSON.stringify(p.photoUrl)})`,
                } : undefined}
              />
            </div>
            {contacts.length > 0 && (
              <div className="cta-contact-card">
                <div className="designer-note">Контакты</div>
                <div className="cta-contact-list">
                  {contacts.map((c, i) => (
                    <div key={i} className="cta-contact-item">
                      <div className="cta-contact-label">{c.label}</div>
                      <div className="cta-contact-value-wrap">
                        {c.href ? (
                          <a className="cta-contact-value" href={c.href} target="_blank" rel="noopener noreferrer">{c.value}</a>
                        ) : (
                          <div className="cta-contact-value">{c.value}</div>
                        )}
                        {c.meta && <div className="cta-contact-meta">{c.meta}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// CUSTOM HTML — произвольный код
// ══════════════════════════════════════════════════
function BlockCustomHtml({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  if (!p.customHtml) return null;

  return <ClientHtmlBlock html={p.customHtml} className="custom-block" />;
}

// ══════════════════════════════════════════════════
// RICH TEXT — TipTap HTML output
// ══════════════════════════════════════════════════
function BlockRichText({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  if (!p.richTextHtml) return null;
  const style = blockColorVars(p.backgroundColor, p.textColor);

  return (
    <ClientHtmlBlock
      html={p.richTextHtml}
      className="rich-text-content"
      wrapperClassName="block"
      wrapperStyle={style}
      eyebrow={p.eyebrow || undefined}
    />
  );
}

// ══════════════════════════════════════════════════
// SECTION HEADING — журнальный заголовок-разделитель
// ══════════════════════════════════════════════════
function BlockSectionHeading({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const align = p.headingAlign ?? "left";
  const titleDesktop = Math.min(Math.max(p.headlineDesktopSize ?? 80, 32), 160);
  const titleMobile  = Math.min(Math.max(p.headlineMobileSize  ?? 44, 22), 100);
  const subDesktop   = Math.min(Math.max(p.subheadlineDesktopSize ?? 20, 14), 40);
  const subMobile    = Math.min(Math.max(p.subheadlineMobileSize  ?? 17, 13), 28);

  const style: CSSProperties = {
    ...blockColorVars(p.backgroundColor, p.textColor),
    "--sh-title-desktop":  `${titleDesktop}px`,
    "--sh-title-mobile":   `${titleMobile}px`,
    "--sh-sub-desktop":    `${subDesktop}px`,
    "--sh-sub-mobile":     `${subMobile}px`,
  } as CSSProperties;

  return (
    <section className={`block sh-block sh-block--${align}`} style={style}>
      <div className="sh-inner">
        {p.eyebrow && <div className="sh-kicker">{p.eyebrow}</div>}
        {p.headline && <h2 className="sh-headline">{p.headline}</h2>}
        {p.body && <p className="sh-sub">{p.body}</p>}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// V3 — DOC-AGENCY-PITCH
// ══════════════════════════════════════════════════
function BlockAgencyPitch({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const sections: string[] = Array.isArray(p.pitchSections) ? p.pitchSections : ["problem", "stats", "composition", "benefits", "process", "faq", "cta"];
  const stats: { value: string; label: string }[] = Array.isArray(p.pitchStats) ? p.pitchStats : [];
  const items: { num: string; title: string; body: string }[] = Array.isArray(p.pitchItems) ? p.pitchItems : [];
  const bullets: string[] = Array.isArray(p.pitchBullets) ? p.pitchBullets : [];
  const faqs: { question: string; answer: string }[] = Array.isArray(p.faqItems) ? p.faqItems : [];
  const agencyName = p.agencyName ?? "Konversus";
  const ctaUrl = p.pitchCtaUrl ?? "#";
  const ctaContact = p.pitchCtaContact ?? agencyName;
  const brandColor = p.pitchBrandColor ?? "#0066CC";

  const blockStyle = {
    "--ap-accent": brandColor,
    "--ap-accent-dark": shiftHex(brandColor, -20),
    "--ap-accent-light": brandColor + "18",
  } as React.CSSProperties;

  return (
    <div className="ap-block" style={blockStyle}>
      {sections.includes("problem") && (
        <section className="ap-section ap-section--problem">
          <div className="ap-container">
            {p.eyebrow && <div className="ap-eyebrow">{p.eyebrow}</div>}
            <h1 className="ap-h1">{p.headline ?? "Ваш проект"}</h1>
            {p.body && <p className="ap-lead">{p.body}</p>}
            <div className="ap-problem-grid">
              <div className="ap-problem-card"><span className="ap-problem-icon">📉</span><span>Потенциальные клиенты не находят вас в интернете</span></div>
              <div className="ap-problem-card"><span className="ap-problem-icon">💸</span><span>Рекламный бюджет утекает без конверсии</span></div>
              <div className="ap-problem-card"><span className="ap-problem-icon">🔗</span><span>Нет доверия — нет заявок</span></div>
            </div>
          </div>
        </section>
      )}

      {sections.includes("stats") && stats.length > 0 && (
        <section className="ap-section ap-section--stats">
          <div className="ap-container">
            <div className="ap-section-kicker">Об агентстве {agencyName}</div>
            <div className="ap-stats-grid">
              {stats.map((s, i) => (
                <div key={i} className="ap-stat">
                  <div className="ap-stat-value">{s.value}</div>
                  <div className="ap-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {sections.includes("composition") && items.length > 0 && (
        <section className="ap-section ap-section--composition">
          <div className="ap-container">
            <div className="ap-section-kicker">Что входит в работу</div>
            <h2 className="ap-h2">Полный состав услуги</h2>
            <div className="ap-items-grid">
              {items.map((it, i) => (
                <div key={i} className="ap-item">
                  <div className="ap-item-num">{it.num}</div>
                  <div className="ap-item-title">{it.title}</div>
                  <div className="ap-item-body">{it.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {sections.includes("benefits") && (
        <section className="ap-section ap-section--benefits">
          <div className="ap-container">
            <div className="ap-section-kicker">Наш подход</div>
            <h2 className="ap-h2">Почему выбирают нас</h2>
            <div className="ap-benefits-list">
              {["Фиксированный срок в договоре — без сдвигов дедлайна", "Прозрачный бюджет — никаких скрытых доплат", "Один менеджер на весь проект — вы всегда знаете, к кому обратиться", "Готовый сайт, адаптированный под мобильные устройства"].map((b, i) => (
                <div key={i} className="ap-benefit"><span className="ap-benefit-icon">✓</span><span>{b}</span></div>
              ))}
            </div>
          </div>
        </section>
      )}

      {sections.includes("process") && items.length > 0 && (
        <section className="ap-section ap-section--process">
          <div className="ap-container">
            <div className="ap-section-kicker">Как проходит работа</div>
            <h2 className="ap-h2">Этапы проекта</h2>
            <div className="ap-process-list">
              {items.map((it, i) => (
                <div key={i} className="ap-process-step">
                  <div className="ap-process-num">{it.num}</div>
                  <div className="ap-process-content">
                    <div className="ap-process-title">{it.title}</div>
                    <div className="ap-process-body">{it.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {sections.includes("tech") && bullets.length > 0 && (
        <section className="ap-section ap-section--tech">
          <div className="ap-container">
            <div className="ap-section-kicker">Технические выгоды</div>
            <h2 className="ap-h2">Что вы получаете под капотом</h2>
            <div className="ap-tech-grid">
              {bullets.map((b, i) => (
                <div key={i} className="ap-tech-item"><span className="ap-tech-check">✓</span><span>{b}</span></div>
              ))}
            </div>
          </div>
        </section>
      )}

      {sections.includes("faq") && faqs.length > 0 && (
        <section className="ap-section ap-section--faq">
          <div className="ap-container">
            <div className="ap-section-kicker">Вопросы и ответы</div>
            <h2 className="ap-h2">FAQ</h2>
            <div className="ap-faq-list">
              {faqs.map((f, i) => (
                <details key={i} className="ap-faq-item" open={i === 0}>
                  <summary className="ap-faq-q">{f.question}</summary>
                  <div className="ap-faq-a">{f.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {sections.includes("cta") && (
        <section className="ap-section ap-section--cta">
          <div className="ap-container">
            <h2 className="ap-cta-title">Готовы начать?</h2>
            <p className="ap-cta-sub">Напишите нам — обсудим задачу и подготовим расчёт в течение одного дня.</p>
            <a href={ctaUrl} className="ap-cta-btn" target="_blank" rel="noopener noreferrer">Написать {agencyName}</a>
            <div className="ap-cta-contact">{ctaContact}</div>
          </div>
        </section>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// V3 — DOC-SECTION
// ══════════════════════════════════════════════════
function BlockDocSection({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const style = blockColorVars(p.backgroundColor, p.textColor);
  return (
    <section className="dv3-section" style={style}>
      {p.eyebrow && <div className="dv3-section__eyebrow">{p.eyebrow}</div>}
      {p.headline && <h2 className="dv3-section__title">{p.headline}</h2>}
      {p.body && <p className="dv3-section__sub">{p.body}</p>}
    </section>
  );
}

// ══════════════════════════════════════════════════
// V3 — DOC-TEXT
// ══════════════════════════════════════════════════
function BlockDocText({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  if (!p.richTextHtml) return null;
  const style = blockColorVars(p.backgroundColor, p.textColor);
  return (
    <ClientHtmlBlock
      html={p.richTextHtml}
      className="dv3-text__prose"
      wrapperClassName="dv3-text"
      wrapperStyle={style}
    />
  );
}

// ══════════════════════════════════════════════════
// V3 — DOC-MEDIA
// ══════════════════════════════════════════════════
function BlockDocMedia({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const url = p.photoUrl ?? "";
  const display = p.mediaDisplay ?? "full";
  const isVideo = p.mediaType === "video";
  const videoAspect = p.videoAspect ?? "landscape";
  if (!url) return null;

  return (
    <figure className={`dv3-media dv3-media--${display}`}>
      {isVideo ? (
        <div className={`dv3-media__video-wrap dv3-media__video-wrap--${videoAspect}`}>
          <video src={url} controls poster={p.videoPoster ?? undefined} className="dv3-media__video" />
        </div>
      ) : (
        <img src={url} alt="" className="dv3-media__img" loading="lazy" />
      )}
      {p.body && <figcaption className="dv3-media__caption">{p.body}</figcaption>}
    </figure>
  );
}

// ══════════════════════════════════════════════════
// V3 — DOC-EMBED
// ══════════════════════════════════════════════════
function BlockDocEmbed({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const code = (p.embedCode ?? "").trim();
  if (!code) return null;

  const ytMatch = code.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch ?? p.embedType === "youtube") {
    const videoId = ytMatch?.[1] ?? "";
    const src = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : (code.startsWith("http") ? code : "");
    if (!src) return null;
    return (
      <div className="dv3-embed">
        <div className="dv3-embed__ratio">
          <iframe src={src} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Видео" />
        </div>
      </div>
    );
  }

  return <ClientHtmlBlock html={code} className="dv3-embed" />;
}

// ══════════════════════════════════════════════════
// V3 — DOC-AI
// ══════════════════════════════════════════════════
function BlockDocAI({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const result = (p.aiResult ?? "").trim();
  if (!result) return null;
  return <ClientHtmlBlock html={result} className="dv3-text__prose" wrapperClassName="dv3-text" />;
}

// ══════════════════════════════════════════════════
// V3 — DOC-CONTACTS
// ══════════════════════════════════════════════════
function BlockDocContacts({ block }: { block: ProposalBlock }) {
  const p = block.payload;
  const contacts = (p.contacts ?? []) as Array<{ label: string; value: string; href?: string; meta?: string }>;

  return (
    <section className="dv3-contacts">
      <div className="dv3-contacts__inner">
        {p.photoUrl && (
          <div className="dv3-contacts__photo">
            <img src={p.photoUrl} alt="" loading="lazy" />
          </div>
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
                    ? <a className="dv3-contacts__value" href={c.href} target="_blank" rel="noopener noreferrer">{c.value}</a>
                    : <span className="dv3-contacts__value">{c.value}</span>
                  }
                </li>
              ))}
            </ul>
          )}
          <div className="dv3-contacts__ctas">
            {p.ctaHref && p.ctaLabel && (
              <a className="dv3-contacts__cta" href={p.ctaHref} target="_blank" rel="noopener noreferrer">{p.ctaLabel}</a>
            )}
            {p.ctaHrefSecondary && p.ctaLabelSecondary && (
              <a className="dv3-contacts__cta dv3-contacts__cta--sec" href={p.ctaHrefSecondary} target="_blank" rel="noopener noreferrer">{p.ctaLabelSecondary}</a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// RENDER DISPATCH
// ══════════════════════════════════════════════════
export function renderBlock(block: ProposalBlock) {
  if (!block.visible) return null;

  switch (block.type) {
    case "hero":             return <BlockHero key={block.id} block={block} />;
    case "editorial":        return <BlockEditorial key={block.id} block={block} />;
    case "metrics":          return <BlockMetrics key={block.id} block={block} />;
    case "gallery-photo":    return <BlockGalleryPhoto key={block.id} block={block} />;
    case "gallery-showcase": return <BlockGalleryShowcase key={block.id} block={block} />;
    case "video-block":      return <BlockVideo key={block.id} block={block} />;
    case "before-after":     return <BlockBeforeAfter key={block.id} block={block} />;
    case "timeline":         return <BlockTimeline key={block.id} block={block} />;
    case "commercial":       return <BlockCommercial key={block.id} block={block} />;
    case "about-panel":      return <BlockAboutPanel key={block.id} block={block} />;
    case "cta":              return <BlockCta key={block.id} block={block} />;
    case "custom-html":      return <BlockCustomHtml key={block.id} block={block} />;
    case "rich-text":        return <BlockRichText key={block.id} block={block} />;
    case "section-heading":  return <BlockSectionHeading key={block.id} block={block} />;
    case "doc-agency-pitch": return <BlockAgencyPitch key={block.id} block={block} />;
    // ── V3 блоки ─────────────────────────────────────────────────────────
    case "doc-section":      return <BlockDocSection key={block.id} block={block} />;
    case "doc-text":         return <BlockDocText key={block.id} block={block} />;
    case "doc-media":        return <BlockDocMedia key={block.id} block={block} />;
    case "doc-embed":        return <BlockDocEmbed key={block.id} block={block} />;
    case "doc-ai":           return <BlockDocAI key={block.id} block={block} />;
    case "doc-contacts":     return <BlockDocContacts key={block.id} block={block} />;
    default: {
      // Fallback для старых/неизвестных типов блоков
      const p = block.payload;
      return (
        <section key={block.id} className="block">
          {p.eyebrow && <div className="section-kicker">{p.eyebrow}</div>}
          {p.headline && <h2 className="block-title">{p.headline}</h2>}
          {p.body && <p className="editorial-copy">{p.body}</p>}
          {(p.bullets ?? []).length > 0 && (
            <div className="editorial-columns">
              {(p.bullets ?? []).map((b, i) => (
                <div key={i} className="editorial-note">{b}</div>
              ))}
            </div>
          )}
          {(p.metrics ?? []).length > 0 && (
            <div className="metrics-grid" style={{ marginTop: 24 }}>
              {(p.metrics ?? []).map((m, i) => (
                <div key={i} className="metric-card">
                  <div className="metric-value">{m.value}</div>
                  <div className="metric-label">{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }
  }
}
