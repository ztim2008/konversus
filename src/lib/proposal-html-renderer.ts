import type { ProposalBlock } from "@/types/domain";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isSafeHref(value: unknown) {
  const href = String(value ?? "").trim();
  return /^(https?:|mailto:|tel:)/i.test(href) ? href : "";
}

function cssUrl(value: unknown) {
  const url = String(value ?? "").trim();
  if (!url) return "";

  return `url(${JSON.stringify(url)})`;
}

function cssColor(value: unknown, fallback: string) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
}

// Returns only the CSS vars that are explicitly set (no defaults → palette takes over)
function blockCssVars(bg: unknown, ink: unknown): string {
  const bgStr = String(bg ?? "").trim();
  const inkStr = String(ink ?? "").trim();
  const parts: string[] = [];
  if (/^#[0-9a-f]{3,8}$/i.test(bgStr)) parts.push(`--block-bg:${bgStr}`);
  if (/^#[0-9a-f]{3,8}$/i.test(inkStr)) parts.push(`--block-ink:${inkStr}`);
  return parts.join("; ");
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(Math.max(parsed, min), max);
}

function renderHero(block: ProposalBlock, options?: { mobile?: boolean }) {
  const payload = block.payload ?? {};
  const variant = payload.heroVariant || "image-split";
  const headline = escapeHtml(payload.headline || "Промышленная компания должна выглядеть убедительно с первого экрана");
  const body = escapeHtml(payload.body || "Собираем спокойный, дорогой первый экран: сильная формулировка, производственный фон и один визуальный акцент справа.");
  const backgroundUrl = String(payload.backgroundImageUrl || payload.photoUrl || "").trim();
  const sideImageUrl = String(payload.photoUrl || "").trim();
  const backgroundImage = cssUrl(backgroundUrl);
  const sideImage = cssUrl(sideImageUrl);
  const overlay = clampNumber(payload.overlayOpacity, 20, 90, 72) / 100;
  const overlaySoft = Math.max(overlay - 0.14, 0.32);
  const headlineDesktopSize = clampNumber(payload.headlineDesktopSize, 32, 120, 56);
  const headlineMobileSize = clampNumber(payload.headlineMobileSize, 26, 72, 34);
  const h1FontSize = options?.mobile ? `${headlineMobileSize}px` : `${headlineDesktopSize}px`;
  const backgroundColor = cssColor(payload.backgroundColor, "");
  const textColor = cssColor(payload.textColor, "#f6f2ea");

  return `
    <section class="fpb-hero variant-${escapeHtml(variant)}" data-block-id="${escapeHtml(block.id)}" style="--hero-overlay:${overlay}; --hero-overlay-soft:${overlaySoft}; --hero-title-desktop:${headlineDesktopSize}px; --hero-title-mobile:${headlineMobileSize}px; --hero-bg-color:${backgroundColor}; --hero-text-color:${textColor}; ${backgroundImage ? `--hero-bg:${backgroundImage};` : ""}">
      <div class="fpb-hero__inner">
        <div class="fpb-hero__copy">
          <h1 style="font-size:${h1FontSize}">${headline}</h1>
          <p>${body}</p>
        </div>
        ${sideImageUrl ? `
          <figure class="fpb-hero__media" style="--hero-photo:${sideImage};">
            <img class="fpb-hero__photo" src="${escapeHtml(sideImageUrl)}" alt="" loading="eager">
          </figure>
        ` : ""}
      </div>
    </section>
  `;
}

function renderMetrics(block: ProposalBlock) {
  const payload = block.payload ?? {};
  const metrics = Array.isArray(payload.metrics) ? payload.metrics : [];
  const headline = escapeHtml(payload.headline || "Факты, которые быстро фиксируют масштаб компании");
  const body = escapeHtml(payload.body || "Короткая доказательная секция после первого экрана: цифры, которые снимают сомнения и помогают перейти к деталям.");
  const blockVars = blockCssVars(payload.backgroundColor, payload.textColor);

  return `
    <section class="fpb-section fpb-metrics" data-block-id="${escapeHtml(block.id)}" style="${blockVars}">
      <div class="fpb-section__head">
        <h2>${headline}</h2>
        <p>${body}</p>
      </div>
      <div class="fpb-metrics__grid">
        ${metrics.map((metric) => `
          <article class="fpb-metric">
            <strong>${escapeHtml(metric.value)}</strong>
            <span>${escapeHtml(metric.label)}</span>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderTextPhoto(block: ProposalBlock) {
  const payload = block.payload ?? {};
  const headline = escapeHtml(payload.headline || "Текстовый блок раскрывает контекст предложения");
  const body = escapeHtml(payload.body || "Здесь удобно объяснить подход, задачу, производственную специфику или логику проекта простым человеческим языком.");
  const photoUrl = String(payload.photoUrl || "").trim();
  const photo = cssUrl(photoUrl);
  const blockVars = blockCssVars(payload.backgroundColor, payload.textColor);

  return `
    <section class="fpb-section fpb-text-photo" data-block-id="${escapeHtml(block.id)}" style="${blockVars}">
      <div class="fpb-text-photo__copy">
        <h2>${headline}</h2>
        <p>${body}</p>
      </div>
      ${photoUrl ? `
        <figure class="fpb-text-photo__media" style="--text-photo:${photo};">
          <img src="${escapeHtml(photoUrl)}" alt="" loading="lazy">
        </figure>
      ` : ""}
    </section>
  `;
}

function renderFullPhoto(block: ProposalBlock, options?: { mobile?: boolean }) {
  const payload = block.payload ?? {};
  const photoUrl = String(payload.photoUrl || payload.photos?.[0]?.url || "").trim();
  const body = escapeHtml(payload.body || "");
  const bg = escapeHtml(String(payload.backgroundColor || "#ffffff"));
  const ink = escapeHtml(String(payload.textColor || "#f7f2ea"));
  const desktopSize = Math.min(Math.max(payload.captionDesktopSize ?? 16, 12), 40);
  const mobileSize = Math.min(Math.max(payload.captionMobileSize ?? 14, 12), 32);
  const captionSize = options?.mobile ? mobileSize : desktopSize;

  return `
    <section class="fpb-full-photo" data-block-id="${escapeHtml(block.id)}" style="--gs-cap-desktop:${desktopSize}px;--gs-cap-mobile:${mobileSize}px;">
      <div class="fpb-full-photo__image">${photoUrl ? `<img src="${escapeHtml(photoUrl)}" alt="" loading="lazy">` : ""}</div>
      ${body ? `<div class="fpb-full-photo__caption" style="background:${bg};color:${ink};font-size:${captionSize}px;">${body}</div>` : ""}
    </section>
  `;
}

function renderFullVideo(block: ProposalBlock) {
  const payload = block.payload ?? {};
  const headline = escapeHtml(payload.headline || "Видео показывает производство быстрее любого описания");
  const body = escapeHtml(payload.body || "Полноширинный видео-блок для презентации цеха, команды, оборудования или маршрута проекта.");
  const posterUrl = String(payload.videoPoster || payload.photoUrl || "").trim();
  const poster = cssUrl(posterUrl);
  const videoUrl = String(payload.videoUrl || "").trim();

  return `
    <section class="fpb-full-video" data-block-id="${escapeHtml(block.id)}">
      <div class="fpb-full-video__stage" style="${poster ? `--video-poster:${poster};` : ""}">
        ${posterUrl ? `<img src="${escapeHtml(posterUrl)}" alt="" loading="lazy">` : ""}
        ${videoUrl ? `<a class="fpb-full-video__play" href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer">Смотреть видео</a>` : ""}
      </div>
      <div class="fpb-full-video__caption">
        <h2>${headline}</h2>
        <p>${body}</p>
      </div>
    </section>
  `;
}

function renderPhotoGallery(block: ProposalBlock) {
  const payload = block.payload ?? {};
  const photos = (Array.isArray(payload.photos) ? payload.photos : []).filter((photo) => photo.url).slice(0, 6);
  const headline = escapeHtml(payload.headline || "Галерея показывает производство через серию коротких кадров");
  const body = escapeHtml(payload.body || "До шести фото без пагинации: на desktop — плотная сетка, на мобильном — горизонтальная лента.");

  return `
    <section class="fpb-section fpb-photo-gallery" data-block-id="${escapeHtml(block.id)}">
      <div class="fpb-section__head">
        <h2>${headline}</h2>
        <p>${body}</p>
      </div>
      <div class="fpb-photo-gallery__rail">
        ${photos.map((photo, index) => `
          <article class="fpb-photo-gallery__item">
            <img src="${escapeHtml(photo.url)}" alt="" loading="lazy">
            <div><span>${escapeHtml(photo.meta || `Кадр ${String(index + 1).padStart(2, "0")}`)}</span>${photo.caption ? `<p>${escapeHtml(photo.caption)}</p>` : ""}</div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCustomHtml(block: ProposalBlock) {
  const html = String(block.payload?.customHtml || "").trim();
  if (!html) {
    return `
      <section class="fpb-section fpb-custom-empty" data-block-id="${escapeHtml(block.id)}">
        <p>HTML-вставка пока пустая.</p>
      </section>
    `;
  }

  return `<section class="fpb-custom-html" data-block-id="${escapeHtml(block.id)}">${html}</section>`;
}

function renderCta(block: ProposalBlock) {
  const payload = block.payload ?? {};
  const contacts = Array.isArray(payload.contacts) ? payload.contacts : [];
  const headline = escapeHtml(payload.headline || "Готов обсудить проект и следующий шаг");
  const body = escapeHtml(payload.body || "Коротко сверим задачу, материалы и формат будущей коммерческой страницы.");
  const photoUrl = String(payload.photoUrl || "").trim();
  const photo = cssUrl(photoUrl);
  const primaryHref = isSafeHref(payload.ctaHref);
  const secondaryHref = isSafeHref(payload.ctaHrefSecondary);
  const blockVars = blockCssVars(payload.backgroundColor, payload.textColor);

  return `
    <section class="fpb-section fpb-contact" data-block-id="${escapeHtml(block.id)}" style="${blockVars}">
      <div class="fpb-contact__copy">
        <h2>${headline}</h2>
        <p>${body}</p>
        ${(primaryHref || secondaryHref) ? `
          <div class="fpb-contact__actions">
            ${primaryHref ? `<a href="${escapeHtml(primaryHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.ctaLabel || "Написать в Telegram")}</a>` : ""}
            ${secondaryHref ? `<a href="${escapeHtml(secondaryHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.ctaLabelSecondary || "Написать в MAX")}</a>` : ""}
          </div>
        ` : ""}
      </div>
      <div class="fpb-contact__side">
        ${photoUrl ? `<img class="fpb-contact__photo" src="${escapeHtml(photoUrl)}" alt="" loading="lazy">` : ""}
        <div class="fpb-contact__list">
          ${contacts.map((contact) => {
            const href = isSafeHref(contact.href);
            const value = escapeHtml(contact.value);
            const meta = contact.meta ? `<small class="fpb-contact__meta">${escapeHtml(contact.meta)}</small>` : "";
            return `
            <div class="fpb-contact__item">
              <span>${escapeHtml(contact.label)}</span>
              <div class="fpb-contact__value-wrap">
                ${href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${value}</a>` : `<strong>${value}</strong>`}
                ${meta}
              </div>
            </div>
          `}).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderBlock(block: ProposalBlock, options?: { mobile?: boolean }) {
  if (block.type === "hero") {
    return renderHero(block, options);
  }

  if (block.type === "metrics") {
    return renderMetrics(block);
  }

  if (block.type === "editorial") {
    return renderTextPhoto(block);
  }

  if (block.type === "gallery-showcase") {
    return renderFullPhoto(block, options);
  }

  if (block.type === "video-block") {
    return renderFullVideo(block);
  }

  if (block.type === "gallery-photo") {
    return renderPhotoGallery(block);
  }

  if (block.type === "custom-html") {
    return renderCustomHtml(block);
  }

  if (block.type === "cta") {
    return renderCta(block);
  }

  if (block.type === "rich-text") {
    const p = block.payload;
    const vars = blockCssVars(p.backgroundColor, p.textColor);
    const eyebrow = p.eyebrow ? `<p class="fpb-eyebrow">${escapeHtml(p.eyebrow)}</p>` : "";
    const content = p.richTextHtml ?? "";
    return `<section class="fpb-rich-text-block fpb-section" data-block-id="${escapeHtml(block.id)}" style="${vars}">
  <div class="fpb-rich-text-inner">
    ${eyebrow}
    <div class="fpb-rich-text-content">${content}</div>
  </div>
</section>`;
  }

  if (block.type === "section-heading") {
    const p = block.payload;
    const vars = blockCssVars(p.backgroundColor, p.textColor);
    const align = p.headingAlign || "left";
    const titleDesktop = Math.min(Math.max(p.headlineDesktopSize ?? 80, 32), 160);
    const titleMobile  = Math.min(Math.max(p.headlineMobileSize  ?? 44, 22), 100);
    const subDesktop   = Math.min(Math.max(p.subheadlineDesktopSize ?? 20, 14), 40);
    const subMobile    = Math.min(Math.max(p.subheadlineMobileSize  ?? 17, 13), 28);
    const titleSize = options?.mobile ? titleMobile : titleDesktop;
    const subSize    = options?.mobile ? subMobile   : subDesktop;
    const kicker = p.eyebrow ? `<div class="sh-kicker">${escapeHtml(p.eyebrow)}</div>` : "";
    const headline = p.headline ? `<h2 class="sh-headline" style="font-size:${titleSize}px">${escapeHtml(p.headline)}</h2>` : "";
    const sub = p.body ? `<p class="sh-sub" style="font-size:${subSize}px">${escapeHtml(p.body)}</p>` : "";
    return `<section class="sh-block sh-block--${align} fpb-section" data-block-id="${escapeHtml(block.id)}" style="${vars};--sh-title-desktop:${titleDesktop}px;--sh-title-mobile:${titleMobile}px;--sh-sub-desktop:${subDesktop}px;--sh-sub-mobile:${subMobile}px;">
  <div class="sh-inner">
    ${kicker}
    ${headline}
    ${sub}
  </div>
</section>`;
  }

  if (block.type === "doc-agency-pitch") {
    const p = block.payload;
    const clientName = escapeHtml(p.headline ?? "Ваш проект");
    const leadText = escapeHtml(p.body ?? "");
    const eyebrow = p.eyebrow ? `<div class="ap-eyebrow">${escapeHtml(p.eyebrow)}</div>` : "";
    const agencyName = escapeHtml(p.agencyName ?? "Konversus");
    const sections: string[] = Array.isArray(p.pitchSections) ? p.pitchSections : ["problem", "stats", "composition", "benefits", "process", "faq", "cta"];
    const stats: { value: string; label: string }[] = Array.isArray(p.pitchStats) ? p.pitchStats : [];
    const items: { num: string; title: string; body: string }[] = Array.isArray(p.pitchItems) ? p.pitchItems : [];
    const bullets: string[] = Array.isArray(p.pitchBullets) ? p.pitchBullets : [];
    const faqs: { question: string; answer: string }[] = Array.isArray(p.faqItems) ? p.faqItems : [];
    const ctaUrl = escapeHtml(p.pitchCtaUrl ?? "#");
    const ctaContact = escapeHtml(p.pitchCtaContact ?? agencyName);

    const sectionProblem = sections.includes("problem") ? `
<section class="ap-section ap-section--problem">
  <div class="ap-container">
    ${eyebrow}
    <h1 class="ap-h1">${clientName}</h1>
    ${leadText ? `<p class="ap-lead">${leadText}</p>` : ""}
    <div class="ap-problem-grid">
      <div class="ap-problem-card"><div class="ap-problem-icon">📉</div><div>Потенциальные клиенты не находят вас в интернете</div></div>
      <div class="ap-problem-card"><div class="ap-problem-icon">💸</div><div>Рекламный бюджет утекает без конверсии</div></div>
      <div class="ap-problem-card"><div class="ap-problem-icon">🔗</div><div>Нет доверия — нет заявок</div></div>
    </div>
  </div>
</section>` : "";

    const sectionStats = sections.includes("stats") && stats.length > 0 ? `
<section class="ap-section ap-section--stats">
  <div class="ap-container">
    <div class="ap-section-kicker">Об агентстве ${agencyName}</div>
    <div class="ap-stats-grid">
      ${stats.map(s => `<div class="ap-stat"><div class="ap-stat-value">${escapeHtml(s.value)}</div><div class="ap-stat-label">${escapeHtml(s.label)}</div></div>`).join("")}
    </div>
  </div>
</section>` : "";

    const sectionComposition = sections.includes("composition") && items.length > 0 ? `
<section class="ap-section ap-section--composition">
  <div class="ap-container">
    <div class="ap-section-kicker">Что входит в работу</div>
    <h2 class="ap-h2">Полный состав услуги</h2>
    <div class="ap-items-grid">
      ${items.map(it => `<div class="ap-item"><div class="ap-item-num">${escapeHtml(it.num)}</div><div class="ap-item-title">${escapeHtml(it.title)}</div><div class="ap-item-body">${escapeHtml(it.body)}</div></div>`).join("")}
    </div>
  </div>
</section>` : "";

    const sectionBenefits = sections.includes("benefits") ? `
<section class="ap-section ap-section--benefits">
  <div class="ap-container">
    <div class="ap-section-kicker">Наш подход</div>
    <h2 class="ap-h2">Почему выбирают нас</h2>
    <div class="ap-benefits-list">
      <div class="ap-benefit"><span class="ap-benefit-icon">✓</span><span>Фиксированный срок в договоре — без сдвигов дедлайна</span></div>
      <div class="ap-benefit"><span class="ap-benefit-icon">✓</span><span>Прозрачный бюджет — никаких скрытых доплат</span></div>
      <div class="ap-benefit"><span class="ap-benefit-icon">✓</span><span>Один менеджер на весь проект — вы всегда знаете, к кому обратиться</span></div>
      <div class="ap-benefit"><span class="ap-benefit-icon">✓</span><span>Готовый сайт, адаптированный под мобильные устройства</span></div>
    </div>
  </div>
</section>` : "";

    const sectionProcess = sections.includes("process") && items.length > 0 ? `
<section class="ap-section ap-section--process">
  <div class="ap-container">
    <div class="ap-section-kicker">Как проходит работа</div>
    <h2 class="ap-h2">Этапы проекта</h2>
    <div class="ap-process-list">
      ${items.map(it => `<div class="ap-process-step"><div class="ap-process-num">${escapeHtml(it.num)}</div><div class="ap-process-content"><div class="ap-process-title">${escapeHtml(it.title)}</div><div class="ap-process-body">${escapeHtml(it.body)}</div></div></div>`).join("")}
    </div>
  </div>
</section>` : "";

    const sectionTech = sections.includes("tech") && bullets.length > 0 ? `
<section class="ap-section ap-section--tech">
  <div class="ap-container">
    <div class="ap-section-kicker">Технические выгоды</div>
    <h2 class="ap-h2">Что вы получаете под капотом</h2>
    <div class="ap-tech-grid">
      ${bullets.map(b => `<div class="ap-tech-item"><span class="ap-tech-check">✓</span><span>${escapeHtml(b)}</span></div>`).join("")}
    </div>
  </div>
</section>` : "";

    const sectionFaq = sections.includes("faq") && faqs.length > 0 ? `
<section class="ap-section ap-section--faq">
  <div class="ap-container">
    <div class="ap-section-kicker">Вопросы и ответы</div>
    <h2 class="ap-h2">FAQ</h2>
    <div class="ap-faq-list">
      ${faqs.map((f, i) => `
      <details class="ap-faq-item" ${i === 0 ? "open" : ""}>
        <summary class="ap-faq-q">${escapeHtml(f.question)}</summary>
        <div class="ap-faq-a">${escapeHtml(f.answer)}</div>
      </details>`).join("")}
    </div>
  </div>
</section>` : "";

    const sectionCta = sections.includes("cta") ? `
<section class="ap-section ap-section--cta">
  <div class="ap-container">
    <h2 class="ap-cta-title">Готовы начать?</h2>
    <p class="ap-cta-sub">Напишите нам — обсудим задачу и подготовим расчёт в течение одного дня.</p>
    <a href="${ctaUrl}" class="ap-cta-btn" target="_blank" rel="noopener">Написать ${agencyName}</a>
    <div class="ap-cta-contact">${ctaContact}</div>
  </div>
</section>` : "";

    return `<div class="ap-block fpb-section" data-block-id="${escapeHtml(block.id)}">
  <style>
    .ap-block{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;--ap-accent:#0066CC;--ap-bg:#ffffff;--ap-bg2:#f8fafc;--ap-ink:#0f172a;--ap-muted:#64748b;--ap-border:#e2e8f0;}
    .ap-section{padding:56px 0;background:var(--ap-bg);border-bottom:1px solid var(--ap-border);}
    .ap-section--stats,.ap-section--tech{background:var(--ap-bg2);}
    .ap-section--problem{background:var(--ap-ink);color:#fff;}
    .ap-section--cta{background:var(--ap-accent);color:#fff;text-align:center;}
    .ap-container{max-width:960px;margin:0 auto;padding:0 24px;}
    .ap-eyebrow{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;opacity:.6;margin-bottom:16px;}
    .ap-section-kicker{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ap-accent);margin-bottom:12px;}
    .ap-h1{font-size:clamp(28px,5vw,52px);font-weight:700;line-height:1.15;margin:0 0 20px;}
    .ap-h2{font-size:clamp(22px,3.5vw,36px);font-weight:700;line-height:1.2;margin:0 0 32px;color:var(--ap-ink);}
    .ap-lead{font-size:18px;line-height:1.6;opacity:.85;max-width:680px;}
    .ap-problem-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:32px;}
    .ap-problem-card{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:20px;display:flex;gap:14px;align-items:flex-start;font-size:15px;line-height:1.5;}
    .ap-problem-icon{font-size:22px;flex-shrink:0;}
    .ap-stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:24px;}
    .ap-stat{text-align:center;padding:24px 16px;background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.06);}
    .ap-stat-value{font-size:36px;font-weight:800;color:var(--ap-accent);line-height:1;}
    .ap-stat-label{font-size:13px;color:var(--ap-muted);margin-top:6px;}
    .ap-items-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;}
    .ap-item{border:1px solid var(--ap-border);border-radius:8px;padding:24px;background:#fff;}
    .ap-item-num{font-size:12px;font-weight:700;letter-spacing:.08em;color:var(--ap-accent);margin-bottom:8px;}
    .ap-item-title{font-size:16px;font-weight:600;margin-bottom:8px;color:var(--ap-ink);}
    .ap-item-body{font-size:14px;line-height:1.6;color:var(--ap-muted);}
    .ap-benefits-list{display:flex;flex-direction:column;gap:14px;max-width:680px;}
    .ap-benefit{display:flex;gap:12px;align-items:flex-start;font-size:16px;line-height:1.6;}
    .ap-benefit-icon{color:var(--ap-accent);font-weight:700;flex-shrink:0;margin-top:2px;}
    .ap-process-list{display:flex;flex-direction:column;gap:0;}
    .ap-process-step{display:flex;gap:20px;align-items:flex-start;padding:20px 0;border-bottom:1px solid var(--ap-border);}
    .ap-process-step:last-child{border-bottom:none;}
    .ap-process-num{font-size:11px;font-weight:700;letter-spacing:.1em;color:var(--ap-accent);min-width:32px;padding-top:2px;}
    .ap-process-title{font-size:16px;font-weight:600;color:var(--ap-ink);margin-bottom:4px;}
    .ap-process-body{font-size:14px;line-height:1.6;color:var(--ap-muted);}
    .ap-tech-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;}
    .ap-tech-item{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.5;}
    .ap-tech-check{color:var(--ap-accent);font-weight:700;flex-shrink:0;}
    .ap-faq-list{display:flex;flex-direction:column;gap:0;border-top:1px solid var(--ap-border);}
    .ap-faq-item{border-bottom:1px solid var(--ap-border);}
    .ap-faq-q{padding:18px 0;font-size:16px;font-weight:600;cursor:pointer;list-style:none;color:var(--ap-ink);display:flex;justify-content:space-between;align-items:center;}
    .ap-faq-q::-webkit-details-marker{display:none;}
    .ap-faq-q::after{content:"▸";font-size:12px;color:var(--ap-accent);transition:transform .2s;}
    details[open] .ap-faq-q::after{transform:rotate(90deg);}
    .ap-faq-a{padding:0 0 18px;font-size:15px;line-height:1.7;color:var(--ap-muted);}
    .ap-cta-title{font-size:clamp(24px,4vw,40px);font-weight:700;margin:0 0 14px;}
    .ap-cta-sub{font-size:17px;opacity:.85;max-width:520px;margin:0 auto 28px;line-height:1.6;}
    .ap-cta-btn{display:inline-block;padding:14px 32px;background:#fff;color:var(--ap-accent);border-radius:6px;font-weight:700;font-size:16px;text-decoration:none;}
    .ap-cta-contact{margin-top:16px;font-size:14px;opacity:.75;}
  </style>
  ${sectionProblem}
  ${sectionStats}
  ${sectionComposition}
  ${sectionBenefits}
  ${sectionProcess}
  ${sectionTech}
  ${sectionFaq}
  ${sectionCta}
</div>`;
  }

  return "";
}

export function renderProposalHtml(blocks: ProposalBlock[], options?: { mobile?: boolean }) {
  const visibleBlocks = blocks.filter((block) => block.visible !== false);
  const body = visibleBlocks.map((b) => renderBlock(b, options)).join("\n");

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="https://konversus.ru/">
  <style>
    :root {
      color-scheme: light;
      --page-bg: #ffffff;
      --paper: #ffffff;
      --paper-2: #f5f3f0;
      --ink: #171d24;
      --block-ink-default: #171d24;
      --muted: rgba(23, 29, 36, 0.64);
      --line: rgba(23, 29, 36, 0.12);
      --accent: #9b6c44;
      --font-ui: Montserrat, Inter, Arial, sans-serif;
      --font-display: Montserrat, Inter, Arial, sans-serif;
    }

    * { box-sizing: border-box; }
    html { background: var(--page-bg); }
    body {
      margin: 0;
      min-height: 100vh;
      background: #ffffff;
      color: var(--ink);
      font-family: var(--font-ui);
    }

    .fpb-document {
      min-height: 100vh;
      padding: 0;
    }

    .fpb-hero {
      position: relative;
      min-height: 720px;
      overflow: hidden;
      background:
        linear-gradient(90deg, rgba(8, 12, 17, var(--hero-overlay, 0.72)) 0%, rgba(8, 12, 17, var(--hero-overlay, 0.72)) 45%, rgba(8, 12, 17, var(--hero-overlay-soft, 0.56)) 100%),
        var(--hero-bg, linear-gradient(135deg, #1a2030, #0d1525));
      background-size: cover;
      background-position: center;
    }

    .fpb-hero.variant-color-photo-right,
    .fpb-hero.variant-color-photo-left {
      background: var(--hero-bg-color, #1a2030);
      color: var(--hero-text-color, var(--ink));
    }

    .fpb-hero.variant-color-photo-right .fpb-hero__inner,
    .fpb-hero.variant-color-photo-left .fpb-hero__inner {
      grid-template-columns: minmax(0, 0.56fr) minmax(260px, 0.44fr);
    }

    .fpb-hero.variant-color-photo-left .fpb-hero__copy {
      order: 2;
    }

    .fpb-hero.variant-color-photo-left .fpb-hero__media {
      order: 1;
    }

    .fpb-hero::after {
      content: "";
      position: absolute;
      inset: 18px;
      border: 1px solid var(--line);
      pointer-events: none;
    }

    .fpb-hero__inner {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(0, 0.64fr) minmax(220px, 0.36fr);
      gap: clamp(24px, 3.8vw, 58px);
      align-items: center;
      min-height: 720px;
      padding: clamp(44px, 6vw, 88px);
    }

    .fpb-hero__copy {
      display: grid;
      gap: 24px;
      min-width: 0;
      max-width: 780px;
    }

    .fpb-hero h1 {
      margin: 0;
      max-width: 12ch;
      font-family: var(--font-display);
      font-size: var(--hero-title-desktop, 56px);
      line-height: 1.02;
      font-weight: 700;
      letter-spacing: 0;
      overflow-wrap: break-word;
      color: var(--hero-text-color, inherit);
    }

    .fpb-hero p {
      margin: 0;
      max-width: 48ch;
      color: color-mix(in srgb, var(--hero-text-color, var(--ink)) 76%, transparent);
      font-size: clamp(18px, 1.5vw, 24px);
      line-height: 1.55;
    }

    .fpb-hero__media {
      margin: 0;
      align-self: stretch;
      min-height: 460px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.08) var(--hero-photo, none) center / cover no-repeat;
      box-shadow: 0 32px 90px rgba(0, 0, 0, 0.38);
      overflow: hidden;
    }

    .fpb-hero.variant-color-photo-right .fpb-hero__media,
    .fpb-hero.variant-color-photo-left .fpb-hero__media {
      border-color: color-mix(in srgb, var(--hero-text-color, var(--ink)) 18%, transparent);
      box-shadow: 0 28px 80px color-mix(in srgb, var(--hero-text-color, #000) 22%, transparent);
    }

    .fpb-hero__photo {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 460px;
      object-fit: cover;
      object-position: center;
    }

    [data-block-id] { outline: 0 solid transparent; }
    [data-block-id].is-selected { outline: 2px solid var(--accent); outline-offset: -2px; }

    .fpb-section {
      padding: clamp(44px, 6vw, 88px);
      background: var(--block-bg, var(--paper));
      color: var(--block-ink, #171d24);
    }

    .fpb-section__head {
      display: grid;
      grid-template-columns: minmax(0, 0.62fr) minmax(240px, 0.38fr);
      gap: clamp(24px, 4vw, 64px);
      align-items: end;
      margin-bottom: 34px;
    }

    .fpb-section h2,
    .fpb-text-photo h2,
    .fpb-contact h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(34px, 4.2vw, 68px);
      line-height: 1.02;
      font-weight: 700;
      letter-spacing: 0;
      color: var(--block-ink, var(--ink));
    }

    .fpb-section p,
    .fpb-text-photo p,
    .fpb-contact p {
      margin: 0;
      color: color-mix(in srgb, var(--block-ink, var(--ink)) 76%, transparent);
      font-size: clamp(17px, 1.4vw, 22px);
      line-height: 1.58;
    }

    .fpb-metrics__grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1px;
      background: color-mix(in srgb, var(--block-ink, var(--ink)) 18%, transparent);
      border: 1px solid color-mix(in srgb, var(--block-ink, var(--ink)) 18%, transparent);
    }

    .fpb-metric {
      display: grid;
      align-content: space-between;
      min-height: 210px;
      padding: clamp(22px, 3vw, 36px);
      background: var(--block-bg, var(--page-bg));
    }

    .fpb-metric strong {
      display: block;
      font-family: var(--font-display);
      font-size: clamp(42px, 7vw, 96px);
      line-height: 0.92;
      color: var(--block-ink, var(--ink));
    }

    .fpb-metric span,
    .fpb-contact__item span {
      display: block;
      color: color-mix(in srgb, var(--block-ink, var(--ink)) 62%, transparent);
      font-size: 13px;
      line-height: 1.45;
    }

    .fpb-text-photo,
    .fpb-contact {
      display: grid;
      grid-template-columns: minmax(0, 0.52fr) minmax(260px, 0.48fr);
      gap: clamp(28px, 5vw, 72px);
      align-items: center;
      min-height: 620px;
    }

    .fpb-text-photo__copy,
    .fpb-contact__copy {
      display: grid;
      gap: 24px;
    }

    .fpb-contact__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
    }

    .fpb-contact__actions a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      border: 1px solid color-mix(in srgb, var(--block-ink, var(--ink)) 24%, transparent);
      background: color-mix(in srgb, var(--block-ink, var(--ink)) 10%, transparent);
      color: var(--block-ink, var(--ink));
      padding: 0 18px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-decoration: none;
    }

    .fpb-text-photo__media {
      margin: 0;
      min-height: 460px;
      background: var(--text-photo, none) center / cover no-repeat;
      border: 1px solid color-mix(in srgb, var(--block-ink, var(--ink)) 18%, transparent);
      overflow: hidden;
    }

    .fpb-text-photo__media img,
    .fpb-contact__photo {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 460px;
      object-fit: cover;
    }

    .fpb-custom-html {
      background: var(--page-bg);
      color: var(--ink);
    }

    .fpb-rich-text-block {
      background: var(--page-bg);
      color: var(--ink);
      padding: clamp(48px, 7vw, 80px) 0;
    }

    .fpb-rich-text-inner {
      max-width: 1140px;
      margin: 0 auto;
      padding: 0 clamp(24px, 5vw, 72px);
    }

    .fpb-eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent);
      margin: 0 0 16px;
    }

    .fpb-rich-text-content h1 { font-size: 2.4em; font-weight: 800; line-height: 1.12; letter-spacing: -0.03em; margin: 0 0 0.5em; color: #e53e3e; text-shadow: 0 0 2px rgba(229, 62, 62, 0.3); }
    .fpb-rich-text-content h2 { font-size: 1.75em; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; margin: 0.8em 0 0.4em; color: #dd6b20; text-shadow: 0 0 2px rgba(221, 107, 32, 0.3); }
    .fpb-rich-text-content h3 { font-size: 1.25em; font-weight: 600; line-height: 1.3; margin: 0.7em 0 0.3em; color: #3182ce; text-shadow: 0 0 2px rgba(49, 130, 206, 0.3); }
    .fpb-rich-text-content p { font-size: 1em; line-height: 1.75; margin: 0 0 1em; color: color-mix(in srgb, var(--block-ink) 80%, transparent); }
    .fpb-rich-text-content p:last-child { margin-bottom: 0; }
    .fpb-rich-text-content strong { color: var(--block-ink); font-weight: 700; }
    .fpb-rich-text-content em { opacity: 0.85; font-style: italic; }
    .fpb-rich-text-content a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
    .fpb-rich-text-content ul, .fpb-rich-text-content ol { padding-left: 1.5em; margin: 0.5em 0 1em; }
    .fpb-rich-text-content li { line-height: 1.65; margin: 0.35em 0; color: color-mix(in srgb, var(--block-ink) 80%, transparent); }
    .fpb-rich-text-content blockquote { border-left: 3px solid var(--accent); margin: 1.5em 0; padding: 0.75em 1.25em; color: color-mix(in srgb, var(--block-ink) 65%, transparent); font-style: italic; }
    .fpb-rich-text-content pre { background: rgba(0,0,0,0.35); border: 1px solid color-mix(in srgb, var(--block-ink) 15%, transparent); border-radius: 4px; padding: 16px 20px; overflow-x: auto; font-family: monospace; font-size: 13px; color: #a5f3fc; margin: 1em 0; }
    .fpb-rich-text-content code { background: rgba(0,0,0,0.25); padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 0.875em; color: #a5f3fc; }
    .fpb-rich-text-content img { max-width: 100%; border-radius: 4px; display: block; margin: 1.5em auto; }
    .fpb-rich-text-content iframe { max-width: 100%; display: block; margin: 1.5em auto; border-radius: 4px; aspect-ratio: 16/9; width: 100%; }
    .fpb-rich-text-content hr { border: none; border-top: 1px solid color-mix(in srgb, var(--block-ink) 18%, transparent); margin: 2em 0; }
    .fpb-rich-text-content ul[data-type="taskList"] { list-style: none; padding-left: 0; margin: 0.5em 0 1em; }
    .fpb-rich-text-content ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.55em; margin: 0.45em 0; }
    .fpb-rich-text-content ul[data-type="taskList"] li input[type="checkbox"] { flex-shrink: 0; margin-top: 4px; width: 15px; height: 15px; accent-color: var(--accent); cursor: default; }
    .fpb-rich-text-content ul[data-type="taskList"] li > div { flex: 1; min-width: 0; }
    .fpb-rich-text-content ul[data-type="taskList"] li[data-checked="true"] > div p { text-decoration: line-through; opacity: 0.5; }
    .fpb-rich-text-content mark { background: rgba(188,132,81,0.25); color: inherit; border-radius: 2px; padding: 1px 3px; }

    /* ── section-heading ── */
    .sh-block { padding: 96px 0; overflow: hidden; }
    .sh-inner { max-width: 1200px; margin: 0 auto; padding: 0 clamp(24px, 5vw, 72px); }
    .sh-block--left  .sh-inner { text-align: left; }
    .sh-block--center .sh-inner { text-align: center; }
    .sh-block--right  .sh-inner { text-align: right; }
    .sh-kicker { font-family: ui-monospace, "Courier New", monospace; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.5; margin-bottom: 22px; display: flex; align-items: center; gap: 14px; }
    .sh-block--left  .sh-kicker::after  { content: ""; display: block; height: 1px; width: 48px; background: currentColor; opacity: 0.4; flex-shrink: 0; }
    .sh-block--right .sh-kicker::before { content: ""; display: block; height: 1px; width: 48px; background: currentColor; opacity: 0.4; flex-shrink: 0; }
    .sh-block--center .sh-kicker { justify-content: center; }
    .sh-block--right  .sh-kicker { justify-content: flex-end; }
    .sh-headline { font-size: var(--sh-title-desktop, 80px); font-weight: 700; line-height: 1.0; letter-spacing: -0.04em; color: inherit; margin: 0 0 24px; word-break: break-word; }
    .sh-sub { font-size: var(--sh-sub-desktop, 20px); line-height: 1.55; opacity: 0.68; margin: 0; max-width: 640px; }
    .sh-block--left  .sh-sub { margin-left: 0; }
    .sh-block--center .sh-sub { margin-left: auto; margin-right: auto; }
    .sh-block--right  .sh-sub { margin-left: auto; }
    .fpb-mode-mobile .sh-block { padding: 64px 0; }
    .fpb-mode-mobile .sh-headline { font-size: var(--sh-title-mobile, 44px); }
    .fpb-mode-mobile .sh-sub { font-size: var(--sh-sub-mobile, 17px); max-width: none; }

    .fpb-custom-empty {
      background: rgba(255,255,255,0.04);
      color: var(--muted);
    }

    .fpb-contact__side {
      display: grid;
      gap: 16px;
    }

    .fpb-contact__photo {
      border: 1px solid color-mix(in srgb, var(--block-ink, var(--ink)) 18%, transparent);
    }

    .fpb-contact__list {
      display: grid;
      border: 1px solid color-mix(in srgb, var(--block-ink, var(--ink)) 16%, transparent);
    }

    .fpb-contact__item {
      display: grid;
      gap: 5px;
      padding: 16px;
      border-bottom: 1px solid color-mix(in srgb, var(--block-ink, var(--ink)) 12%, transparent);
    }

    .fpb-contact__item:last-child {
      border-bottom: 0;
    }

    .fpb-contact__item strong,
    .fpb-contact__item a {
      font-size: 17px;
      line-height: 1.35;
      color: var(--block-ink, var(--ink));
      text-decoration: none;
    }

    .fpb-contact__value-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .fpb-contact__meta {
      font-size: 12px;
      line-height: 1.4;
      color: color-mix(in srgb, var(--block-ink, var(--ink)) 45%, transparent);
    }

    .fpb-full-photo {
      position: relative;
      background: #090d11;
      color: #f7f2ea;
    }

    .fpb-full-photo__image {
      position: relative;
      overflow: hidden;
      line-height: 0;
    }

    .fpb-full-photo__image img {
      display: block;
      width: 100%;
      height: auto;
      max-height: 90vh;
      object-fit: cover;
    }

    .fpb-full-photo__caption {
      padding: clamp(14px, 2vw, 24px) clamp(20px, 5vw, 64px);
      font-size: var(--gs-cap-desktop, 16px);
      line-height: 1.5;
    }

    .fpb-full-video__play {
      position: absolute;
      left: 50%;
      top: 50%;
      z-index: 2;
      transform: translate(-50%, -50%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 54px;
      padding: 0 22px;
      border: 1px solid rgba(255,255,255,0.36);
      background: rgba(8,12,17,0.58);
      color: #f7f2ea;
      text-decoration: none;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      backdrop-filter: blur(8px);
    }

    .fpb-photo-gallery {
      background: #f3efe7;
      color: #15191f;
    }

    .fpb-photo-gallery__rail {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .fpb-photo-gallery__item:first-child {
      grid-column: span 2;
      grid-template-rows: minmax(320px, 22vw) auto;
    }

    .fpb-photo-gallery__item {
      display: grid;
      grid-template-rows: minmax(240px, 20vw) auto;
      background: #e5ded3;
      overflow: hidden;
    }

    .fpb-photo-gallery__item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .fpb-photo-gallery__item div {
      display: grid;
      gap: 6px;
      padding: 14px;
    }

    .fpb-photo-gallery__item span {
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(21,25,31,0.54);
    }

    .fpb-photo-gallery__item p {
      margin: 0;
      color: rgba(21,25,31,0.72);
      font-size: 14px;
      line-height: 1.4;
    }

    .fpb-mode-mobile .fpb-hero { min-height: auto; }
    .fpb-mode-mobile .fpb-hero::after { inset: 10px; }
    .fpb-mode-mobile .fpb-hero__inner {
      grid-template-columns: 1fr;
      gap: 22px;
      min-height: auto;
      padding: 28px;
    }
    .fpb-mode-mobile .fpb-hero.variant-color-photo-right .fpb-hero__inner,
    .fpb-mode-mobile .fpb-hero.variant-color-photo-left .fpb-hero__inner {
      grid-template-columns: 1fr;
    }
    .fpb-mode-mobile .fpb-hero.variant-color-photo-left .fpb-hero__copy { order: 2; }
    .fpb-mode-mobile .fpb-hero.variant-color-photo-left .fpb-hero__media { order: 1; }
    .fpb-mode-mobile .fpb-hero h1 {
      max-width: none;
      line-height: 1.02;
    }
    .fpb-mode-mobile .fpb-hero p {
      max-width: none;
      font-size: 16px;
      line-height: 1.55;
    }
    .fpb-mode-mobile .fpb-hero__media,
    .fpb-mode-mobile .fpb-hero__photo {
      min-height: 260px;
    }
    .fpb-mode-mobile .fpb-section {
      padding: 28px;
    }
    .fpb-mode-mobile .fpb-section__head,
    .fpb-mode-mobile .fpb-text-photo,
    .fpb-mode-mobile .fpb-contact {
      grid-template-columns: 1fr;
      min-height: auto;
    }
    .fpb-mode-mobile .fpb-section h2,
    .fpb-mode-mobile .fpb-text-photo h2,
    .fpb-mode-mobile .fpb-contact h2 {
      font-size: clamp(30px, 9vw, 42px);
    }
    .fpb-mode-mobile .fpb-metrics__grid {
      grid-template-columns: 1fr;
    }
    .fpb-mode-mobile .fpb-metric {
      min-height: 150px;
    }
    .fpb-mode-mobile .fpb-text-photo__media,
    .fpb-mode-mobile .fpb-text-photo__media img,
    .fpb-mode-mobile .fpb-contact__photo {
      min-height: 260px;
    }
    .fpb-mode-mobile .fpb-full-photo__caption {
      font-size: var(--gs-cap-mobile, 14px);
    }
    .fpb-mode-mobile .fpb-photo-gallery__rail {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding-bottom: 6px;
    }
    .fpb-mode-mobile .fpb-photo-gallery__item {
      flex: 0 0 82%;
      grid-template-rows: 260px auto;
      scroll-snap-align: start;
    }
  </style>
</head>
<body class="${options?.mobile ? 'fpb-mode-mobile' : 'fpb-mode-desktop'}">
  <main class="fpb-document">
    ${body || ""}
  </main>
  <script>
    function notifyHeight() {
      window.parent.postMessage({ type: 'fpb:height', height: document.documentElement.scrollHeight }, '*');
    }

    document.addEventListener('click', function(event) {
      var block = event.target.closest('[data-block-id]');
      if (!block) return;
      document.querySelectorAll('[data-block-id]').forEach(function(node) { node.classList.remove('is-selected'); });
      block.classList.add('is-selected');
      window.parent.postMessage({ type: 'fpb:select-block', blockId: block.getAttribute('data-block-id') }, '*');
    });

    window.addEventListener('load', notifyHeight);
    window.addEventListener('resize', notifyHeight);
    document.querySelectorAll('img').forEach(function(image) { image.addEventListener('load', notifyHeight); });
    setTimeout(notifyHeight, 120);
  </script>
</body>
</html>`;
}