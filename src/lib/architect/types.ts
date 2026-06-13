// Типы модуля AI Business Growth Architect

// ── SEO Audit ────────────────────────────────────────────────────────────

export type SeoCheckStatus = "ok" | "warn" | "fail";

export interface SeoCheck {
  key: string;
  label: string;
  status: SeoCheckStatus;
  value?: string;
  points: number;
  max_points: number;
}

export interface SeoMetrics {
  score: number;
  checks: SeoCheck[];
}

// ── Tech Metrics ──────────────────────────────────────────────────────────

export interface TechMetrics {
  response_time_ms: number | null;       // время ответа сервера
  page_size_kb: number | null;           // размер HTML в KB
  has_sitemap: boolean | null;           // наличие /sitemap.xml
  has_robots_txt: boolean | null;        // наличие /robots.txt
  has_viewport_meta: boolean;            // meta viewport
  has_responsive_css: boolean;           // media queries в HTML/CSS
  analytics: {                           // счётчики аналитики
    yandex_metrika: boolean;
    google_analytics: boolean;
    google_tag_manager: boolean;
  };
  chat_widgets: {                        // виджеты чатов/обратной связи
    jivo: boolean;
    calltouch: boolean;
    bitrix_chat: boolean;
    carrot_quest: boolean;
    talk_me: boolean;
  };
  server_header: string | null;          // Server: nginx / Apache / etc.
}

// ── Visual Analysis (Playwright + GPT-4o Vision) ──────────────────────────

export interface VisualAnalysis {
  screenshot_taken: boolean;
  screenshot_path?: string;
  design_score: number;           // 0–100 оценка дизайна
  trust_score: number;            // 0–100 доверие с первого взгляда
  clarity_score: number;          // 0–100 понятность предложения
  overall_impression: string;     // общее впечатление (2-3 предложения)
  design_strengths: string[];     // что визуально хорошо
  design_issues: string[];        // визуальные проблемы
  above_fold_assessment: string;  // оценка первого экрана
  cta_visibility: "visible" | "weak" | "missing"; // видимость CTA
  mobile_readiness: "good" | "medium" | "poor";   // мобильность на вид
}

export type SourceType =
  | "website"
  | "ozon"
  | "wb"
  | "avito-seller"
  | "avito-listing";

export type ProjectStatus =
  | "pending"
  | "collecting"
  | "analyzing"
  | "done"
  | "failed";

// ── Снимок данных (результат data collector) ─────────────────────────────

export interface ArchitectSnapshot {
  url: string;
  source_type: SourceType;
  collected_at: string;

  // Website fields
  title?: string;
  description?: string;
  h1?: string;
  headings?: string[];
  word_count?: number;
  image_count?: number;
  link_count?: number;
  cms?: string | null;
  has_og_tags?: boolean;
  has_schema_org?: boolean;
  seo_title_length?: number;
  seo_description_length?: number;
  h1_count?: number;
  external_scripts_count?: number;
  inline_styles_bytes?: number;
  has_resource_hints?: boolean;
  raw_text?: string;

  // SEO-аудит (только для website)
  seo_metrics?: SeoMetrics;

  // Технические метрики (только для website)
  tech_metrics?: TechMetrics;

  // Визуальный анализ через Playwright + GPT-4o Vision
  visual_analysis?: VisualAnalysis;

  // Анализ внешних зависимостей на доступность из России
  ru_blocking?: RuBlockingAudit;

  // Анализ скорости загрузки (TTFB + PageSpeed Insights)
  speed_audit?: SpeedAudit;

  // Контакты и цифровой след (извлекается из HTML)
  contacts_found?: {
    phones: string[];
    emails: string[];
    socials: Array<{ platform: string; url: string; handle?: string }>;
    address?: string;
  };

  // Детекция форм сбора данных (триггер для 152-ФЗ)
  forms?: FormsDetection;

  // Данные Avito API (только для собственного профиля)
  avito_api?: {
    is_own_profile: boolean;
    user_id?: number;
    user_name?: string;
    phones?: string[];
    profile_url?: string;
    rating_score?: number;
    reviews_count?: number;
    active_items_count?: number;
    top_reviews?: Array<{ score?: number; text?: string; author?: string }>;
  };

  // Marketplace fields (ozon/wb/avito)
  products?: Array<{
    title: string;
    price?: string;
    rating?: string;
    reviews?: string;
    url?: string;
  }>;
  seller_name?: string;
  seller_rating?: string;
  seller_reviews?: string;
  categories?: string[];
}

// ── 6 секций отчёта ──────────────────────────────────────────────────────

export interface PositioningMap {
  current_image: string;
  perceived_audience: string;
  potential_image: string;
  positioning_gaps: string[];
  brand_keywords: string[];
}

export interface RevenueLeak {
  channel: string;
  status: "missing" | "weak" | "present";
  estimated_loss: string;
  description: string;
}

export interface GrowthOpportunity {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
  type: string;
}

