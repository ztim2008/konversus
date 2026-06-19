// Аудит сайта: SSL, mobile, copyright, speed, SEO (H1), CMS, phone
// Скоринг горячих лидов

export interface WebsiteResult {
  url: string;
  reachable: boolean;
  ssl: boolean;
  copyrightYear: number | null;
  hasViewport: boolean;
  responseTime: number;
  statusCode: number;
  issues: string[];
  score: number;
  h1: { count: number; texts: string[]; ok: boolean };
  cms: string | null;
  hasPhone: boolean;
  contactName: string | null;
  // Скоринг горячего лида (0-100)
  hotScore: number;
}

const CURRENT_YEAR = new Date().getFullYear();
const OUTDATED_CUTOFF = CURRENT_YEAR - 2;

// CMS сигнатуры
const CMS_SIGNATURES: Record<string, { name: string; patterns: RegExp[] }> = {
  wordpress: { name: "WordPress", patterns: [/wp-content/, /wp-includes/, /wordpress/i] },
  tilda: { name: "Tilda", patterns: [/tilda\.cc/, /tildacdn\.com/, /tilda\.ws/] },
  bitrix: { name: "1C-Битрикс", patterns: [/bitrix/, /bx-panel/] },
  joomla: { name: "Joomla", patterns: [/joomla/i, /com_content/] },
  opencart: { name: "OpenCart", patterns: [/opencart/i, /catalog\/view/] },
  wix: { name: "Wix", patterns: [/wix\.com/, /static\.wixstatic/] },
  shopify: { name: "Shopify", patterns: [/shopify\.com/, /myshopify/] },
  nextjs: { name: "Next.js", patterns: [/__NEXT/, /_next\/static/] },
  react: { name: "React", patterns: [/react\/jsx-runtime/, /react\.development/] },
};

// Скоринг: баллы за проблемы
const HOT_SCORES = {
  ssl_expired: 30,
  ssl_soon: 20,
  no_h1: 25,       // нет H1 — сигнал на переделку!
  bad_h1: 15,       // кривой H1
  no_viewport: 10,
  old_copyright: 5,
  no_phone: 5,
  has_phone: -15,   // телефон есть — бонус (легче связаться)
  has_email: -10,   // email есть — бонус
};

