/**
 * Data Collector — собирает snapshot данных по URL.
 * MVP v1: только fetch(), без Playwright.
 * Поддерживает website, ozon, wb, avito-seller, avito-listing.
 */

import type {
  ArchitectSnapshot,
  FormsDetection,
  SeoCheck,
  SeoMetrics,
  TechMetrics,
  SourceType,
  RuBlockingAudit,
  RuDependency,
  RuRisk,
  RuDepCategory,
  SpeedAudit,
  SpeedRating,
} from "@/lib/architect/types";
import { enrichWithAvitoApi } from "@/lib/architect/avito-api";

// ── RU-Risk Database ──────────────────────────────────────────────────────

interface RuRiskEntry {
  service: string;
  category: RuDepCategory;
  risk: RuRisk;
  risk_label: string;
  recommendation: string;
}

const RU_RISK_DB: Record<string, RuRiskEntry> = {
  // ═══ ЗАБЛОКИРОВАНЫ В РФ ═══
  "connect.facebook.net": {
    service: "Facebook Pixel",
    category: "ads",
    risk: "blocked",
    risk_label: "Заблокирован в РФ",
    recommendation: "Удалите Facebook Pixel — он заблокирован и тормозит загрузку. Замените на VK Pixel.",
  },
  "facebook.com": {
    service: "Facebook",
    category: "social",
    risk: "blocked",
    risk_label: "Заблокирован в РФ",
    recommendation: "Facebook заблокирован в РФ. Удалите виджеты и замените на ВКонтакте.",
  },
  "static.xx.fbcdn.net": {
    service: "Facebook CDN",
    category: "ads",
    risk: "blocked",
    risk_label: "Заблокирован в РФ",
    recommendation: "Удалите зависимости от Facebook CDN.",
  },
  "platform.twitter.com": {
    service: "Twitter/X виджет",
    category: "social",
    risk: "blocked",
    risk_label: "Недоступен в РФ",
    recommendation: "Twitter/X заблокирован в РФ. Удалите виджеты и используйте ВКонтакте.",
  },
  "abs.twimg.com": {
    service: "Twitter/X CDN",
    category: "social",
    risk: "blocked",
    risk_label: "Недоступен в РФ",
    recommendation: "Удалите зависимости от Twitter/X CDN.",
  },
  "x.com": {
    service: "Twitter/X",
    category: "social",
    risk: "blocked",
    risk_label: "Недоступен в РФ",
    recommendation: "Twitter/X заблокирован в РФ. Замените на ВКонтакте или Telegram.",
  },
  "instagram.com": {
    service: "Instagram",
    category: "social",
    risk: "blocked",
    risk_label: "Заблокирован в РФ",
    recommendation: "Instagram заблокирован в РФ. Замените на ВКонтакте или Telegram.",
  },
  "cdninstagram.com": {
    service: "Instagram CDN",
    category: "social",
    risk: "blocked",
    risk_label: "Заблокирован в РФ",
    recommendation: "Удалите встраивание Instagram-контента.",
  },
  "doubleclick.net": {
    service: "Google DoubleClick",
    category: "ads",
    risk: "blocked",
    risk_label: "Заблокирован в РФ",
    recommendation: "Google рекламные теги нестабильны/заблокированы. Используйте Яндекс.Директ.",
  },
  "googlesyndication.com": {
    service: "Google AdSense",
    category: "ads",
    risk: "blocked",
    risk_label: "Нестабильно в РФ",
    recommendation: "Google AdSense нестабилен в РФ. Рассмотрите Яндекс.РСЯ.",
  },

  // ═══ НЕСТАБИЛЬНЫ В РФ ═══
  "googletagmanager.com": {
    service: "Google Tag Manager",
    category: "analytics",
    risk: "unstable",
    risk_label: "Нестабильно в РФ",
    recommendation: "GTM не загружается у ~30% РФ-пользователей. Подключайте скрипты напрямую или через Яндекс.Метрику.",
  },
  "google-analytics.com": {
    service: "Google Analytics",
    category: "analytics",
    risk: "unstable",
    risk_label: "Нестабильно в РФ",
    recommendation: "GA теряет данные по РФ-аудитории. Установите Яндекс.Метрику как основной инструмент аналитики.",
  },
  "googleanalytics.com": {
    service: "Google Analytics",
    category: "analytics",
    risk: "unstable",
    risk_label: "Нестабильно в РФ",
    recommendation: "GA теряет данные по РФ-аудитории. Установите Яндекс.Метрику как основной инструмент аналитики.",
  },
  "fonts.googleapis.com": {
    service: "Google Fonts",
    category: "fonts",
    risk: "unstable",
    risk_label: "Замедляет загрузку в РФ",
    recommendation: "Скачайте шрифты и разместите на своём сервере. Это ускорит загрузку на 0.5–2 секунды для РФ-пользователей.",
  },
  "fonts.gstatic.com": {
    service: "Google Fonts CDN",
    category: "fonts",
    risk: "unstable",
    risk_label: "Замедляет загрузку в РФ",
    recommendation: "Используйте самохостинг шрифтов вместо Google Fonts CDN.",
  },
  "maps.googleapis.com": {
    service: "Google Maps",
    category: "maps",
    risk: "unstable",
    risk_label: "Нестабильно в РФ",
    recommendation: "Замените Google Maps на Яндекс.Карты — они работают стабильно в РФ.",
  },
  "maps.gstatic.com": {
    service: "Google Maps CDN",
    category: "maps",
    risk: "unstable",
    risk_label: "Нестабильно в РФ",
    recommendation: "Замените Google Maps на Яндекс.Карты.",
  },
  "recaptcha.google.com": {
    service: "Google reCAPTCHA",
    category: "captcha",
    risk: "unstable",
    risk_label: "Нестабильно в РФ",
    recommendation: "Замените Google reCAPTCHA на Яндекс SmartCaptcha — работает стабильно в РФ и бесплатно.",
  },
  "recaptcha.net": {
    service: "Google reCAPTCHA",
    category: "captcha",
    risk: "unstable",
    risk_label: "Нестабильно в РФ",
    recommendation: "Замените на Яндекс SmartCaptcha.",
  },
  "ajax.googleapis.com": {
    service: "Google CDN (jQuery/libs)",
    category: "cdn",
    risk: "unstable",
    risk_label: "Нестабильно в РФ",
    recommendation: "Не используйте Google CDN для библиотек. Подключите jQuery и другие скрипты локально.",
  },
  "apis.google.com": {
    service: "Google APIs",
    category: "other",
    risk: "unstable",
    risk_label: "Нестабильно в РФ",
    recommendation: "Уберите зависимость от Google APIs — нестабильны в РФ.",
  },
  "cdnjs.cloudflare.com": {
    service: "Cloudflare CDN",
    category: "cdn",
    risk: "unstable",
    risk_label: "Может замедляться в РФ",
    recommendation: "Рассмотрите хостинг библиотек на своём сервере или на отечественном CDN.",
  },
  "code.jquery.com": {
    service: "jQuery CDN",
    category: "cdn",
    risk: "unstable",
    risk_label: "Внешний CDN",
    recommendation: "Скачайте jQuery и подключайте его со своего сервера.",
  },
  "stackpath.bootstrapcdn.com": {
    service: "Bootstrap CDN",
    category: "cdn",
    risk: "unstable",
    risk_label: "Внешний CDN",
    recommendation: "Bootstrap CDN может замедлять загрузку. Подключите Bootstrap локально.",
  },
  "maxcdn.bootstrapcdn.com": {
    service: "Bootstrap CDN",
    category: "cdn",
    risk: "unstable",
    risk_label: "Внешний CDN",
    recommendation: "Bootstrap CDN может замедлять загрузку. Подключите Bootstrap локально.",
  },
  "use.fontawesome.com": {
    service: "Font Awesome CDN",
    category: "fonts",
    risk: "unstable",
    risk_label: "Внешний CDN",
    recommendation: "Разместите Font Awesome на своём сервере.",
  },
  "kit.fontawesome.com": {
    service: "Font Awesome Kit",
    category: "fonts",
    risk: "unstable",
    risk_label: "Внешний CDN",
    recommendation: "Разместите Font Awesome на своём сервере.",
  },

  // ═══ ОК — РАБОТАЕТ В РФ ═══
  "mc.yandex.ru": {
    service: "Яндекс.Метрика",
    category: "analytics",
    risk: "ok",
    risk_label: "Рекомендуется для РФ",
    recommendation: "",
  },
  "yandex.ru": {
    service: "Яндекс",
    category: "analytics",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "api-maps.yandex.ru": {
    service: "Яндекс.Карты",
    category: "maps",
    risk: "ok",
    risk_label: "Рекомендуется для РФ",
    recommendation: "",
  },
  "api-maps.ru": {
    service: "Яндекс.Карты",
    category: "maps",
    risk: "ok",
    risk_label: "Рекомендуется для РФ",
    recommendation: "",
  },
  "vk.com": {
    service: "ВКонтакте",
    category: "social",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "vkontakte.ru": {
    service: "ВКонтакте",
    category: "social",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "t.me": {
    service: "Telegram",
    category: "social",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "telegram.org": {
    service: "Telegram",
    category: "social",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "jivosite.com": {
    service: "JivoSite",
    category: "chat",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "calltouch.ru": {
    service: "Calltouch",
    category: "analytics",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "carrotquest.io": {
    service: "Carrot Quest",
    category: "chat",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "talk-me.ru": {
    service: "Talk-me",
    category: "chat",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "talkme.pro": {
    service: "Talk-me",
    category: "chat",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "bitrix24.ru": {
    service: "Битрикс24",
    category: "chat",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "comagic.ru": {
    service: "CoMagic",
    category: "analytics",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "roistat.com": {
    service: "Roistat",
    category: "analytics",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "ok.ru": {
    service: "Одноклассники",
    category: "social",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "dzen.ru": {
    service: "Дзен",
    category: "social",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "zen.yandex.ru": {
    service: "Дзен",
    category: "social",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "rutube.ru": {
    service: "Rutube",
    category: "other",
    risk: "ok",
    risk_label: "Работает в РФ",
    recommendation: "",
  },
  "smartcaptcha.yandexcloud.net": {
    service: "Яндекс SmartCaptcha",
    category: "captcha",
    risk: "ok",
    risk_label: "Рекомендуется для РФ",
    recommendation: "",
  },
};

// ── RU Blocking Analysis ──────────────────────────────────────────────────

function extractExternalDomains(html: string): string[] {
  const domains = new Set<string>();

  // <script src="https://...">
  const scriptRe = /<script[^>]+src=["'](https?:\/\/[^"'\s>]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html)) !== null) {
    try { domains.add(new URL(m[1]).hostname.toLowerCase()); } catch { /* ignore */ }
  }

  // <link href="https://..."> (шрифты, стили)
  const linkRe = /<link[^>]+href=["'](https?:\/\/[^"'\s>]+)["']/gi;
  while ((m = linkRe.exec(html)) !== null) {
    try { domains.add(new URL(m[1]).hostname.toLowerCase()); } catch { /* ignore */ }
  }

  // @import url("https://...")  — Google Fonts в inline CSS и тегах <style>
  const importRe = /@import\s+(?:url\()?["']?(https?:\/\/[^"');\s]+)/gi;
  while ((m = importRe.exec(html)) !== null) {
    try { domains.add(new URL(m[1]).hostname.toLowerCase()); } catch { /* ignore */ }
  }

  // iframe src (карты, видео)
  const iframeRe = /<iframe[^>]+src=["'](https?:\/\/[^"'\s>]+)["']/gi;
  while ((m = iframeRe.exec(html)) !== null) {
    try { domains.add(new URL(m[1]).hostname.toLowerCase()); } catch { /* ignore */ }
  }

  return Array.from(domains);
}

/** Нормализует домен: убирает www., возвращает lowercase */
function normalizeDomain(domain: string): string {
  return domain.replace(/^www\./, "").toLowerCase();
}

export function analyzeRuBlocking(html: string): RuBlockingAudit {
  const rawDomains = extractExternalDomains(html);
  const dependencies: RuDependency[] = [];
  const seen = new Set<string>();

  let blockedCount = 0;
  let unstableCount = 0;
  let okCount = 0;
  let unknownCount = 0;

  for (const raw of rawDomains) {
    const normalized = normalizeDomain(raw);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    // Ищем совпадение в базе (точное или по суффиксу домена)
    let entry: RuRiskEntry | undefined = RU_RISK_DB[normalized];
    if (!entry) {
      // Проверяем родительский домен (например: tag.googletagmanager.com → googletagmanager.com)
      const parts = normalized.split(".");
      for (let i = 1; i < parts.length - 1; i++) {
        const parent = parts.slice(i).join(".");
        if (RU_RISK_DB[parent]) { entry = RU_RISK_DB[parent]; break; }
      }
    }

    if (entry) {
      // Уже известный домен из базы
      if (seen.has(entry.service)) continue; // дедуп одинаковых сервисов
      seen.add(entry.service);

      if (entry.risk === "blocked") blockedCount++;
      else if (entry.risk === "unstable") unstableCount++;
      else okCount++;

      dependencies.push({
        domain: normalized,
        service: entry.service,
        category: entry.category,
        risk: entry.risk,
        risk_label: entry.risk_label,
        recommendation: entry.recommendation,
      });
    } else {
      unknownCount++;
    }
  }

  // Сортируем: blocked → unstable → ok
  dependencies.sort((a, b) => {
    const order: Record<RuRisk, number> = { blocked: 0, unstable: 1, ok: 2 };
    return order[a.risk] - order[b.risk];
  });

  // Score: 100 если нет blocked/unstable, снижается пропорционально
  const total = blockedCount + unstableCount + okCount;
  const penalized = blockedCount * 2 + unstableCount;
  const score = total === 0 ? 100 : Math.max(0, Math.round(100 - (penalized / Math.max(total, 1)) * 100));

  return {
    total_external: rawDomains.length,
    blocked_count: blockedCount,
    unstable_count: unstableCount,
    ok_count: okCount,
    unknown_count: unknownCount,
    score,
    dependencies,
  };
}

// ── Speed Audit ───────────────────────────────────────────────────────────

export function buildSpeedAudit(responseTimeMs: number): SpeedAudit {
  let rating: SpeedRating;
  let label: string;

  if (responseTimeMs < 300) {
    rating = "excellent";
    label = "Отлично";
  } else if (responseTimeMs < 800) {
    rating = "good";
    label = "Хорошо";
  } else if (responseTimeMs < 2000) {
    rating = "slow";
    label = "Медленно";
  } else {
    rating = "critical";
    label = "Критично";
  }

  return {
    ttfb_ms: responseTimeMs,
    ttfb_rating: rating,
    ttfb_label: label,
  };
}

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; Konversus-Architect/1.0; +https://konversus.ru)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
  "Cache-Control": "no-cache",
};

// ── Helpers ───────────────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getMeta(html: string, name: string): string {
  const m =
    html.match(
      new RegExp(
        `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']{0,500})["']`,
        "i"
      )
    ) ||
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']{0,500})["'][^>]+(?:name|property)=["']${name}["']`,
        "i"
      )
    );
  return m ? m[1].trim() : "";
}

function getTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]{0,200})<\/title>/i);
  return m ? m[1].trim() : "";
}

function getH1(html: string): string {
  const m = html.match(/<h1[^>]*>([\s\S]{0,300}?)<\/h1>/i);
  return m ? stripTags(m[1]).trim() : "";
}

function getHeadings(html: string): string[] {
  const re = /<(h[1-3])[^>]*>([\s\S]{0,200}?)<\/\1>/gi;
  const result: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const level = parseInt(tag[1], 10);
    const prefix = "#".repeat(level);
    const text = stripTags(match[2]).trim();
    if (text) result.push(`${prefix} ${text}`);
    if (result.length >= 20) break;
  }
  return result;
}

function detectCMS(html: string): string | null {
  if (/wp-content|wp-includes|WordPress/i.test(html)) return "WordPress";
  if (/Tilda|tilda\.ws|tildacdn/i.test(html)) return "Tilda";
  if (/bitrix|1c-bitrix/i.test(html)) return "Bitrix";
  if (/shopify/i.test(html)) return "Shopify";
  if (/umi\.ru|umi-cms/i.test(html)) return "UMI.CMS";
  if (/joomla/i.test(html)) return "Joomla";
  if (/drupal/i.test(html)) return "Drupal";
  if (/wix\.com|wixstatic/i.test(html)) return "Wix";
  if (/insales/i.test(html)) return "InSales";
  if (/ecwid/i.test(html)) return "Ecwid";
  return null;
}

function countImages(html: string): number {
  return (html.match(/<img[\s\S]*?>/gi) ?? []).length;
}

function countLinks(html: string): number {
  return (html.match(/<a\s/gi) ?? []).length;
}

function countExternalScripts(html: string): number {
  return (html.match(/<script[^>]+src=["']https?:\/\//gi) ?? []).length;
}

function hasResourceHints(html: string): boolean {
  return /<link[^>]+rel=["'](preload|prefetch|preconnect)["']/i.test(html);
}

function hasSchemaOrg(html: string): boolean {
  return /application\/ld\+json/i.test(html) || /itemtype=["']https?:\/\/schema\.org/i.test(html);
}

// ── SEO Metrics extraction ────────────────────────────────────────────────

function countImagesWithAlt(html: string): { total: number; withAlt: number } {
  const imgs = html.match(/<img[^>]*>/gi) ?? [];
  let withAlt = 0;
  for (const img of imgs) {
    if (/\balt=["'][^"']{1,}/i.test(img)) withAlt++;
  }
  return { total: imgs.length, withAlt };
}

function getCanonical(html: string): string {
  const m =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return m ? m[1] : "";
}

function hasViewport(html: string): boolean {
  return /<meta[^>]+name=["']viewport["']/i.test(html);
}

function getRobotsMeta(html: string): string {
  const m =
    html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i);
  return m ? m[1].toLowerCase() : "";
}

function hasFavicon(html: string): boolean {
  return /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html);
}

function hasOgImage(html: string): boolean {
  return /property=["']og:image["']/i.test(html);
}

function check(
  key: string,
  label: string,
  status: SeoCheck["status"],
  value: string | undefined,
  points: number,
  max_points: number
): SeoCheck {
  return { key, label, status, value, points, max_points };
}

function extractSeoMetrics(html: string, url: string): SeoMetrics {
  const title = getTitle(html);
  const desc = getMeta(html, "description");
  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
  const h2Count = (html.match(/<h2[\s>]/gi) ?? []).length;
  const h3Count = (html.match(/<h3[\s>]/gi) ?? []).length;
  const { total: imgTotal, withAlt: imgWithAlt } = countImagesWithAlt(html);
  const ogTitle = getMeta(html, "og:title");
  const ogDesc = getMeta(html, "og:description");
  const canonical = getCanonical(html);
  const robotsMeta = getRobotsMeta(html);
  const isHttps = url.startsWith("https://");
  const altPct = imgTotal > 0 ? Math.round((imgWithAlt / imgTotal) * 100) : 100;

  const checks: SeoCheck[] = [
    // Title
    check("title_exists", "Title-тег задан", title ? "ok" : "fail",
      title ? `«${title.slice(0, 50)}»` : "Отсутствует", title ? 5 : 0, 5),
    check("title_length", "Длина title (40–70 символов)",
      title.length >= 40 && title.length <= 70 ? "ok" : title.length > 0 && title.length < 100 ? "warn" : "fail",
      title.length > 0 ? `${title.length} симв.` : undefined,
      title.length >= 40 && title.length <= 70 ? 5 : title.length > 0 ? 2 : 0, 5),

    // Description
    check("desc_exists", "Meta description задан", desc ? "ok" : "fail",
      desc ? `${desc.length} симв.` : "Отсутствует", desc ? 5 : 0, 5),
    check("desc_length", "Длина description (100–170 символов)",
      desc.length >= 100 && desc.length <= 170 ? "ok" : desc.length > 0 ? "warn" : "fail",
      desc.length > 0 ? `${desc.length} симв.` : undefined,
      desc.length >= 100 && desc.length <= 170 ? 5 : desc.length > 0 ? 2 : 0, 5),

    // H1
    check("h1_exists", "H1-заголовок присутствует", h1Count > 0 ? "ok" : "fail",
      h1Count > 0 ? `${h1Count} шт.` : "Отсутствует", h1Count > 0 ? 8 : 0, 8),
    check("h1_single", "Только один H1 на странице",
      h1Count === 1 ? "ok" : h1Count === 0 ? "fail" : "warn",
      `${h1Count} шт.`, h1Count === 1 ? 4 : 0, 4),

    // H2 / H3
    check("h2_exists", "H2-подзаголовки присутствуют", h2Count > 0 ? "ok" : "warn",
      `${h2Count} шт.`, h2Count > 0 ? 5 : 0, 5),
    check("h3_exists", "H3-подзаголовки присутствуют", h3Count > 0 ? "ok" : "warn",
      `${h3Count} шт.`, h3Count > 0 ? 3 : 0, 3),

    // Images alt
    check("images_alt", "Alt-атрибуты у изображений",
      imgTotal === 0 ? "warn" : altPct >= 90 ? "ok" : altPct >= 60 ? "warn" : "fail",
      imgTotal === 0 ? "Нет изображений" : `${imgWithAlt}/${imgTotal} (${altPct}%)`,
      imgTotal === 0 ? 5 : Math.round((altPct / 100) * 10), 10),

    // OpenGraph
    check("og_title", "OG: og:title задан", ogTitle ? "ok" : "warn",
      ogTitle ? "Есть" : "Отсутствует", ogTitle ? 4 : 0, 4),
    check("og_desc", "OG: og:description задан", ogDesc ? "ok" : "warn",
      ogDesc ? "Есть" : "Отсутствует", ogDesc ? 4 : 0, 4),
    check("og_image", "OG: og:image задан", hasOgImage(html) ? "ok" : "warn",
      hasOgImage(html) ? "Есть" : "Отсутствует", hasOgImage(html) ? 4 : 0, 4),

    // Tech
    check("canonical", "Canonical URL задан", canonical ? "ok" : "warn",
      canonical ? canonical.slice(0, 60) : "Отсутствует", canonical ? 6 : 0, 6),
    check("viewport", "Meta viewport (мобильная адаптация)", hasViewport(html) ? "ok" : "fail",
      hasViewport(html) ? "Есть" : "Отсутствует", hasViewport(html) ? 6 : 0, 6),
    check("schema_org", "Schema.org разметка", hasSchemaOrg(html) ? "ok" : "warn",
      hasSchemaOrg(html) ? "Есть" : "Отсутствует", hasSchemaOrg(html) ? 8 : 0, 8),
    check("favicon", "Favicon задан", hasFavicon(html) ? "ok" : "warn",
      hasFavicon(html) ? "Есть" : "Отсутствует", hasFavicon(html) ? 5 : 0, 5),
    check("robots_safe", "Meta robots не блокирует индексацию",
      robotsMeta.includes("noindex") ? "fail" : "ok",
      robotsMeta || "Нет блокировки",
      robotsMeta.includes("noindex") ? 0 : 4, 4),
    check("https", "HTTPS", isHttps ? "ok" : "fail",
      isHttps ? "Да" : "Нет", isHttps ? 5 : 0, 5),
  ];

  const totalPoints = checks.reduce((s, c) => s + c.points, 0);
  const maxPoints = checks.reduce((s, c) => s + c.max_points, 0);
  const score = Math.round((totalPoints / maxPoints) * 100);

  return { score, checks };
}

function hasOgTags(html: string): boolean {
  return /property=["']og:/i.test(html);
}

function extractRawText(html: string, limit = 5000): string {
  return stripTags(html).slice(0, limit);
}

// ── Contact extraction ────────────────────────────────────────────────────

function extractPhones(html: string): string[] {
  const text = stripTags(html);
  const phones = new Set<string>();

  // Форматы: +7 (999) 999-99-99, 8-999-999-99-99, +79991234567, tel:+7...
  const patterns = [
    /(?:tel:|телефон|phone|контакт|звонит|позвоните|call)[:\s]*([+78]\s*[\d\s\-()]{9,20}\d)/gi,
    /(?<!\d)(\+7[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})(?!\d)/g,
    /(?<!\d)(8[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})(?!\d)/g,
  ];

  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const raw = (m[1] ?? m[0]).replace(/\s/g, "").replace(/[()-]/g, "");
      const digits = raw.replace(/\D/g, "");
      if (digits.length === 11) {
        const normalized = "+7" + digits.slice(1);
        phones.add(normalized);
      }
      if (phones.size >= 5) break;
    }
    if (phones.size >= 5) break;
  }

  return Array.from(phones);
}

function extractEmails(html: string): string[] {
  const text = html.replace(/<[^>]+>/g, " ");
  const emails = new Set<string>();
  const re = /\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const email = m[1].toLowerCase();
    // Исключаем системные email
    if (!email.includes("example") && !email.includes("your@") && !email.includes("noreply")) {
      emails.add(email);
    }
    if (emails.size >= 5) break;
  }
  return Array.from(emails);
}

type SocialEntry = { platform: string; url: string; handle?: string };

function extractSocials(html: string): SocialEntry[] {
  const socials: SocialEntry[] = [];
  const found = new Set<string>();

  const platforms: Array<{ name: string; regex: RegExp; handleCapture?: number }> = [
    { name: "VKontakte", regex: /https?:\/\/(www\.)?vk\.com\/([\w.@-]{1,100})/i, handleCapture: 2 },
    { name: "Telegram", regex: /https?:\/\/(t\.me|telegram\.me)\/([\w-]{1,100})/i, handleCapture: 2 },
    { name: "Instagram", regex: /https?:\/\/(www\.)?instagram\.com\/([\w.-]{1,100})/i, handleCapture: 2 },
    { name: "YouTube", regex: /https?:\/\/(www\.)?youtube\.com\/(channel|c|@[\w-]{1,100})/i },
    { name: "WhatsApp", regex: /https?:\/\/(api\.whatsapp\.com|wa\.me)\/([\d+]{7,20})/i, handleCapture: 2 },
    { name: "OK.ru", regex: /https?:\/\/(www\.)?ok\.ru\/([\w.-]{1,100})/i, handleCapture: 2 },
    { name: "TikTok", regex: /https?:\/\/(www\.)?tiktok\.com\/@([\w.]{1,100})/i, handleCapture: 2 },
    { name: "Dzen", regex: /https?:\/\/(zen\.yandex\.ru|dzen\.ru)\/([\w-]{1,100})/i, handleCapture: 2 },
  ];

  const hrefRe = /href=["']([^"']{5,300})["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1];
    for (const p of platforms) {
      const pm = href.match(p.regex);
      if (pm && !found.has(p.name)) {
        found.add(p.name);
        const handle = p.handleCapture ? pm[p.handleCapture] : undefined;
        socials.push({ platform: p.name, url: pm[0], handle });
        break;
      }
    }
    if (socials.length >= 8) break;
  }

  return socials;
}

function extractAddress(html: string): string | undefined {
  // Попытка 1: schema.org itemProp address
  const schemaAddr = html.match(/itemprop=["']address["'][^>]*>([^<]{10,200})</i)?.[1]?.trim();
  if (schemaAddr) return stripTags(schemaAddr).trim();

  // Попытка 2: JSON-LD address
  const ldMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (ldMatch) {
    try {
      const data = JSON.parse(ldMatch[1]) as Record<string, unknown>;
      const addr = data.address;
      if (typeof addr === "string" && addr.length > 5) return addr;
      if (typeof addr === "object" && addr !== null) {
        const a = addr as Record<string, unknown>;
        const parts = [a.streetAddress, a.addressLocality, a.postalCode]
          .filter(Boolean)
          .map(String);
        if (parts.length > 0) return parts.join(", ");
      }
    } catch {
      // ignore
    }
  }

  // Попытка 3: ключевые слова + адрес
  const addrMatch = html.match(/(?:адрес|address)[:\s]{0,5}<[^>]*>([^<]{10,200})/i)?.[1];
  if (addrMatch) return stripTags(addrMatch).trim();

  return undefined;
}

/**
 * Детекция форм и элементов сбора персональных данных.
 * Наличие форм = триггер обязательности политики конфиденциальности и
 * согласия на обработку ПД по 152-ФЗ.
 */
function detectForms(html: string, tech: TechMetrics): FormsDetection {
  const formsCount = (html.match(/<form[\s>]/gi) ?? []).length;

  const hasEmailInput = /<input[^>]+type=["']email["']/i.test(html);
  const hasTelInput = /<input[^>]+type=["']tel["']/i.test(html);
  const hasNameInput =
    /<input[^>]+(?:name|placeholder|id)=["'](?:[^"']*\b(?:name|имя|фио|телефон|phone|email|почта|e-mail)\b[^"']*)["']/i.test(html);
  const hasTextarea = /<textarea[\s>]/i.test(html);

  const hasChat =
    tech.chat_widgets.jivo ||
    tech.chat_widgets.calltouch ||
    tech.chat_widgets.bitrix_chat ||
    tech.chat_widgets.carrot_quest ||
    tech.chat_widgets.talk_me;

  const signals: string[] = [];
  if (formsCount > 0) signals.push("form");
  if (hasEmailInput) signals.push("email");
  if (hasTelInput) signals.push("tel");
  if (hasNameInput) signals.push("name");
  if (hasTextarea) signals.push("textarea");
  if (hasChat) signals.push("chat");

  const collectsPersonalData =
    formsCount > 0 || hasEmailInput || hasTelInput || hasNameInput || hasTextarea || hasChat;

  return {
    has_forms: formsCount > 0,
    forms_count: formsCount,
    collects_personal_data: collectsPersonalData,
    form_types: signals,
  };
}

function extractContacts(html: string): ArchitectSnapshot["contacts_found"] {
  const phones = extractPhones(html);
  const emails = extractEmails(html);
  const socials = extractSocials(html);
  const address = extractAddress(html);
  return { phones, emails, socials, address };
}

// ── Tech Metrics ──────────────────────────────────────────────────────────

async function collectTechMetrics(url: string, html: string, responseTimeMs: number, pageSizeBytes: number): Promise<TechMetrics> {
  const origin = new URL(url).origin;

  // sitemap.xml и robots.txt — параллельно
  const [sitemapOk, robotsOk] = await Promise.all([
    fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(5_000), headers: FETCH_HEADERS })
      .then(r => r.status < 400)
      .catch(() => false),
    fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5_000), headers: FETCH_HEADERS })
      .then(r => r.status < 400)
      .catch(() => false),
  ]);

  // media queries — проверяем inline <style> и атрибуты
  const hasResponsiveCss = /@media\s*\(/i.test(html);

  // аналитика
  const analytics = {
    yandex_metrika: /mc\.yandex\.ru\/metrika|ym\s*\(|yandex_metrika/i.test(html),
    google_analytics: /google-analytics\.com|gtag\s*\(|ga\s*\(/i.test(html),
    google_tag_manager: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i.test(html),
  };

  // чат-виджеты
  const chat_widgets = {
    jivo: /jivosite\.com|jivo_api|jivoChat/i.test(html),
    calltouch: /calltouch\.ru|ct_js|calltracking/i.test(html),
    bitrix_chat: /bitrix24\.ru.*openlines|bx-livechat|bitrix.*chat/i.test(html),
    carrot_quest: /carrotquest\.io|carrot_quest/i.test(html),
    talk_me: /talk-me\.ru|talkme\.pro/i.test(html),
  };

  return {
    response_time_ms: responseTimeMs,
    page_size_kb: Math.round(pageSizeBytes / 1024),
    has_sitemap: sitemapOk,
    has_robots_txt: robotsOk,
    has_viewport_meta: /<meta[^>]+name=["']viewport["']/i.test(html),
    has_responsive_css: hasResponsiveCss,
    analytics,
    chat_widgets,
    server_header: null, // будет заполнено в collectWebsiteSnapshot
  };
}

// ── Website collector ─────────────────────────────────────────────────────

async function collectWebsiteSnapshot(url: string): Promise<ArchitectSnapshot> {
  const t0 = Date.now();
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(30_000),
    redirect: "follow",
  });
  const responseTimeMs = Date.now() - t0;

  const html = await res.text();
  const pageSizeBytes = Buffer.byteLength(html, "utf8");
  const serverHeader = res.headers.get("server") ?? null;

  const title = getTitle(html);
  const description = getMeta(html, "description") || getMeta(html, "og:description");
  const h1 = getH1(html);
  const headings = getHeadings(html);
  const rawText = extractRawText(html);

    const techMetrics = await collectTechMetrics(url, html, responseTimeMs, pageSizeBytes);
    techMetrics.server_header = serverHeader;

    const forms = detectForms(html, techMetrics);

    return {
      url,
      source_type: "website",
      collected_at: new Date().toISOString(),
      title,
      description,
      h1,
      headings,
      word_count: rawText.split(/\s+/).filter(Boolean).length,
      image_count: countImages(html),
      link_count: countLinks(html),
      cms: detectCMS(html),
      has_og_tags: hasOgTags(html),
      has_schema_org: hasSchemaOrg(html),
      seo_title_length: title.length,
      seo_description_length: description.length,
      h1_count: (html.match(/<h1[\s>]/gi) ?? []).length,
      external_scripts_count: countExternalScripts(html),
      inline_styles_bytes: (html.match(/style=["'][^"']{0,5000}["']/gi) ?? [])
        .join("")
        .length,
      has_resource_hints: hasResourceHints(html),
      raw_text: rawText,
      seo_metrics: extractSeoMetrics(html, url),
      tech_metrics: techMetrics,
      contacts_found: extractContacts(html),
      ru_blocking: analyzeRuBlocking(html),
      speed_audit: buildSpeedAudit(responseTimeMs),
      forms,
    };
  }

// ── Ozon collector (soft fetch) ───────────────────────────────────────────

async function collectOzonSnapshot(url: string): Promise<ArchitectSnapshot> {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(30_000),
    redirect: "follow",
  });
  const html = await res.text();
  const title = getTitle(html);
  const rawText = extractRawText(html, 3000);

  // Ozon часто отдаёт SSR — пробуем извлечь product data из JSON-LD
  const jsonLdMatch = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  let products: ArchitectSnapshot["products"] = [];
  if (jsonLdMatch) {
    try {
      const jsonData = JSON.parse(jsonLdMatch[1]) as Record<string, unknown>;
      const name = typeof jsonData.name === "string" ? jsonData.name : "";
      const price =
        typeof jsonData.offers === "object" && jsonData.offers !== null
          ? String((jsonData.offers as Record<string, unknown>).price ?? "")
          : "";
      if (name) products = [{ title: name, price }];
    } catch {
      // не JSON — ignore
    }
  }

  return {
    url,
    source_type: "ozon",
    collected_at: new Date().toISOString(),
    title,
    description: getMeta(html, "description"),
    products,
    raw_text: rawText,
    contacts_found: extractContacts(html),
  };
}

// ── WB collector (soft fetch) ─────────────────────────────────────────────

async function collectWbSnapshot(url: string): Promise<ArchitectSnapshot> {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(30_000),
    redirect: "follow",
  });
  const html = await res.text();
  const title = getTitle(html);
  const description = getMeta(html, "description");

  return {
    url,
    source_type: "wb",
    collected_at: new Date().toISOString(),
    title,
    description,
    raw_text: extractRawText(html, 3000),
    contacts_found: extractContacts(html),
  };
}

// ── Avito collector (soft fetch) ──────────────────────────────────────────

async function collectAvitoSnapshot(
  url: string,
  source_type: "avito-seller" | "avito-listing",
  avitoClientId?: string,
  avitoClientSecret?: string
): Promise<ArchitectSnapshot> {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(30_000),
    redirect: "follow",
  });
  const html = await res.text();

  const title = getTitle(html);
  const description = getMeta(html, "description");
  const rawText = extractRawText(html, 3000);

  // Для продавца пробуем извлечь название магазина из заголовка
  const seller_name =
    source_type === "avito-seller"
      ? (html.match(/class=["'][^"']*seller-title[^"']*["'][^>]*>([^<]{1,100})</i)?.[1]?.trim() ??
         title)
      : undefined;

  // Обогащаем данными Avito API (только если переданы credentials)
  let avitoApiData: ArchitectSnapshot["avito_api"] | undefined;
  if (
    source_type === "avito-seller" &&
    avitoClientId &&
    avitoClientSecret
  ) {
    avitoApiData = await enrichWithAvitoApi(
      url,
      avitoClientId,
      avitoClientSecret
    ).catch(() => undefined);
  }

  return {
    url,
    source_type,
    collected_at: new Date().toISOString(),
    title,
    description,
    seller_name,
    raw_text: rawText,
    contacts_found: extractContacts(html),
    avito_api: avitoApiData,
  };
}

// ── Main entry point ──────────────────────────────────────────────────────

export async function collectSnapshot(
  url: string,
  source_type: SourceType,
  options?: { avitoClientId?: string; avitoClientSecret?: string }
): Promise<ArchitectSnapshot> {
  switch (source_type) {
    case "ozon":
      return collectOzonSnapshot(url);
    case "wb":
      return collectWbSnapshot(url);
    case "avito-seller":
    case "avito-listing":
      return collectAvitoSnapshot(
        url,
        source_type,
        options?.avitoClientId,
        options?.avitoClientSecret
      );
    default:
      return collectWebsiteSnapshot(url);
  }
}
