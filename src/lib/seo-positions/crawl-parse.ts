/** Обход сайта: robots.txt, sitemap.xml и находки по страницам. Чистые функции, используются и в тестах. */

import { normalizeUrl, plural, THIN_WORDS } from "@/lib/seo-positions/pages";

export type RobotsRules = { allow: string[]; disallow: string[]; crawlDelay: number | null; sitemaps: string[] };

/** Правила для `User-agent: *`. Строки Sitemap — из всего файла. */
export function parseRobots(text: string): RobotsRules {
  const rules: RobotsRules = { allow: [], disallow: [], crawlDelay: null, sitemaps: [] };
  let agents: string[] = [];
  let inRules = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "sitemap") {
      if (value) rules.sitemaps.push(value);
      continue;
    }
    if (key === "user-agent") {
      if (inRules) agents = [];
      inRules = false;
      agents.push(value.toLowerCase());
      continue;
    }
    inRules = true;
    if (!agents.includes("*")) continue;
    if (key === "disallow" && value) rules.disallow.push(value);
    if (key === "allow" && value) rules.allow.push(value);
    if (key === "crawl-delay" && Number.isFinite(Number(value))) rules.crawlDelay = Number(value);
  }
  return rules;
}

function ruleMatches(rule: string, path: string): boolean {
  const anchored = rule.endsWith("$");
  const body = (anchored ? rule.slice(0, -1) : rule).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`).test(path);
}

/** Самое длинное совпавшее правило побеждает; при равной длине — Allow. */
export function isAllowed(pathWithQuery: string, rules: RobotsRules): boolean {
  let best = { len: -1, allow: true };
  for (const r of rules.disallow) if (ruleMatches(r, pathWithQuery) && r.length > best.len) best = { len: r.length, allow: false };
  for (const r of rules.allow) if (ruleMatches(r, pathWithQuery) && r.length >= best.len) best = { len: r.length, allow: true };
  return best.allow;
}

/** Адреса страниц и вложенные sitemap из XML. */
export function parseSitemap(xml: string): { urls: string[]; sitemaps: string[] } {
  const locs = (block: string) =>
    [...block.matchAll(/<loc>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/loc>/gi)].map((m) => m[1].trim().replace(/&amp;/g, "&"));
  const sitemaps = [...xml.matchAll(/<sitemap\b[\s\S]*?<\/sitemap>/gi)].flatMap((m) => locs(m[0]));
  const urls = [...xml.matchAll(/<url\b[\s\S]*?<\/url>/gi)].flatMap((m) => locs(m[0]));
  return { urls, sitemaps };
}

export const SKIP_EXT = /\.(jpe?g|png|webp|gif|svg|ico|pdf|zip|rar|docx?|xlsx?|pptx?|mp4|mp3|webm|css|js|xml|txt|gz)$/i;

export type CrawlPage = {
  url: string;
  inSitemap: boolean;
  statusCode: number | null;
  redirects: number;
  finalUrl: string | null;
  title: string | null;
  description: string | null;
  h1Count: number;
  canonical: string | null;
  noindex: boolean;
  metrika: boolean;
  gtm: boolean;
  words: number;
  isHtml: boolean;
  error: string | null;
};

export type FindingId =
  | "errors"
  | "redirect_chains"
  | "sitemap_redirects"
  | "no_title"
  | "dup_title"
  | "dup_description"
  | "no_h1"
  | "multi_h1"
  | "noindex_in_sitemap"
  | "canonical_other"
  | "no_metrika"
  | "metrika_gtm"
  | "thin";

export type Finding = { id: FindingId; title: string; count: number; urls: string[] };

const TITLES: Record<FindingId, string> = {
  errors: "Страницы с ошибкой или без ответа",
  redirect_chains: "Цепочки редиректов (два и больше перехода)",
  sitemap_redirects: "В sitemap адреса с редиректом",
  no_title: "Нет title",
  dup_title: "Одинаковый title на разных страницах",
  dup_description: "Одинаковый description на разных страницах",
  no_h1: "Нет H1",
  multi_h1: "Несколько H1 на странице",
  noindex_in_sitemap: "В sitemap, но закрыты от индексации (noindex)",
  canonical_other: "canonical указывает на другую страницу",
  no_metrika: "Нет счётчика Метрики в коде",
  metrika_gtm: "Метрики в коде нет, но есть Google Tag Manager — проверьте, подключена ли она через него",
  thin: `Мало текста (меньше ${THIN_WORDS} слов)`,
};

export const FINDING_ORDER = Object.keys(TITLES) as FindingId[];

export function findingTitle(id: FindingId) {
  return TITLES[id];
}

function duplicates(pages: CrawlPage[], key: (p: CrawlPage) => string | null): string[] {
  const groups = new Map<string, string[]>();
  for (const p of pages) {
    const k = key(p)?.trim().toLowerCase();
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), p.url]);
  }
  return [...groups.values()].filter((g) => g.length > 1).flat();
}

export function crawlFindings(pages: CrawlPage[]): Finding[] {
  const finalKey = (p: CrawlPage) => normalizeUrl(p.finalUrl ?? p.url);
  const seenFinal = new Set<string>();
  const ok = pages
    .filter((p) => !p.error && p.statusCode === 200 && p.isHtml)
    .sort((a, b) => a.redirects - b.redirects)
    .filter((p) => {
      const k = finalKey(p);
      if (seenFinal.has(k)) return false;
      seenFinal.add(k);
      return true;
    });
  const lists: Record<FindingId, string[]> = {
    errors: pages.filter((p) => p.error || (p.statusCode !== null && p.statusCode >= 400)).map((p) => p.url),
    redirect_chains: pages.filter((p) => p.redirects > 1).map((p) => p.url),
    sitemap_redirects: pages.filter((p) => p.inSitemap && p.redirects > 0).map((p) => p.url),
    no_title: ok.filter((p) => !p.title).map((p) => p.url),
    dup_title: duplicates(ok, (p) => p.title),
    dup_description: duplicates(ok, (p) => p.description),
    no_h1: ok.filter((p) => p.h1Count === 0).map((p) => p.url),
    multi_h1: ok.filter((p) => p.h1Count > 1).map((p) => p.url),
    noindex_in_sitemap: pages.filter((p) => p.inSitemap && p.noindex).map((p) => p.url),
    canonical_other: ok
      .filter((p) => p.canonical && normalizeUrl(p.canonical) !== normalizeUrl(p.finalUrl ?? p.url))
      .map((p) => p.url),
    no_metrika: ok.filter((p) => !p.metrika && !p.gtm).map((p) => p.url),
    metrika_gtm: ok.filter((p) => !p.metrika && p.gtm).map((p) => p.url),
    thin: ok.filter((p) => p.words < THIN_WORDS).map((p) => p.url),
  };
  return FINDING_ORDER.filter((id) => lists[id].length > 0).map((id) => ({
    id,
    title: TITLES[id],
    count: lists[id].length,
    urls: lists[id],
  }));
}

export function pagesLabel(n: number) {
  return `${n} ${plural(n, "страница", "страницы", "страниц")}`;
}
