/** Search Console: чистая логика без сети и базы. */

export type GscSite = { siteUrl: string; permissionLevel: string };

export type GscRow = { day: string; query: string; clicks: number; impressions: number; position: number };

export type GscQueryTotals = { query: string; clicks: number; impressions: number; position: number | null; days: number };

/** ISO-код страны для фильтра Search Console по `gl` проекта. Нет в списке — без фильтра. */
const COUNTRY: Record<string, { code: string; label: string }> = {
  uz: { code: "uzb", label: "Узбекистан" },
  ru: { code: "rus", label: "Россия" },
  kz: { code: "kaz", label: "Казахстан" },
  by: { code: "blr", label: "Беларусь" },
  kg: { code: "kgz", label: "Киргизия" },
  tj: { code: "tjk", label: "Таджикистан" },
  am: { code: "arm", label: "Армения" },
  az: { code: "aze", label: "Азербайджан" },
  ge: { code: "geo", label: "Грузия" },
  tr: { code: "tur", label: "Турция" },
};

export function gscCountry(gl: string): { code: string; label: string } | null {
  return COUNTRY[gl.toLowerCase()] ?? null;
}

function bareHost(domain: string) {
  return domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
}

/**
 * Ресурс Search Console под домен проекта: сначала доменный (`sc-domain:`), потом https, потом http.
 * Доменный ресурс родительского домена тоже подходит. Неподтверждённые ресурсы пропускаются.
 */
export function pickSite(domain: string, sites: GscSite[]): string | null {
  const host = bareHost(domain);
  const usable = sites.filter((s) => s.permissionLevel !== "siteUnverifiedUser");
  const rank = (s: GscSite): number => {
    const url = s.siteUrl.toLowerCase();
    if (url.startsWith("sc-domain:")) {
      const d = url.slice("sc-domain:".length);
      if (d === host) return 1;
      if (host.endsWith(`.${d}`)) return 2;
      return 0;
    }
    const m = url.match(/^(https?):\/\/([^/]+)\/?$/);
    if (!m || bareHost(m[2]) !== host) return 0;
    return m[1] === "https" ? 3 : 4;
  };
  const best = usable.map((s) => ({ s, r: rank(s) })).filter((x) => x.r > 0).sort((a, b) => a.r - b.r)[0];
  return best?.s.siteUrl ?? null;
}

/** Для сравнения запроса проекта с запросом из Search Console. */
export function normalizeQuery(q: string) {
  return q.toLowerCase().replace(/ё/g, "е").replace(/[«»"'`]/g, "").replace(/\s+/g, " ").trim();
}

/** Итоги по запросам за период. Средняя позиция взвешена по показам — так же считает Search Console. */
export function totalsByQuery(rows: GscRow[]): Map<string, GscQueryTotals> {
  const acc = new Map<string, { query: string; clicks: number; impressions: number; weighted: number; days: Set<string> }>();
  for (const r of rows) {
    const key = normalizeQuery(r.query);
    const a = acc.get(key) ?? { query: r.query, clicks: 0, impressions: 0, weighted: 0, days: new Set<string>() };
    a.clicks += r.clicks;
    a.impressions += r.impressions;
    a.weighted += r.position * r.impressions;
    a.days.add(r.day);
    acc.set(key, a);
  }
  const out = new Map<string, GscQueryTotals>();
  for (const [key, a] of acc) {
    out.set(key, {
      query: a.query,
      clicks: a.clicks,
      impressions: a.impressions,
      position: a.impressions > 0 ? Math.round((a.weighted / a.impressions) * 10) / 10 : null,
      days: a.days.size,
    });
  }
  return out;
}

/** Средняя позиция запроса по дням (для графика). */
export function dailyPositions(rows: GscRow[], query: string): Map<string, number> {
  const key = normalizeQuery(query);
  const byDay = new Map<string, { impressions: number; weighted: number }>();
  for (const r of rows) {
    if (normalizeQuery(r.query) !== key) continue;
    const d = byDay.get(r.day) ?? { impressions: 0, weighted: 0 };
    d.impressions += r.impressions;
    d.weighted += r.position * r.impressions;
    byDay.set(r.day, d);
  }
  const out = new Map<string, number>();
  for (const [day, d] of byDay) if (d.impressions > 0) out.set(day, Math.round((d.weighted / d.impressions) * 10) / 10);
  return out;
}

type ApiRow = { keys?: unknown[]; clicks?: unknown; impressions?: unknown; position?: unknown };

/** Строки ответа searchAnalytics.query с измерениями [date, query]. */
export function parseApiRows(rows: unknown): GscRow[] {
  if (!Array.isArray(rows)) return [];
  const out: GscRow[] = [];
  for (const raw of rows as ApiRow[]) {
    const [day, query] = Array.isArray(raw?.keys) ? raw.keys : [];
    if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day) || typeof query !== "string" || !query.trim()) continue;
    const position = Number(raw.position);
    out.push({
      day,
      query: query.trim().slice(0, 400),
      clicks: Math.max(0, Math.round(Number(raw.clicks) || 0)),
      impressions: Math.max(0, Math.round(Number(raw.impressions) || 0)),
      position: Number.isFinite(position) && position > 0 ? position : 0,
    });
  }
  return out;
}