export interface RoadmapItem {
  task: string;
  category: string;
  complexity: "easy" | "medium" | "hard";
  timeline: string;
  revenue_impact_pct: number;
}

export interface DigitalAsset {
  asset: string;
  purpose: string;
  priority: "must" | "should" | "nice";
}

export interface TopAction {
  title: string;
  reason: string;
  category: string;
}

export interface ArchitectReport {
  growth_potential_pct: number;
  verdict: string;
  niche: string;
  target_audience: string;

  positioning_map: PositioningMap;
  revenue_leaks: RevenueLeak[];
  growth_opportunities: GrowthOpportunity[];
  roadmap: RoadmapItem[];
  digital_assets: DigitalAsset[];
  top_actions?: TopAction[];
  legal_compliance?: LegalCompliance;
  health_score?: number;             // 0–100 сводная оценка здоровья сайта
  health_breakdown?: HealthBreakdown;

  summary: string;
  model_used?: string;
}

// ── RU Blocking Audit ────────────────────────────────────────────────────

export type RuRisk = "blocked" | "unstable" | "ok";
export type RuDepCategory =
  | "analytics"
  | "ads"
  | "fonts"
  | "chat"
  | "maps"
  | "social"
  | "cdn"
  | "captcha"
  | "other";

export interface RuDependency {
  domain: string;
  service: string;
  category: RuDepCategory;
  risk: RuRisk;
  risk_label: string;       // "Заблокирован в РФ" / "Нестабильно в РФ" / "Работает в РФ"
  recommendation: string;   // пусто если risk=ok
}

export interface RuBlockingAudit {
  total_external: number;   // всего внешних доменов обнаружено
  blocked_count: number;    // количество заблокированных
  unstable_count: number;   // количество нестабильных
  ok_count: number;         // количество ок-зависимостей
  unknown_count: number;    // неизвестные домены
  score: number;            // 0–100: 100 = все РФ-дружественные
  dependencies: RuDependency[];
}

// ── Speed Audit ───────────────────────────────────────────────────────────

export type SpeedRating = "excellent" | "good" | "slow" | "critical";

export interface SpeedAudit {
  ttfb_ms: number | null;          // время первого байта (серверный TTFB)
  ttfb_rating: SpeedRating;
  ttfb_label: string;              // "Отлично" / "Хорошо" / "Медленно" / "Критично"
  // Данные Google PageSpeed Insights (опционально)
  ps_score?: number;               // 0–100 оценка производительности (mobile)
  ps_fcp_ms?: number;              // First Contentful Paint (мс)
  ps_lcp_ms?: number;              // Largest Contentful Paint (мс)
  ps_tbt_ms?: number;              // Total Blocking Time (мс)
  ps_cls?: number;                 // Cumulative Layout Shift
  ps_tti_ms?: number;              // Time to Interactive (мс)
}

// ── DB-запись ─────────────────────────────────────────────────────────────

export interface ArchitectProject {
  id: string;
  url: string;
  source_type: SourceType;
  ip_hash: string;
  status: ProjectStatus;
  snapshot_json: ArchitectSnapshot | null;
  result_json: ArchitectReport | null;
  model_used: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

// ── Compliance (152-ФЗ, куки, политика конфиденциальности) ────────────────

export interface FormsDetection {
  has_forms: boolean;                // есть ли <form> на странице
  forms_count: number;               // количество форм
  collects_personal_data: boolean;   // формы/чаты собирают ПД (email, тел, имя)
  form_types: string[];              // найденные сигналы: ["form", "email", "tel", "chat"]
}

export type ComplianceStatus = "compliant" | "partial" | "violation" | "unknown";

export interface ComplianceIssue {
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
  law_reference?: string;
  fine?: string;                     // ориентировочный штраф, напр. "до 300 000 ₽"
  recommendation: string;
}

export interface LegalCompliance {
  overall_status: ComplianceStatus;
  overall_label: string;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_label: string;
  has_privacy_policy: boolean;
  has_cookie_notice: boolean;
  has_personal_data_agreement: boolean;
  has_cookie_banner: boolean;
  issues: ComplianceIssue[];
  summary: string;
}

// ── Health Score (сводная оценка 0–100) ───────────────────────────────────

export interface HealthBreakdownItem {
  key: "seo" | "visual" | "speed" | "tech" | "legal" | "ru";
  label: string;        // "SEO-видимость"
  score: number;        // 0–100 — оценка блока
  weight: number;       // вес в общей сумме (сумма весов = 100)
  contribution: number; // вклад в итог (score/100 * weight)
}

export interface HealthBreakdown {
  score: number;                  // финальный 0–100 (после legal-капа)
  base_score: number;             // до применения legal-капа
  legal_capped: boolean;          // был ли снижен из-за юр. нарушений
  cap_reason?: string;            // почему снижен ("Формы без политики → критично")
  items: HealthBreakdownItem[];
}
