import type { SeoKeyword, SeoSnapshot } from "@/lib/seo-positions/data";

/** Адрес без протокола-шума: хост без www в нижнем регистре, путь без завершающего слэша, без якоря и utm. */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "") || "/";
    const params = [...u.searchParams].filter(([k]) => !/^utm_|^gclid$|^yclid$/i.test(k));
    const query = params.length ? `?${new URLSearchParams(params).toString()}` : "";
    return `https://${host}${path}${query}`;
  } catch {
    return raw.trim();
  }
}

export function shortPath(url: string): string {
  try {
    const u = new URL(url);
    const p = decodeURIComponent(u.pathname + u.search);
    return p === "/" ? "главная" : p;
  } catch {
    return url;
  }
}

/** Для «перейти на …», «лучше …»: главная — в винительном падеже. */
export function pathAcc(url: string): string {
  const p = shortPath(url);
  return p === "главная" ? "главную" : p;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export type PageStat = { url: string; days: number; best: number; last: number; lastAt: string };

export type KeywordLanding = {
  keywordId: string;
  keyword: string;
  targetUrl: string | null;
  main: PageStat | null;
  others: PageStat[];
};

function localDay(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** Какие страницы сайта Google показывал по каждому запросу. Основная — показанная в большее число дней, при равенстве — последняя. */
export function landingPages(keywords: SeoKeyword[], snapshots: SeoSnapshot[], timeZone: string): KeywordLanding[] {
  const byKeyword = new Map<string, Map<string, { days: Set<string>; best: number; last: number; lastAt: string }>>();
  for (const s of snapshots) {
    if (s.status !== "found" || !s.matchedUrl || s.position === null) continue;
    const url = normalizeUrl(s.matchedUrl);
    const pages = byKeyword.get(s.keywordId) ?? new Map();
    byKeyword.set(s.keywordId, pages);
    const stat = pages.get(url) ?? { days: new Set<string>(), best: Infinity, last: s.position, lastAt: s.checkedAt };
    stat.days.add(localDay(s.checkedAt, timeZone));
    stat.best = Math.min(stat.best, s.position);
    if (s.checkedAt >= stat.lastAt) {
      stat.last = s.position;
      stat.lastAt = s.checkedAt;
    }
    pages.set(url, stat);
  }

  return keywords.map((k) => {
    const stats: PageStat[] = [...(byKeyword.get(k.id)?.entries() ?? [])].map(([url, s]) => ({
      url,
      days: s.days.size,
      best: s.best,
      last: s.last,
      lastAt: s.lastAt,
    }));
    stats.sort((a, b) => b.days - a.days || b.lastAt.localeCompare(a.lastAt));
    return {
      keywordId: k.id,
      keyword: k.keyword,
      targetUrl: k.targetUrl ? normalizeUrl(k.targetUrl) : null,
      main: stats[0] ?? null,
      others: stats.slice(1),
    };
  });
}

export type Cannibalization = { keywordId: string; keyword: string; pages: PageStat[]; strengthen: string; advice: string };

/** Несколько страниц сайта по одному запросу за период. Усиливать целевую, если она назначена, иначе — с лучшей позицией. */
export function findCannibalization(landings: KeywordLanding[]): Cannibalization[] {
  const out: Cannibalization[] = [];
  for (const l of landings) {
    if (!l.main || l.others.length === 0) continue;
    const pages = [l.main, ...l.others].sort((a, b) => a.best - b.best);
    const strengthen = l.targetUrl ?? pages[0].url;
    const rest = pages.filter((p) => p.url !== strengthen).map((p) => shortPath(p.url));
    const advice = l.targetUrl
      ? `Назначена целевая страница ${shortPath(strengthen)}. Остальные (${rest.join(", ")}) развести по смыслу: убрать из них прямые формулировки запроса и поставить ссылку на целевую.`
      : `Выбрать одну страницу под запрос — лучше ${pathAcc(strengthen)}, у неё лучшая позиция. На остальных (${rest.join(", ")}) убрать прямые формулировки запроса и поставить ссылку на выбранную.`;
    out.push({ keywordId: l.keywordId, keyword: l.keyword, pages, strengthen, advice });
  }
  return out;
}

export const MAX_AUDIT_PAGES = 5;

/**
 * Страницы чек-листа кроме главной (главная — page_url ''): уже оценённые, затем целевые, затем основные из выдачи.
 * Вместе с главной не больше MAX_AUDIT_PAGES.
 */
export function auditPageUrls(domain: string, landings: KeywordLanding[], existing: string[] = []): string[] {
  const home = normalizeUrl(`https://${domain}/`);
  const out: string[] = [];
  const add = (u: string | null | undefined) => {
    if (!u) return;
    const n = normalizeUrl(u);
    if (n !== home && !out.includes(n)) out.push(n);
  };
  existing.forEach(add);
  landings.forEach((l) => add(l.targetUrl));
  landings.forEach((l) => add(l.main?.url));
  return out.slice(0, MAX_AUDIT_PAGES - 1);
}

/** Целевая страница назначена, а Google показывает по запросу другую. */
export function targetMismatch(l: KeywordLanding): boolean {
  return !!l.targetUrl && !!l.main && l.main.url !== l.targetUrl;
}

export type PageFacts = {
  url: string;
  statusCode: number | null;
  finalUrl: string | null;
  title: string | null;
  description: string | null;
  h1: string | null;
  h1Count: number;
  canonical: string | null;
  noindex: boolean;
  words: number;
  metrika: boolean;
  error: string | null;
};

export const THIN_WORDS = 150;

/** Технические замечания по странице, без привязки к запросу. */
export function pageIssues(p: PageFacts): string[] {
  if (p.error) return [p.error];
  const out: string[] = [];
  if (p.statusCode !== 200) out.push(`Ответ сервера ${p.statusCode ?? "—"}`);
  const final = p.finalUrl ? normalizeUrl(p.finalUrl) : null;
  if (final && final !== normalizeUrl(p.url)) out.push(`Редирект на ${pathAcc(final)}`);
  if (p.noindex) out.push("Закрыта от индексации (noindex)");
  if (p.canonical && normalizeUrl(p.canonical) !== (final ?? normalizeUrl(p.url))) out.push(`canonical указывает на ${pathAcc(p.canonical)}`);
  if (p.statusCode === 200) {
    if (!p.title) out.push("Нет title");
    else if (p.title.length > 70) out.push(`title длинный: ${p.title.length} ${plural(p.title.length, "символ", "символа", "символов")}, Google обрежет`);
    if (!p.description) out.push("Нет description");
    if (p.h1Count === 0) out.push("Нет H1");
    if (p.h1Count > 1) out.push(`H1 на странице: ${p.h1Count}`);
    if (p.words < THIN_WORDS) out.push(`Мало текста: ${p.words} ${plural(p.words, "слово", "слова", "слов")}`);
    if (!p.metrika) out.push("Метрики в коде страницы нет");
  }
  return out;
}

/** Замечания «под запрос»: есть ли слова запроса в title и H1. */
export function queryIssues(query: string, p: PageFacts): string[] {
  if (p.error || p.statusCode !== 200) return [];
  const out: string[] = [];
  const t = queryMatch(query, p.title);
  const h = queryMatch(query, p.h1);
  if (t === "none") out.push("Запроса нет в title");
  if (t === "partial") out.push("В title не все слова запроса");
  if (p.h1 && h === "none") out.push("Запроса нет в H1");
  if (p.h1 && h === "partial") out.push("В H1 не все слова запроса");
  return out;
}

const STOP = new Set(["для", "под", "все", "как", "что", "это", "или", "the", "and", "без", "при", "над", "про"]);

export function stems(text: string): Set<string> {
  const words = text.toLowerCase().replace(/ё/g, "е").match(/[\p{L}\p{N}]+/gu) ?? [];
  return new Set(words.filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => w.slice(0, 5)));
}

export type MatchLevel = "full" | "partial" | "none";

/** Есть ли слова запроса в тексте — по основам (первые 5 букв), чтобы «Ташкенте» совпало с «Ташкент». */
export function queryMatch(query: string, text: string | null | undefined): MatchLevel {
  const q = stems(query);
  if (!q.size || !text) return "none";
  const t = stems(text);
  let hit = 0;
  for (const s of q) if (t.has(s)) hit++;
  return hit === q.size ? "full" : hit > 0 ? "partial" : "none";
}
