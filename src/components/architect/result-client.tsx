"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { ArchitectReport, ProjectStatus } from "@/lib/architect/types";
import { ProgressSteps } from "./progress-steps";

// Ленивая загрузка Chart.js — не блокирует первый рендер
const LeaksDonutChart = dynamic(
  () => import("./charts").then((m) => m.LeaksDonutChart),
  { ssr: false, loading: () => null }
);
const RoadmapBarChart = dynamic(
  () => import("./charts").then((m) => m.RoadmapBarChart),
  { ssr: false, loading: () => null }
);

interface ContactsFound {
  phones: string[];
  emails: string[];
  socials: Array<{ platform: string; url: string; handle?: string }>;
  address?: string;
}

interface AvitoApiData {
  is_own_profile: boolean;
  user_id?: number;
  user_name?: string;
  phones?: string[];
  profile_url?: string;
  rating_score?: number;
  reviews_count?: number;
  active_items_count?: number;
  top_reviews?: Array<{ score?: number; text?: string; author?: string }>;
}

interface SeoCheckItem {
  key: string;
  label: string;
  status: "ok" | "warn" | "fail";
  value?: string;
  points: number;
  max_points: number;
}

interface SeoMetricsData {
  score: number;
  checks: SeoCheckItem[];
}

interface TechAnalytics {
  yandex_metrika: boolean;
  google_analytics: boolean;
  google_tag_manager: boolean;
}

interface TechChatWidgets {
  jivo: boolean;
  calltouch: boolean;
  bitrix_chat: boolean;
  carrot_quest: boolean;
  talk_me: boolean;
}

interface TechMetricsData {
  response_time_ms: number | null;
  page_size_kb: number | null;
  has_sitemap: boolean | null;
  has_robots_txt: boolean | null;
  has_viewport_meta: boolean;
  has_responsive_css: boolean;
  analytics: TechAnalytics;
  chat_widgets: TechChatWidgets;
  server_header: string | null;
}

// ── RU Blocking Audit ─────────────────────────────────────────────────────

interface RuDependencyData {
  domain: string;
  service: string;
  category: string;
  risk: "blocked" | "unstable" | "ok";
  risk_label: string;
  recommendation: string;
}

interface RuBlockingData {
  total_external: number;
  blocked_count: number;
  unstable_count: number;
  ok_count: number;
  unknown_count: number;
  score: number;
  dependencies: RuDependencyData[];
}

// ── Speed Audit ───────────────────────────────────────────────────────────

interface SpeedAuditData {
  ttfb_ms: number | null;
  ttfb_rating: "excellent" | "good" | "slow" | "critical";
  ttfb_label: string;
  ps_score?: number;
  ps_fcp_ms?: number;
  ps_lcp_ms?: number;
  ps_tbt_ms?: number;
  ps_cls?: number;
  ps_tti_ms?: number;
}

interface VisualAnalysisData {
  screenshot_taken: boolean;
  screenshot_path?: string;
  design_score: number;
  trust_score: number;
  clarity_score: number;
  overall_impression: string;
  design_strengths: string[];
  design_issues: string[];
  above_fold_assessment: string;
  cta_visibility: "visible" | "weak" | "missing";
  mobile_readiness: "good" | "medium" | "poor";
}

interface SnapshotMeta {
  title?: string | null;
  cms?: string | null;
  h1?: string | null;
  word_count?: number | null;
  image_count?: number | null;
  has_schema_org?: boolean;
  phones_count?: number;
  emails_count?: number;
  socials_count?: number;
  contacts_found?: ContactsFound | null;
  avito_api?: AvitoApiData | null;
  seo_metrics?: SeoMetricsData | null;
  tech_metrics?: TechMetricsData | null;
  visual_analysis?: VisualAnalysisData | null;
  ru_blocking?: RuBlockingData | null;
  speed_audit?: SpeedAuditData | null;
}

interface PollData {
  id: string;
  url: string;
  source_type: string;
  status: ProjectStatus;
  result: ArchitectReport | null;
  error: string | null;
  snapshot_meta: SnapshotMeta | null;
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending: "Подготовка...",
  collecting: "Собираем данные о бизнесе...",
  analyzing: "AI анализирует бизнес...",
  done: "",
  failed: "",
};

const IMPACT_COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#6b7280",
};

const PRIORITY_LABELS = {
  must: "Обязательно",
  should: "Рекомендуется",
  nice: "Желательно",
};

const COMPLEXITY_LABELS = {
  easy: "Просто",
  medium: "Средне",
  hard: "Сложно",
};

const SOCIAL_ICONS: Record<string, string> = {
  VKontakte: "🅰",
  Telegram: "✈",
  Instagram: "📷",
  YouTube: "▶",
  WhatsApp: "💬",
  "OK.ru": "🆗",
  TikTok: "🎵",
  Dzen: "Д",
};

// ── Count-up hook ─────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1800, trigger: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger) return;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, trigger]);

  return value;
}

// ── Intersection reveal ───────────────────────────────────────────────────

