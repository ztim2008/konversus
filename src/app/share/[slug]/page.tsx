import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import type { Metadata } from "next";

import { getCompany } from "@/lib/data/companies";
import { getProposal } from "@/lib/data/proposals";
import { getShareLinkBySlugOrToken, incrementShareLinkView } from "@/lib/data/share-links";
import { normalizeProposalBlocks } from "@/lib/proposal-builder";
import { renderBlock } from "@/components/share/block-renderers";
import { getCurrentAdmin } from "@/lib/auth/session";
import { FeedbackForm } from "./feedback-form";
import { FeedbackFab } from "@/components/share/feedback-fab";

type SharePageProps = {
  params: Promise<{ slug: string }>;
};

function findPreviewImage(blocks: ReturnType<typeof normalizeProposalBlocks>) {
  for (const block of blocks) {
    const payload = block.payload as {
      photoUrl?: string;
      videoPoster?: string;
      photos?: Array<{ url?: string }>;
    };

    if (payload.photoUrl) return payload.photoUrl;
    if (payload.videoPoster) return payload.videoPoster;
    if (Array.isArray(payload.photos)) {
      const firstPhoto = payload.photos.find((photo) => photo?.url);
      if (firstPhoto?.url) return firstPhoto.url;
    }
  }

  return undefined;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { slug } = await params;
  const shareLink = await getShareLinkBySlugOrToken(slug);

  if (!shareLink || shareLink.status === "revoked" || shareLink.status === "expired") {
    return {
      title: "Концепт недоступен",
      description: "Ссылка недоступна или срок действия истек.",
    };
  }

  const proposal = await getProposal(shareLink.proposalId);
  const company = proposal ? await getCompany(proposal.companyId) : null;

  if (!proposal || !company) {
    return {
      title: "Концепт недоступен",
      description: "Страница концепта не найдена.",
    };
  }

  const blocks = normalizeProposalBlocks(proposal.structure).filter((block) => block.visible);
  const image = findPreviewImage(blocks);
  const title = `${company.name} — цифровой концепт`;
  const description = proposal.subheadline || proposal.headline || "Клиентская страница концепта для просмотра и пересылки.";
  const canonicalUrl = `/share/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalUrl,
      images: image ? [{ url: image }] : undefined,
      locale: "ru_RU",
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { slug } = await params;
  const shareLink = await getShareLinkBySlugOrToken(slug);

  if (!shareLink || shareLink.status === "revoked" || shareLink.status === "expired") {
    notFound();
  }

  const proposal = await getProposal(shareLink.proposalId);
  if (!proposal) notFound();

  await Promise.all([
    getCompany(proposal.companyId),
    (async () => {
      // Не считаем просмотр если открывает сам администратор
      const admin = await getCurrentAdmin();
      if (admin) return;

      const headersList = await headers();
      const rawIp =
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headersList.get("x-real-ip") ??
        "unknown";
      const ipHash = createHash("sha256").update(rawIp).digest("hex");
      const userAgent = headersList.get("user-agent") ?? "";
      await incrementShareLinkView(shareLink.id, ipHash, userAgent);
    })(),
  ]);

  const company = await getCompany(proposal.companyId);
  if (!company) notFound();

  const allBlocks = normalizeProposalBlocks(proposal.structure).filter((b) => b.visible);

  // Блоки рендерятся в том порядке, в котором они сохранены (как в редакторе)
  const heroBlock = allBlocks.find((b) => b.type === "hero");
  const contentBlocks = allBlocks;

  const companyInitials = company.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="fpb-page">

      {/* ── INTRO OVERLAY ── */}
      <div className="fpb-intro" id="fpb-intro" aria-hidden="true">
        <div className="fpb-intro__mark">{companyInitials || "КВ"}</div>
        <div className="fpb-intro__kicker">Персональный концепт</div>
        <div className="fpb-intro__company">{company.name}</div>
        {proposal.title && (
          <div className="fpb-intro__title">{proposal.title}</div>
        )}
        <div className="fpb-intro__bar-wrap">
          <div className="fpb-intro__bar" />
        </div>
      </div>

      <div className="fpb-wrap">
        {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">{companyInitials || "КВ"}</div>
          <div className="brand-copy">
            <div className="brand-kicker">Цифровой концепт</div>
            <div className="brand-title">{company.name}</div>
          </div>
        </div>
        <div className="toolbar screen-only" style={{ display: "none" }}>
          <div className="theme-label">Палитра</div>
        </div> {/* конец .toolbar hidden */}
        <nav className="nav screen-only">
          {heroBlock && <a className="nav-link" href="#cover">Обложка</a>}
          {contentBlocks.length > 0 && <a className="nav-link" href="#content">Концепт</a>}
          {allBlocks.some((b) => b.type === "cta") && <a className="nav-link" href="#cta">Контакт</a>}
          <a className="nav-link" href="#feedback">Отзыв</a>
          <a className="topbar-pdf-btn" href={`/share/${slug}/pdf`} target="_blank" rel="noreferrer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            PDF
          </a>
        </nav>
        <a className="studio-badge screen-only" href="https://konversus.ru" target="_blank" rel="noopener noreferrer">
          Студия КОНВЕРСУС
        </a>
      </header>

      {/* ── ALL BLOCKS (в порядке сохранения) ── */}
      {contentBlocks.length > 0 && (
        <main className="site-content" id="content">
          {contentBlocks.map(renderBlock)}
        </main>
      )}

      <div className="mobile-sharebar screen-only" role="region" aria-label="Действия со страницей">
        <button className="button" type="button" data-mobile-share>
          Поделиться
        </button>
      </div>

      {/* ── FEEDBACK FORM ── */}
      <div id="feedback">
        <FeedbackForm slug={slug} />
      </div>

      <FeedbackFab />

      {/* ── FOOTER ── */}
      <footer className="fpb-page-footer">
        <div className="fpb-page-footer__inner">
          <a className="fpb-page-footer__logo" href="https://konversus.ru" target="_blank" rel="noopener noreferrer">
            <span className="fpb-page-footer__mark">КВ</span>
            <span className="fpb-page-footer__name">Студия КОНВЕРСУС</span>
          </a>
          <p className="fpb-page-footer__tagline">Цифровая упаковка для производственных компаний</p>
          <a className="fpb-page-footer__link" href="https://konversus.ru" target="_blank" rel="noopener noreferrer">
            konversus.ru
          </a>
        </div>
      </footer>

      </div>

      {/* ── EXIT-INTENT MODAL ── */}
      <div className="fpb-exit-backdrop" id="fpb-exit-backdrop" aria-hidden="true" />
      <div className="fpb-exit-modal" id="fpb-exit-modal" role="dialog" aria-modal="true" aria-label="Давайте поговорим">
        <div className="fpb-exit-card">
          <button className="fpb-exit-close" id="fpb-exit-close" aria-label="Закрыть" type="button">&times;</button>

          <div className="fpb-exit-author">
            <img
              className="fpb-exit-photo"
              src="https://konversus.ru/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg"
              alt="Тимофеев Алексей"
              width={52}
              height={52}
            />
            <div>
              <div className="fpb-exit-author-name">Тимофеев Алексей</div>
              <div className="fpb-exit-author-role">Цифровая упаковка для бизнеса</div>
            </div>
          </div>

          <div className="fpb-exit-headline">Подождите — это важно</div>
          <div className="fpb-exit-rule" />
          <div className="fpb-exit-body">
            <p>Этот концепт собран специально под вашу компанию. <strong>Правильная цифровая подача работает как молчаливый продавец</strong> — клиент видит ценность до первого звонка.</p>
            <p style={{marginTop:'10px'}}>Один удачный концепт может окупить всё вложение с первой же закрытой сделки. Давайте обсудим — без давления, просто поговорим о вашем проекте.</p>
          </div>

          <div className="fpb-exit-contacts">
            <a className="fpb-exit-contact fpb-exit-contact--primary" href="tel:+79212013252">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.1 6.1l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              +7 921 201 32 52
            </a>
            <a className="fpb-exit-contact" href="https://t.me/bilarius" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
              Telegram
            </a>
            <a className="fpb-exit-contact fpb-exit-contact--vk" href="https://max.ru/join/EmVxaadn5GxQNTErVmbyRKcQAZDNHjEhxcPQqSTR9wA" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm-1-11h2v6h-2zm0-3h2v2h-2z"/></svg>
              Max (ВКонтакте)
            </a>
          </div>
        </div>
      </div>

      {/* ── JS: тема, до/после ── */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
// ── Тема и кнопки ──
(function() {
  var page = document.querySelector('.fpb-page');
  var buttons = Array.from(document.querySelectorAll('.theme-button'));
  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (page) page.dataset.theme = btn.dataset.theme;
      buttons.forEach(function(b) { b.classList.toggle('is-active', b === btn); });
    });
  });
})();

// ── Exit-intent modal ──
(function() {
  var STORAGE_KEY = 'fpb_exit_shown';
  if (sessionStorage.getItem(STORAGE_KEY)) return;

  var modal    = document.getElementById('fpb-exit-modal');
  var backdrop = document.getElementById('fpb-exit-backdrop');
  var closeBtn = document.getElementById('fpb-exit-close');
  if (!modal || !backdrop) return;

  var triggered = false;

  function show() {
    if (triggered) return;
    triggered = true;
    sessionStorage.setItem(STORAGE_KEY, '1');
    modal.classList.add('is-visible');
    backdrop.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  function hide() {
    modal.classList.remove('is-visible');
    backdrop.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  // Добавляем слушатели после того как intro-оверлей ушёл
  setTimeout(function() {
    var isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isMobile) {
      // Mobile: пользователь переключился на другое приложение
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) show();
      });
      // Или просто через 30 сек
      setTimeout(show, 30000);
    } else {
      // Desktop: курсор уходит к адресной строке
      document.addEventListener('mouseleave', function(e) {
        if (e.clientY <= 0) show();
      });
    }
  }, 2800);

  // Закрытие
  backdrop.addEventListener('click', hide);
  if (closeBtn) closeBtn.addEventListener('click', hide);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') hide();
  });
})();

// ── Before/After + Share ──
(function() {
  document.querySelectorAll('[data-before-after]').forEach(function(shell) {
    var range = shell.querySelector('.before-after-range');
    function setRatio(v) { shell.style.setProperty('--before-ratio', v + '%'); }
    if (range) {
      range.addEventListener('input', function() { setRatio(range.value); });
      setRatio(range.value || 52);
    }
  });

  var shareBtn = document.querySelector('[data-mobile-share]');
  var copyBtn = document.querySelector('[data-mobile-copy]');
  var currentUrl = window.location.href;

  function copyUrl() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(currentUrl);
    }
    var textarea = document.createElement('textarea');
    textarea.value = currentUrl;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', function() {
      if (navigator.share) {
        navigator.share({
          title: document.title,
          text: 'Посмотри концепт',
          url: currentUrl
        }).catch(function() {});
      } else {
        copyUrl();
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      copyUrl();
    });
  }
})();

// ── Intro overlay ──
(function() {
  var intro = document.getElementById('fpb-intro');
  if (!intro) return;

  var hero = document.querySelector('.hero');
  var INTRO_HOLD = 1750;    // сколько держим оверлей (мс)
  var LEAVE_DUR  = 620;     // длительность анимации подъёма (мс)

  // Блокируем скролл пока оверлей виден
  document.body.style.overflow = 'hidden';

  setTimeout(function() {
    intro.classList.add('is-leaving');

    // Hero появляется синхронно с подъёмом занавеса
    if (hero) {
      hero.style.opacity = '0';
      hero.classList.add('fpb-hero-enter');
      hero.style.opacity = '';
    }

    // Восстанавливаем скролл, убираем элемент
    setTimeout(function() {
      document.body.style.overflow = '';
      intro.style.display = 'none';
    }, LEAVE_DUR);
  }, INTRO_HOLD);
})();

// ── Scroll reveal для блоков контента ──
(function() {
  var items = document.querySelectorAll('.site-content > *');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    // Fallback: показываем всё сразу
    items.forEach(function(el) { el.style.opacity = '1'; });
    return;
  }

  items.forEach(function(el) {
    el.classList.add('reveal-pending');
  });

  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var el = entry.target;
        el.classList.remove('reveal-pending');
        el.classList.add('reveal-done');
        io.unobserve(el);
      }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -32px 0px' });

  items.forEach(function(el) { io.observe(el); });
})();
          `,
        }}
      />
    </div>
  );
}