export async function checkWebsite(url: string): Promise<WebsiteResult> {
  const result: WebsiteResult = {
    url, reachable: true, ssl: false,
    copyrightYear: null, hasViewport: true,
    responseTime: 0, statusCode: 0,
    issues: [], score: 0,
    h1: { count: 0, texts: [], ok: false },
    cms: null, hasPhone: false,
    contactName: null,
    hotScore: 50, // начинаем с 50 (нейтрально)
  };

  if (!url?.trim()) {
    result.reachable = false;
    result.issues.push("нет URL");
    result.score += 5;
    result.hotScore = 0;
    return result;
  }

  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith("http")) cleanUrl = "https://" + cleanUrl;
  result.ssl = cleanUrl.startsWith("https://");

  try {
    const t0 = Date.now();
    const resp = await fetch(cleanUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KonversusLeadRadar/1.0)" },
      signal: AbortSignal.timeout(10000), redirect: "follow",
    });
    result.responseTime = +(Date.now() - t0) / 1000;
    result.statusCode = resp.status;

    if (resp.status >= 400) {
      result.reachable = false;
      result.issues.push(`HTTP ${resp.status}`);
      result.score += 3;
      result.hotScore += 10;
      return result;
    }

    const html = await resp.text();

    // ─── H1 ────────────────────────────────────────────────────
    const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
    const h1Matches = html.matchAll(h1Regex);
    const h1Texts: string[] = [];
    for (const m of h1Matches) {
      const text = m[1].replace(/<[^>]+>/g, "").trim();
      if (text) h1Texts.push(text);
    }
    result.h1 = { count: h1Texts.length, texts: h1Texts, ok: false };

    if (h1Texts.length === 0) {
      result.issues.push("❌ нет H1 (главный заголовок)");
      result.score += 2;
      result.hotScore += HOT_SCORES.no_h1;
    } else if (h1Texts.length > 1) {
      result.issues.push(`⚠️ ${h1Texts.length} заголовков H1 (должен быть один)`);
      result.score += 1;
      result.hotScore += HOT_SCORES.bad_h1;
    } else {
      const h1 = h1Texts[0];
      if (h1.length < 10) {
        result.issues.push(`⚠️ H1 слишком короткий: «${h1}»`);
        result.score += 1;
        result.hotScore += HOT_SCORES.bad_h1;
      } else if (h1.length > 120) {
        result.issues.push(`⚠️ H1 слишком длинный (${h1.length} символов)`);
        result.hotScore += HOT_SCORES.bad_h1;
      } else {
        result.h1.ok = true;
      }
    }

    // ─── CMS ───────────────────────────────────────────────────
    for (const [key, cms] of Object.entries(CMS_SIGNATURES)) {
      if (cms.patterns.some(p => p.test(html))) {
        result.cms = cms.name;
        break;
      }
    }

    // ─── SSL ───────────────────────────────────────────────────
    if (!result.ssl) {
      result.issues.push("нет HTTPS");
      result.score += 2;
      result.hotScore += HOT_SCORES.ssl_expired;
    }

    // ─── Viewport ──────────────────────────────────────────────
    if (!/<meta[^>]*name=["']viewport["'][^>]*>/i.test(html)) {
      result.hasViewport = false;
      result.issues.push("не адаптирован под мобильные");
      result.score += 2;
      result.hotScore += HOT_SCORES.no_viewport;
    }

    // ─── Copyright ─────────────────────────────────────────────
    const years: number[] = [];
    for (const m of html.matchAll(/©\s*(\d{4})|[Cc]opyright\s+(\d{4})/g)) {
      const yr = parseInt(m[1] || m[2]);
      if (yr >= 2000 && yr <= CURRENT_YEAR) years.push(yr);
    }
    if (years.length > 0) {
      result.copyrightYear = Math.max(...years);
      if (result.copyrightYear <= OUTDATED_CUTOFF) {
        result.issues.push(`копирайт ${result.copyrightYear} г.`);
        result.score += 2;
        result.hotScore += HOT_SCORES.old_copyright;
      }
    }

    // ─── Phone ─────────────────────────────────────────────────
    result.hasPhone = /\+7|8\s*\(?\d{3}\)?[\s-]?\d{3}/.test(html);
    if (!result.hasPhone) {
      result.issues.push("нет телефона на сайте");
      result.score += 1;
      result.hotScore += HOT_SCORES.no_phone;
    } else {
      result.hotScore += HOT_SCORES.has_phone;
    }

    // ─── Email (для бонуса) ────────────────────────────────────
    if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(html)) {
      result.hotScore += HOT_SCORES.has_email;
    }

  
    // ─── LPR (имя владельца/директора) ───────────────────────────
    let contactName: string | null = null;
    
    // Паттерны: "ИП Иванов И.И.", "Директор: Петров А.А.", "Владелец: Сидоров"
    const namePatterns = [
      /(?:ИП|Директор|Владелец|Руководитель|Генеральный директор|Ген\. директор)[:\s]+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]*(?:\s+[А-ЯЁ][а-яё]*)?)/i,
      /(?:ИП|Директор|Владелец|Руководитель)[:\s]+([А-ЯЁ][а-яё]+\s+[А-ЯЁ]\.[А-ЯЁ]\.)/i,
      /([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:ович|овна|евич|евна))/i,
      /([А-ЯЁ][а-яё]+\s+[А-ЯЁ]\.[А-ЯЁ]\.)/i,
    ];
    
    for (const pattern of namePatterns) {
      const match = html.match(pattern);
      if (match) {
        contactName = match[1].trim();
        break;
      }
    }
    
    // Если не нашли имя — берём название из title
    if (!contactName) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        const title = titleMatch[1].replace(/[|–—\-].*/, "").trim();
        if (title.length > 3 && title.length < 100) contactName = title;
      }
    }
    
    result.contactName = contactName;

  } catch (err: any) {
    result.reachable = false;
    result.issues.push(err.name === "TimeoutError" ? "таймаут" : "сайт недоступен");
    result.score += 3;
    result.hotScore = 0;
  }

  result.hotScore = Math.max(0, Math.min(100, result.hotScore));
  return result;
}

export function scoreToGrade(score: number) {
  if (score === 0) return { grade: "A+", color: "#10b981", label: "Отлично" };
  if (score <= 2) return { grade: "A", color: "#10b981", label: "Хорошо" };
  if (score <= 4) return { grade: "B", color: "#f59e0b", label: "Средне" };
  if (score <= 6) return { grade: "C", color: "#f59e0b", label: "Плохо" };
  return { grade: "D", color: "#ef4444", label: "Критично" };
}

export function scoreToPercent(score: number) {
  return Math.max(0, 100 - score * 12);
}

// Метка горячести
export function hotLabel(score: number) {
  if (score >= 75) return { emoji: "🔥", label: "ГОРЯЧИЙ", color: "#ef4444" };
  if (score >= 60) return { emoji: "🟡", label: "ТЁПЛЫЙ", color: "#f59e0b" };
  if (score >= 30) return { emoji: "🔵", label: "ХОЛОДНЫЙ", color: "#3b82f6" };
  return { emoji: "⚪", label: "ЛЁД", color: "#94a3b8" };
}