function useRevealOnScroll(ref: React.RefObject<Element | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

// ── Main component ────────────────────────────────────────────────────────

export default function ArchitectResultClient({
  id,
  initialStatus,
  initialResult,
  initialSnapshotMeta = null,
  url,
}: {
  id: string;
  initialStatus: ProjectStatus;
  initialResult: ArchitectReport | null;
  initialSnapshotMeta?: SnapshotMeta | null;
  url: string;
}) {
  const [status, setStatus] = useState<ProjectStatus>(initialStatus);
  const [result, setResult] = useState<ArchitectReport | null>(initialResult);
  const [error, setError] = useState<string | null>(null);
  const [snapshotMeta, setSnapshotMeta] = useState<SnapshotMeta | null>(initialSnapshotMeta);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Count-up trigger: срабатывает как только появился результат (не IntersectionObserver —
  // он не успевает когда компонент переходит из loading→done)
  const heroRef = useRef<HTMLElement | null>(null);
  const heroVisible = status === "done" && result !== null;
  const growthNum = useCountUp(result?.growth_potential_pct ?? 0, 1800, heroVisible);

  useEffect(() => {
    if (status === "done" || status === "failed") return;

    timerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/architect/${id}`);
        const data = (await res.json()) as PollData;
        setStatus(data.status);
        if (data.result) setResult(data.result);
        if (data.error) setError(data.error);
        if (data.snapshot_meta) setSnapshotMeta(data.snapshot_meta);
        if (data.status === "done" || data.status === "failed") {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch {
        // network error — продолжаем polling
      }
    }, 3000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id, status]);

  if (status === "failed") {
    return (
      <div className="arc-result-error">
        <div className="arc-result-error-icon">⚠️</div>
        <h2>Анализ не удался</h2>
        <p>{error ?? "Сайт недоступен или заблокировал запрос."}</p>
        <Link href="/architect" className="arc-cta-btn">
          Попробовать снова
        </Link>
      </div>
    );
  }

  if (status !== "done" || !result) {
    return (
      <div className="arc-loading">
        <div className="arc-loading-orb" />
        <div className="arc-loading-label">{STATUS_LABELS[status]}</div>
        <div className="arc-loading-url">{url}</div>
        <ProgressSteps status={status} snapshotMeta={snapshotMeta} />
        <div className="arc-loading-hint">
          Анализ занимает 15–40 секунд. Страница обновится автоматически.
        </div>
      </div>
    );
  }

  const contacts = snapshotMeta?.contacts_found;
  const hasContacts =
    contacts &&
    (contacts.phones.length > 0 ||
      contacts.emails.length > 0 ||
      contacts.socials.length > 0 ||
      contacts.address);

  return (
    <div className="arc-result">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="arc-result-hero arc-reveal" ref={heroRef}>
        <div className="arc-result-url">{url}</div>
        <a href={`/api/architect/${id}/pdf`} className="arc-pdf-btn" title="Скачать PDF-отчёт">
          ↓ PDF
        </a>
        <div className="arc-result-growth">
          <span className="arc-growth-num">+{growthNum}%</span>
          <span className="arc-growth-label">потенциал роста</span>
        </div>
        <h1 className="arc-result-niche">{result.niche}</h1>
        <p className="arc-result-verdict">{result.verdict}</p>
      </section>

      {/* ── TOP-3 Priority Actions ────────────────────────────────── */}
      {result.top_actions && result.top_actions.length > 0 && (
        <section className="arc-top-actions-section arc-reveal" style={{ animationDelay: "0.02s" }}>
          <div className="arc-top-actions-header">
            <span className="arc-top-actions-badge">★ ТОП-3</span>
            <h2 className="arc-top-actions-title">Приоритетные действия</h2>
            <p className="arc-top-actions-sub">Сделайте это в первую очередь — максимальный ROI</p>
          </div>
          <div className="arc-top-actions-list">
            {result.top_actions.slice(0, 3).map((action, i) => (
              <div
                key={i}
                className="arc-top-action-card"
                style={{ animationDelay: `${0.04 + i * 0.12}s` }}
              >
                <div className="arc-top-action-rank">#{i + 1}</div>
                <div className="arc-top-action-body">
                  <div className="arc-top-action-meta">
                    <span className="arc-top-action-cat">{action.category}</span>
                  </div>
                  <div className="arc-top-action-name">{action.title}</div>
                  <div className="arc-top-action-reason">{action.reason}</div>
                </div>
                <div className="arc-top-action-arrow">→</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 01 Positioning Map ────────────────────────────────────── */}
      <section className="arc-section arc-reveal" style={{ animationDelay: "0.05s" }}>
        <div className="arc-section-num">01</div>
        <h2 className="arc-section-title">Позиционирование</h2>
        <div className="arc-positioning-grid">
          <div className="arc-pos-card arc-pos-current">
            <div className="arc-pos-label">Сейчас</div>
            <p>{result.positioning_map.current_image}</p>
          </div>
          <div className="arc-pos-arrow">→</div>
          <div className="arc-pos-card arc-pos-potential">
            <div className="arc-pos-label">Потенциал</div>
            <p>{result.positioning_map.potential_image}</p>
          </div>
        </div>
        <div className="arc-gaps">
          <div className="arc-gaps-title">Разрывы позиционирования</div>
          <ul className="arc-gaps-list">
            {result.positioning_map.positioning_gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
        <div className="arc-keywords">
          {result.positioning_map.brand_keywords.map((k) => (
            <span key={k} className="arc-keyword">{k}</span>
          ))}
        </div>
      </section>

      {/* ── 02 Revenue Leaks ──────────────────────────────────────── */}
      <section className="arc-section arc-reveal" style={{ animationDelay: "0.10s" }}>
        <div className="arc-section-num">02</div>
        <h2 className="arc-section-title">Потери дохода</h2>
        <div className="arc-section-with-chart">
          <div className="arc-leaks-grid">
            {result.revenue_leaks.map((leak, i) => (
              <div key={i} className={`arc-leak-card arc-leak-${leak.status}`}>
                <div className="arc-leak-header">
                  <span className="arc-leak-channel">{leak.channel}</span>
                  <span className={`arc-leak-status arc-leak-status-${leak.status}`}>
                    {leak.status === "missing"
                      ? "Отсутствует"
                      : leak.status === "weak"
                      ? "Слабо"
                      : "Работает"}
                  </span>
                </div>
                <div className="arc-leak-loss">{leak.estimated_loss}</div>
                <p className="arc-leak-desc">{leak.description}</p>
              </div>
            ))}
          </div>
          <div className="arc-chart-side">
            <LeaksDonutChart leaks={result.revenue_leaks} />
          </div>
        </div>
      </section>

      {/* ── 03 Growth Opportunities ───────────────────────────────── */}
      <section className="arc-section arc-reveal" style={{ animationDelay: "0.15s" }}>
        <div className="arc-section-num">03</div>
        <h2 className="arc-section-title">Возможности роста</h2>
        <div className="arc-opps-grid">
          {result.growth_opportunities.map((opp, i) => (
            <div key={i} className="arc-opp-card">
              <div className="arc-opp-header">
                <span className="arc-opp-type">{opp.type}</span>
                <span
                  className="arc-opp-impact"
                  style={{ color: IMPACT_COLORS[opp.impact] }}
                >
                  {opp.impact === "high"
                    ? "Высокий эффект"
                    : opp.impact === "medium"
                    ? "Средний эффект"
                    : "Базовый эффект"}
                </span>
              </div>
              <div className="arc-opp-title">{opp.title}</div>
              <p className="arc-opp-desc">{opp.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 04 Roadmap ────────────────────────────────────────────── */}
      <section className="arc-section arc-reveal" style={{ animationDelay: "0.20s" }}>
        <div className="arc-section-num">04</div>
        <h2 className="arc-section-title">Roadmap роста</h2>
        <div className="arc-roadmap">
          {result.roadmap.map((item, i) => (
            <div key={i} className="arc-roadmap-row" style={{ animationDelay: `${0.22 + i * 0.06}s` }}>
              <div className="arc-roadmap-index">{String(i + 1).padStart(2, "0")}</div>
              <div className="arc-roadmap-task">
                <div className="arc-roadmap-task-name">{item.task}</div>
                <div className="arc-roadmap-meta">
                  <span className="arc-roadmap-cat">{item.category}</span>
                  <span className="arc-roadmap-complexity">
                    {COMPLEXITY_LABELS[item.complexity]}
                  </span>
                  <span className="arc-roadmap-timeline">{item.timeline}</span>
                </div>
              </div>
              <div className="arc-roadmap-impact">
                +{item.revenue_impact_pct}%
              </div>
            </div>
          ))}
        </div>
        <div className="arc-roadmap-chart-wrap">
          <RoadmapBarChart roadmap={result.roadmap} />
        </div>
      </section>

      {/* ── 05 Digital Assets ─────────────────────────────────────── */}
      <section className="arc-section arc-reveal" style={{ animationDelay: "0.25s" }}>
        <div className="arc-section-num">05</div>
        <h2 className="arc-section-title">Digital-активы</h2>
        <div className="arc-assets-grid">
          {result.digital_assets.map((asset, i) => (
            <div key={i} className={`arc-asset-card arc-asset-${asset.priority}`}>
              <div className="arc-asset-priority">
                {PRIORITY_LABELS[asset.priority]}
              </div>
              <div className="arc-asset-name">{asset.asset}</div>
              <p className="arc-asset-purpose">{asset.purpose}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 06 Contacts & Digital Footprint ───────────────────────── */}
      {hasContacts && (
        <section className="arc-section arc-section-contacts arc-reveal" style={{ animationDelay: "0.30s" }}>
          <div className="arc-section-num">06</div>
          <h2 className="arc-section-title">Цифровой след бизнеса</h2>
          <p className="arc-contacts-subtitle">Найдено в открытых источниках на момент анализа</p>
          <div className="arc-contacts-grid">
            {contacts!.phones.length > 0 && (
              <div className="arc-contacts-block">
                <div className="arc-contacts-block-title">📞 Телефоны</div>
                <ul className="arc-contacts-list">
                  {contacts!.phones.map((p, i) => (
                    <li key={i}>
                      <a href={`tel:${p}`}>{p}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {contacts!.emails.length > 0 && (
              <div className="arc-contacts-block">
                <div className="arc-contacts-block-title">✉️ Email</div>
                <ul className="arc-contacts-list">
                  {contacts!.emails.map((e, i) => (
                    <li key={i}>
                      <a href={`mailto:${e}`}>{e}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {contacts!.address && (
              <div className="arc-contacts-block">
                <div className="arc-contacts-block-title">📍 Адрес</div>
                <p className="arc-contacts-address">{contacts!.address}</p>
              </div>
            )}
            {contacts!.socials.length > 0 && (
              <div className="arc-contacts-block arc-contacts-block-wide">
                <div className="arc-contacts-block-title">🌐 Соцсети и мессенджеры</div>
                <div className="arc-socials-list">
                  {contacts!.socials.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="arc-social-chip"
                    >
                      <span className="arc-social-icon">
                        {SOCIAL_ICONS[s.platform] ?? "🔗"}
                      </span>
                      <span className="arc-social-platform">{s.platform}</span>
                      {s.handle && (
                        <span className="arc-social-handle">{s.handle}</span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Avito API (собственный профиль) ───────────────────────── */}
      {snapshotMeta?.avito_api?.is_own_profile && (
        <section className="arc-section arc-section-avito arc-reveal" style={{ animationDelay: "0.32s" }}>
          <div className="arc-section-num arc-section-num-avito">АП</div>
          <h2 className="arc-section-title">Данные из Авито API</h2>
          <p className="arc-contacts-subtitle">Официальный API — точные данные вашего профиля</p>
          <div className="arc-avito-api-grid">
            {/* Профиль */}
            <div className="arc-avito-profile-card">
              <div className="arc-avito-profile-name">
                {snapshotMeta.avito_api.user_name ?? "Авито профиль"}
              </div>
              {snapshotMeta.avito_api.phones && snapshotMeta.avito_api.phones.length > 0 && (
                <div className="arc-avito-phones">
                  {snapshotMeta.avito_api.phones.map((p, i) => (
                    <a key={i} href={`tel:${p}`} className="arc-avito-phone">{p}</a>
                  ))}
                </div>
              )}
            </div>

            {/* Рейтинг */}
            {snapshotMeta.avito_api.rating_score !== undefined && (
              <div className="arc-avito-stat-card">
                <div className="arc-avito-stat-value">
                  ⭐ {snapshotMeta.avito_api.rating_score.toFixed(1)}
                </div>
                <div className="arc-avito-stat-label">
                  Рейтинг Авито
                  {snapshotMeta.avito_api.reviews_count !== undefined && (
                    <span> · {snapshotMeta.avito_api.reviews_count} отзывов</span>
                  )}
                </div>
              </div>
            )}

            {/* Объявления */}
            {snapshotMeta.avito_api.active_items_count !== undefined && (
              <div className="arc-avito-stat-card">
                <div className="arc-avito-stat-value">
                  {snapshotMeta.avito_api.active_items_count}
                </div>
                <div className="arc-avito-stat-label">Активных объявлений</div>
              </div>
            )}
          </div>

          {/* Отзывы */}
          {snapshotMeta.avito_api.top_reviews && snapshotMeta.avito_api.top_reviews.length > 0 && (
            <div className="arc-avito-reviews">
              <div className="arc-contacts-block-title">Последние отзывы</div>
              <div className="arc-avito-reviews-list">
                {snapshotMeta.avito_api.top_reviews.map((r, i) => (
                  <div key={i} className="arc-avito-review-item">
                    <div className="arc-avito-review-meta">
                      {r.author && <span className="arc-avito-review-author">{r.author}</span>}
                      {r.score !== undefined && (
                        <span className="arc-avito-review-score">
                          {"★".repeat(Math.round(r.score))}{"☆".repeat(5 - Math.round(r.score))}
                        </span>
                      )}
                    </div>
                    {r.text && <p className="arc-avito-review-text">{r.text.slice(0, 200)}{r.text.length > 200 ? "…" : ""}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Технические метрики ───────────────────────────────────── */}
      {snapshotMeta?.tech_metrics && (
        <section className="arc-section arc-section-tech arc-reveal" style={{ animationDelay: "0.31s" }}>
          <div className="arc-section-num">TЕХ</div>
          <h2 className="arc-section-title">Технические параметры</h2>
          <div className="arc-tech-grid">

            {/* Скорость и размер */}
            <div className="arc-tech-card">
              <div className="arc-tech-card-title">Сервер</div>
              <div className="arc-tech-metrics-list">
                <div className="arc-tech-metric">
                  <span className="arc-tech-metric-label">Время ответа</span>
                  <span className={`arc-tech-metric-val ${
                    snapshotMeta.tech_metrics.response_time_ms == null ? "" :
                    snapshotMeta.tech_metrics.response_time_ms < 500 ? "arc-tech-ok" :
                    snapshotMeta.tech_metrics.response_time_ms < 1500 ? "arc-tech-warn" : "arc-tech-fail"
                  }`}>
                    {snapshotMeta.tech_metrics.response_time_ms != null
                      ? `${snapshotMeta.tech_metrics.response_time_ms} мс`
                      : "—"}
                  </span>
                </div>
                <div className="arc-tech-metric">
                  <span className="arc-tech-metric-label">Размер страницы</span>
                  <span className={`arc-tech-metric-val ${
                    snapshotMeta.tech_metrics.page_size_kb == null ? "" :
                    snapshotMeta.tech_metrics.page_size_kb < 100 ? "arc-tech-ok" :
                    snapshotMeta.tech_metrics.page_size_kb < 300 ? "arc-tech-warn" : "arc-tech-fail"
                  }`}>
                    {snapshotMeta.tech_metrics.page_size_kb != null
                      ? `${snapshotMeta.tech_metrics.page_size_kb} KB`
                      : "—"}
                  </span>
                </div>
                {snapshotMeta.tech_metrics.server_header && (
                  <div className="arc-tech-metric">
                    <span className="arc-tech-metric-label">Сервер</span>
                    <span className="arc-tech-metric-val arc-tech-neutral">{snapshotMeta.tech_metrics.server_header}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Структура */}
            <div className="arc-tech-card">
              <div className="arc-tech-card-title">Структура</div>
              <div className="arc-tech-checks-list">
                {[
                  { label: "sitemap.xml", ok: snapshotMeta.tech_metrics.has_sitemap },
                  { label: "robots.txt", ok: snapshotMeta.tech_metrics.has_robots_txt },
                  { label: "Meta viewport", ok: snapshotMeta.tech_metrics.has_viewport_meta },
                  { label: "Адаптивный CSS", ok: snapshotMeta.tech_metrics.has_responsive_css },
                ].map((item) => (
                  <div key={item.label} className="arc-tech-check-row">
                    <span className={`arc-tech-check-dot ${item.ok ? "arc-tech-ok" : "arc-tech-fail"}`}>
                      {item.ok ? "✓" : "✗"}
                    </span>
                    <span className={item.ok ? "arc-tech-check-ok" : "arc-tech-check-fail"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Аналитика */}
            <div className="arc-tech-card">
              <div className="arc-tech-card-title">Аналитика</div>
              <div className="arc-tech-checks-list">
                {[
                  { label: "Яндекс.Метрика", ok: snapshotMeta.tech_metrics.analytics.yandex_metrika },
                  { label: "Google Analytics", ok: snapshotMeta.tech_metrics.analytics.google_analytics },
                  { label: "Google Tag Manager", ok: snapshotMeta.tech_metrics.analytics.google_tag_manager },
                ].map((item) => (
                  <div key={item.label} className="arc-tech-check-row">
                    <span className={`arc-tech-check-dot ${item.ok ? "arc-tech-ok" : "arc-tech-neutral"}`}>
                      {item.ok ? "✓" : "○"}
                    </span>
                    <span className={item.ok ? "arc-tech-check-ok" : "arc-tech-check-neutral"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Чат-виджеты */}
            <div className="arc-tech-card">
              <div className="arc-tech-card-title">Чаты и коллбэк</div>
              <div className="arc-tech-checks-list">
                {[
                  { label: "JivoSite", ok: snapshotMeta.tech_metrics.chat_widgets.jivo },
                  { label: "Calltouch", ok: snapshotMeta.tech_metrics.chat_widgets.calltouch },
                  { label: "Битрикс24 чат", ok: snapshotMeta.tech_metrics.chat_widgets.bitrix_chat },
                  { label: "Carrot Quest", ok: snapshotMeta.tech_metrics.chat_widgets.carrot_quest },
                  { label: "Talk-me", ok: snapshotMeta.tech_metrics.chat_widgets.talk_me },
                ].map((item) => (
                  <div key={item.label} className="arc-tech-check-row">
                    <span className={`arc-tech-check-dot ${item.ok ? "arc-tech-ok" : "arc-tech-neutral"}`}>
                      {item.ok ? "✓" : "○"}
                    </span>
                    <span className={item.ok ? "arc-tech-check-ok" : "arc-tech-check-neutral"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ── Визуальный анализ ─────────────────────────────────────── */}
      {snapshotMeta?.visual_analysis?.screenshot_taken && (
        <section className="arc-section arc-section-visual arc-reveal" style={{ animationDelay: "0.32s" }}>
          <div className="arc-section-num">AI</div>
          <h2 className="arc-section-title">Визуальный анализ</h2>
          <p className="arc-contacts-subtitle">GPT-4o Vision · оценка дизайна с первого взгляда</p>

          {/* Скриншот сайта */}
          {snapshotMeta.visual_analysis.screenshot_path && (
            <div className="arc-visual-screenshot-wrap">
              <img
                src={snapshotMeta.visual_analysis.screenshot_path}
                alt="Скриншот сайта на момент анализа"
                className="arc-visual-screenshot"
                loading="lazy"
              />
              <div className="arc-visual-screenshot-caption">Скриншот на момент анализа · 1440×900</div>
            </div>
          )}

          {/* Три скора */}
          <div className="arc-visual-scores">
            {[
              { label: "Дизайн", value: snapshotMeta.visual_analysis.design_score, icon: "🎨" },
              { label: "Доверие", value: snapshotMeta.visual_analysis.trust_score, icon: "🛡" },
              { label: "Ясность", value: snapshotMeta.visual_analysis.clarity_score, icon: "💡" },
            ].map((s) => (
              <div key={s.label} className="arc-visual-score-card">
                <div className="arc-visual-score-icon">{s.icon}</div>
                <div className="arc-visual-score-num" style={{
                  color: s.value >= 75 ? "#22c55e" : s.value >= 50 ? "#f59e0b" : "#ef4444"
                }}>
                  {s.value}
                </div>
                <div className="arc-visual-score-label">{s.label}</div>
                <div className="arc-visual-score-bar">
                  <div className="arc-visual-score-fill" style={{
                    width: `${s.value}%`,
                    background: s.value >= 75 ? "#22c55e" : s.value >= 50 ? "#f59e0b" : "#ef4444",
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Общее впечатление */}
          {snapshotMeta.visual_analysis.overall_impression && (
            <p className="arc-visual-impression">{snapshotMeta.visual_analysis.overall_impression}</p>
          )}

          {/* Первый экран */}
          {snapshotMeta.visual_analysis.above_fold_assessment && (
            <div className="arc-visual-fold">
              <div className="arc-visual-fold-label">Первый экран</div>
              <p>{snapshotMeta.visual_analysis.above_fold_assessment}</p>
            </div>
          )}

          {/* Метки CTA и мобильность */}
          <div className="arc-visual-badges">
            <span className={`arc-visual-badge arc-visual-badge-cta-${snapshotMeta.visual_analysis.cta_visibility}`}>
              CTA: {snapshotMeta.visual_analysis.cta_visibility === "visible" ? "заметен"
                : snapshotMeta.visual_analysis.cta_visibility === "weak" ? "слабый"
                : "отсутствует"}
            </span>
            <span className={`arc-visual-badge arc-visual-badge-mob-${snapshotMeta.visual_analysis.mobile_readiness}`}>
              Мобильность: {snapshotMeta.visual_analysis.mobile_readiness === "good" ? "хорошая"
                : snapshotMeta.visual_analysis.mobile_readiness === "medium" ? "средняя"
                : "плохая"}
            </span>
          </div>

          {/* Плюсы / минусы */}
          <div className="arc-visual-feedback">
            {snapshotMeta.visual_analysis.design_strengths.length > 0 && (
              <div className="arc-visual-feedback-col">
                <div className="arc-visual-feedback-title arc-visual-feedback-ok">✓ Сильные стороны</div>
                <ul>
                  {snapshotMeta.visual_analysis.design_strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {snapshotMeta.visual_analysis.design_issues.length > 0 && (
              <div className="arc-visual-feedback-col">
                <div className="arc-visual-feedback-title arc-visual-feedback-fail">✗ Проблемы</div>
                <ul>
                  {snapshotMeta.visual_analysis.design_issues.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── SEO Аудит ─────────────────────────────────────────────── */}
      {snapshotMeta?.seo_metrics && (
        <section className="arc-section arc-section-seo arc-reveal" style={{ animationDelay: "0.33s" }}>
          <div className="arc-section-num">SEO</div>
          <h2 className="arc-section-title">SEO-аудит сайта</h2>
          <div className="arc-seo-layout">
            {/* Gauage */}
            <div className="arc-seo-gauge-wrap">
              <div className="arc-seo-gauge">
                <svg viewBox="0 0 120 70" className="arc-seo-gauge-svg">
                  {/* Track */}
                  <path d="M10,70 A60,60 0 0,1 110,70" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" strokeLinecap="round"/>
                  {/* Fill */}
                  <path
                    d="M10,70 A60,60 0 0,1 110,70"
                    fill="none"
                    stroke={
                      snapshotMeta.seo_metrics.score >= 75 ? "#22c55e"
                      : snapshotMeta.seo_metrics.score >= 50 ? "#f59e0b"
                      : "#ef4444"
                    }
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(snapshotMeta.seo_metrics.score / 100) * 188.5} 188.5`}
                  />
                </svg>
                <div className="arc-seo-gauge-val">{snapshotMeta.seo_metrics.score}</div>
                <div className="arc-seo-gauge-label">из 100</div>
              </div>
              <div className="arc-seo-gauge-status">
                {snapshotMeta.seo_metrics.score >= 75 ? "Хорошая оптимизация"
                  : snapshotMeta.seo_metrics.score >= 50 ? "Требует доработки"
                  : "Критические проблемы"}
              </div>
              <div className="arc-seo-gauge-counts">
                <span className="arc-seo-ok">✓ {snapshotMeta.seo_metrics.checks.filter(c => c.status === "ok").length}</span>
                <span className="arc-seo-warn">⚠ {snapshotMeta.seo_metrics.checks.filter(c => c.status === "warn").length}</span>
                <span className="arc-seo-fail">✗ {snapshotMeta.seo_metrics.checks.filter(c => c.status === "fail").length}</span>
              </div>
            </div>
            {/* Checklist */}
            <div className="arc-seo-checks">
              {snapshotMeta.seo_metrics.checks.map((c) => (
                <div key={c.key} className={`arc-seo-check arc-seo-check--${c.status}`}>
                  <span className="arc-seo-check-icon">
                    {c.status === "ok" ? "✓" : c.status === "warn" ? "⚠" : "✗"}
                  </span>
                  <span className="arc-seo-check-label">{c.label}</span>
                  {c.value && <span className="arc-seo-check-val">{c.value}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Speed Audit ───────────────────────────────────────── */}
      {snapshotMeta?.speed_audit && (
        <section className="arc-section arc-section-speed arc-reveal" style={{ animationDelay: "0.34s" }}>
          <div className="arc-section-num">⚡</div>
          <h2 className="arc-section-title">Скорость загрузки</h2>

          {/* TTFB */}
          <div className="arc-speed-ttfb-row">
            <div className="arc-speed-metric-label">Время ответа сервера (TTFB)</div>
            <div className={`arc-speed-badge arc-speed-badge--${snapshotMeta.speed_audit.ttfb_rating}`}>
              {snapshotMeta.speed_audit.ttfb_label}
            </div>
            <div className="arc-speed-ttfb-val">
              {snapshotMeta.speed_audit.ttfb_ms != null
                ? `${snapshotMeta.speed_audit.ttfb_ms} мс`
                : "—"}
            </div>
            <div className="arc-speed-bar-wrap">
              <div
                className={`arc-speed-bar-fill arc-speed-bar--${snapshotMeta.speed_audit.ttfb_rating}`}
                style={{
                  width: `${Math.min(100, ((snapshotMeta.speed_audit.ttfb_ms ?? 0) / 3000) * 100)}%`,
                }}
              />
            </div>
            <div className="arc-speed-scale">
              <span className="arc-speed-scale-ok">&lt;300мс Отлично</span>
              <span className="arc-speed-scale-warn">300–800мс Норма</span>
              <span className="arc-speed-scale-fail">&gt;800мс Медленно</span>
            </div>
          </div>

          {/* Core Web Vitals (если есть PageSpeed данные) */}
          {snapshotMeta.speed_audit.ps_score !== undefined && (
            <div className="arc-cwv-grid">
              <div className="arc-cwv-header">
                <span className="arc-cwv-title">Core Web Vitals</span>
                <span className="arc-cwv-source">Google PageSpeed Insights · Mobile</span>
                <div className={`arc-cwv-score arc-cwv-score--${
                  snapshotMeta.speed_audit.ps_score >= 90 ? "good"
                  : snapshotMeta.speed_audit.ps_score >= 50 ? "medium" : "poor"
                }`}>
                  {snapshotMeta.speed_audit.ps_score}
                  <span className="arc-cwv-score-label">/ 100</span>
                </div>
              </div>

              {[
                {
                  key: "FCP",
                  label: "First Contentful Paint",
                  hint: "Время до первого отображения контента",
                  value: snapshotMeta.speed_audit.ps_fcp_ms,
                  good: 1800,
                  poor: 3000,
                  unit: "мс",
                },
                {
                  key: "LCP",
                  label: "Largest Contentful Paint",
                  hint: "Время загрузки основного контента",
                  value: snapshotMeta.speed_audit.ps_lcp_ms,
                  good: 2500,
                  poor: 4000,
                  unit: "мс",
                },
                {
                  key: "TBT",
                  label: "Total Blocking Time",
                  hint: "Время блокировки основного потока",
                  value: snapshotMeta.speed_audit.ps_tbt_ms,
                  good: 200,
                  poor: 600,
                  unit: "мс",
                },
                {
                  key: "TTI",
                  label: "Time to Interactive",
                  hint: "Время до интерактивности страницы",
                  value: snapshotMeta.speed_audit.ps_tti_ms,
                  good: 3800,
                  poor: 7300,
                  unit: "мс",
                },
              ].filter(m => m.value !== undefined).map((m) => {
                const rating = m.value! <= m.good ? "good" : m.value! <= m.poor ? "medium" : "poor";
                const pct = Math.min(100, (m.value! / (m.poor * 1.5)) * 100);
                return (
                  <div key={m.key} className="arc-cwv-row">
                    <div className="arc-cwv-row-key">{m.key}</div>
                    <div className="arc-cwv-row-label">
                      <span className="arc-cwv-row-name">{m.label}</span>
                      <span className="arc-cwv-row-hint">{m.hint}</span>
                    </div>
                    <div className={`arc-cwv-row-val arc-cwv-val--${rating}`}>
                      {m.value!.toLocaleString("ru")} {m.unit}
                    </div>
                    <div className="arc-cwv-bar-wrap">
                      <div className={`arc-cwv-bar-fill arc-cwv-fill--${rating}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className={`arc-cwv-row-badge arc-cwv-badge--${rating}`}>
                      {rating === "good" ? "Хорошо" : rating === "medium" ? "Нужно улучшить" : "Плохо"}
                    </div>
                  </div>
                );
              })}

              {snapshotMeta.speed_audit.ps_cls !== undefined && (
                <div className="arc-cwv-row">
                  <div className="arc-cwv-row-key">CLS</div>
                  <div className="arc-cwv-row-label">
                    <span className="arc-cwv-row-name">Cumulative Layout Shift</span>
                    <span className="arc-cwv-row-hint">Стабильность визуальной раскладки</span>
                  </div>
                  <div className={`arc-cwv-row-val arc-cwv-val--${
                    snapshotMeta.speed_audit.ps_cls <= 0.1 ? "good"
                    : snapshotMeta.speed_audit.ps_cls <= 0.25 ? "medium" : "poor"
                  }`}>
                    {snapshotMeta.speed_audit.ps_cls.toFixed(3)}
                  </div>
                  <div className="arc-cwv-bar-wrap">
                    <div
                      className={`arc-cwv-bar-fill arc-cwv-fill--${
                        snapshotMeta.speed_audit.ps_cls <= 0.1 ? "good"
                        : snapshotMeta.speed_audit.ps_cls <= 0.25 ? "medium" : "poor"
                      }`}
                      style={{ width: `${Math.min(100, (snapshotMeta.speed_audit.ps_cls / 0.5) * 100)}%` }}
                    />
                  </div>
                  <div className={`arc-cwv-row-badge arc-cwv-badge--${
                    snapshotMeta.speed_audit.ps_cls <= 0.1 ? "good"
                    : snapshotMeta.speed_audit.ps_cls <= 0.25 ? "medium" : "poor"
                  }`}>
                    {snapshotMeta.speed_audit.ps_cls <= 0.1 ? "Хорошо"
                      : snapshotMeta.speed_audit.ps_cls <= 0.25 ? "Нужно улучшить" : "Плохо"}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── RU Blocking Audit ─────────────────────────────────── */}
      {snapshotMeta?.ru_blocking && snapshotMeta.ru_blocking.dependencies.length > 0 && (
        <section className="arc-section arc-section-ru arc-reveal" style={{ animationDelay: "0.35s" }}>
          <div className="arc-section-num">RU</div>
          <h2 className="arc-section-title">Зависимости для рынка России</h2>
          <p className="arc-contacts-subtitle">
            Внешние сервисы, которые могут замедлять сайт или быть недоступны для российских пользователей
          </p>

          {/* Сводка */}
          <div className="arc-ru-summary">
            <div className={`arc-ru-score-badge arc-ru-score--${
              snapshotMeta.ru_blocking.score >= 80 ? "good"
              : snapshotMeta.ru_blocking.score >= 50 ? "medium" : "poor"
            }`}>
              <span className="arc-ru-score-num">{snapshotMeta.ru_blocking.score}</span>
              <span className="arc-ru-score-label">/ 100</span>
            </div>
            <div className="arc-ru-counts">
              {snapshotMeta.ru_blocking.blocked_count > 0 && (
                <div className="arc-ru-count arc-ru-count--blocked">
                  <span className="arc-ru-count-icon">🚫</span>
                  <span className="arc-ru-count-num">{snapshotMeta.ru_blocking.blocked_count}</span>
                  <span className="arc-ru-count-txt">заблокированы</span>
                </div>
              )}
              {snapshotMeta.ru_blocking.unstable_count > 0 && (
                <div className="arc-ru-count arc-ru-count--unstable">
                  <span className="arc-ru-count-icon">⚠️</span>
                  <span className="arc-ru-count-num">{snapshotMeta.ru_blocking.unstable_count}</span>
                  <span className="arc-ru-count-txt">нестабильны</span>
                </div>
              )}
              {snapshotMeta.ru_blocking.ok_count > 0 && (
                <div className="arc-ru-count arc-ru-count--ok">
                  <span className="arc-ru-count-icon">✅</span>
                  <span className="arc-ru-count-num">{snapshotMeta.ru_blocking.ok_count}</span>
                  <span className="arc-ru-count-txt">ок для РФ</span>
                </div>
              )}
            </div>
          </div>

          {/* Список зависимостей — только blocked и unstable */}
          {snapshotMeta.ru_blocking.dependencies.filter(d => d.risk !== "ok").length > 0 && (
            <div className="arc-ru-deps-list">
              {snapshotMeta.ru_blocking.dependencies
                .filter(d => d.risk !== "ok")
                .map((dep, i) => (
                  <div key={i} className={`arc-ru-dep arc-ru-dep--${dep.risk}`}>
                    <div className="arc-ru-dep-header">
                      <span className="arc-ru-dep-icon">
                        {dep.risk === "blocked" ? "🚫" : "⚠️"}
                      </span>
                      <span className="arc-ru-dep-service">{dep.service}</span>
                      <span className="arc-ru-dep-domain">{dep.domain}</span>
                      <span className={`arc-ru-dep-risk arc-ru-dep-risk--${dep.risk}`}>
                        {dep.risk_label}
                      </span>
                    </div>
                    {dep.recommendation && (
                      <div className="arc-ru-dep-rec">{dep.recommendation}</div>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* OK зависимости (компактно) */}
          {snapshotMeta.ru_blocking.ok_count > 0 && (
            <div className="arc-ru-ok-list">
              <div className="arc-ru-ok-title">Дружественные для РФ:</div>
              <div className="arc-ru-ok-chips">
                {snapshotMeta.ru_blocking.dependencies
                  .filter(d => d.risk === "ok")
                  .map((dep, i) => (
                    <span key={i} className="arc-ru-ok-chip">
                      ✓ {dep.service}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="arc-cta-section arc-reveal" style={{ animationDelay: "0.35s" }}>
        {/* Прогноз конверсии */}
        <div className="arc-conversion-forecast">
          <div className="arc-conversion-forecast-label">Прогноз роста конверсии</div>
          <div className="arc-conversion-forecast-value">+{result.growth_potential_pct}%</div>
          <div className="arc-conversion-forecast-sub">
            потенциал роста дохода при внедрении roadmap за 6–12 месяцев
          </div>
        </div>

        {/* Разделитель */}
        <div className="arc-cta-divider" />

        {/* Личный блок */}
        <div className="arc-cta-personal">
          <img
            src="https://konversus.ru/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg"
            alt="Алексей Тимофеев"
            className="arc-cta-avatar"
          />
          <div className="arc-cta-personal-info">
            <div className="arc-cta-personal-name">Алексей Тимофеев</div>
            <div className="arc-cta-personal-role">Digital Packaging Specialist · konversus.ru</div>
            <p className="arc-cta-personal-pitch">
              Разберу ваш отчёт лично, покажу с чего начать и дам конкретный план — бесплатно, без обязательств.
            </p>
          </div>
        </div>

        {/* Контакты */}
        <div className="arc-cta-contacts">
          <a
            href="https://t.me/bilarius"
            target="_blank"
            rel="noopener noreferrer"
            className="arc-cta-contact arc-cta-contact-tg"
          >
            <span className="arc-cta-contact-icon">✈</span>
            <span className="arc-cta-contact-label">Telegram</span>
            <span className="arc-cta-contact-val">@bilarius</span>
          </a>
          <a
            href="tel:+79212013252"
            className="arc-cta-contact arc-cta-contact-phone"
          >
            <span className="arc-cta-contact-icon">✆</span>
            <span className="arc-cta-contact-label">Телефон</span>
            <span className="arc-cta-contact-val">+7 921 201-32-52</span>
          </a>
          <a
            href="mailto:bilariuss@yandex.ru"
            className="arc-cta-contact arc-cta-contact-email"
          >
            <span className="arc-cta-contact-icon">✉</span>
            <span className="arc-cta-contact-label">Email</span>
            <span className="arc-cta-contact-val">bilariuss@yandex.ru</span>
          </a>
        </div>

        <div className="arc-cta-main-btn-wrap">
          <a
            href="https://t.me/bilarius"
            target="_blank"
            rel="noopener noreferrer"
            className="arc-cta-btn arc-cta-btn-primary arc-cta-btn-xl"
          >
            Хочу внедрить — обсудим в Telegram
          </a>
          <Link href="/architect" className="arc-cta-btn arc-cta-btn-secondary">
            Новый анализ
          </Link>
        </div>

        <div className="arc-powered-footer">
          <a href="https://konversus.ru" target="_blank" rel="noopener noreferrer">
            Powered by Konversus
          </a>
        </div>
      </section>
    </div>
  );
}
