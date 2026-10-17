/** Статистика Google Ads по дням: разбор выгрузки скрипта и сводка за период. Без обращения к базе. */

export type AdsSource = "google" | "yandex";

export const ADS_SOURCE_LABEL: Record<AdsSource, string> = { google: "Google Ads", yandex: "Яндекс Директ" };

export type AdsDay = {
  source: AdsSource;
  day: string;
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  hours: number[];
};

export type AdsPayload = { from: string; to: string; accountName: string | null; currency: string | null; rows: AdsDay[] };

export const MAX_SYNC_DAYS = 92;
const MAX_ROWS = 20_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function dayList(from: string, to: string): string[] {
  const out: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end && out.length <= 400; t += 86400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/** Дни месяца YYYY-MM, но не позже lastDay (обычно «вчера»: сегодняшних данных ещё нет). */
export function monthDays(month: string, lastDay: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const first = `${month}-01`;
  const to = end < lastDay ? end : lastDay;
  return first <= to ? dayList(first, to) : [];
}

function isDay(v: unknown): v is string {
  return typeof v === "string" && DAY_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

/** Проверяет выгрузку скрипта. Строка — текст ошибки для ответа скрипту. today — сегодня в UTC, YYYY-MM-DD. */
export function parseAdsPayload(body: unknown, today: string, source: AdsSource): AdsPayload | string {
  if (!body || typeof body !== "object") return "ожидается JSON";
  const b = body as Record<string, unknown>;
  if (!isDay(b.from) || !isDay(b.to) || b.from > b.to) return "from и to — даты YYYY-MM-DD, from не позже to";
  if (b.to > today) return "to в будущем";
  if (dayList(b.from, b.to).length > MAX_SYNC_DAYS) return `не больше ${MAX_SYNC_DAYS} дней за раз`;
  if (!Array.isArray(b.rows) || b.rows.length > MAX_ROWS) return `rows — массив до ${MAX_ROWS} строк`;

  const rows: AdsDay[] = [];
  for (const [i, raw] of b.rows.entries()) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const impressions = num(r.impressions);
    const clicks = num(r.clicks);
    const cost = num(r.cost);
    const conversions = num(r.conversions);
    if (!isDay(r.date) || r.date < b.from || r.date > b.to) return `rows[${i}].date вне периода`;
    if (typeof r.campaignId !== "string" && typeof r.campaignId !== "number") return `rows[${i}].campaignId`;
    if (impressions === null || clicks === null || cost === null || conversions === null) return `rows[${i}]: числа не меньше 0`;
    const hours = Array.isArray(r.hours) ? r.hours.filter((h): h is number => Number.isInteger(h) && h >= 0 && h <= 23) : [];
    rows.push({
      source,
      day: r.date,
      campaignId: String(r.campaignId).slice(0, 32),
      campaignName: (typeof r.campaignName === "string" ? r.campaignName : "").slice(0, 255) || String(r.campaignId),
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      cost: Math.round(cost * 100) / 100,
      conversions: Math.round(conversions * 100) / 100,
      hours: [...new Set(hours)].sort((x, y) => x - y),
    });
  }
  const str = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
  return { from: b.from, to: b.to, accountName: str(b.accountName, 255), currency: str(b.currency, 3), rows };
}

export type AdsState = "on" | "off" | "unknown";

/**
 * on — были показы; off — день есть в выгрузке, а показов нет; unknown — данных за день нет.
 * covered — дни, за которые прислали данные все подключённые источники.
 */
export function adsStates(days: string[], covered: Set<string>, rows: AdsDay[]): Map<string, AdsState> {
  const shown = new Set(rows.filter((r) => r.impressions > 0).map((r) => r.day));
  return new Map(days.map((d) => [d, shown.has(d) ? "on" : covered.has(d) ? "off" : "unknown"]));
}

/** «5–8 октября, 12 октября» для списка дней по возрастанию. */
export function formatPeriods(days: string[]): string {
  const fmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });
  const dayNo = (d: string) => Number(d.slice(8, 10));
  const runs: [string, string][] = [];
  for (const d of days) {
    const last = runs.at(-1);
    if (last && Date.parse(`${d}T00:00:00Z`) - Date.parse(`${last[1]}T00:00:00Z`) === 86400_000) last[1] = d;
    else runs.push([d, d]);
  }
  return runs
    .map(([a, b]) => {
      const end = fmt.format(new Date(`${b}T00:00:00Z`));
      if (a === b) return end;
      return a.slice(0, 7) === b.slice(0, 7) ? `${dayNo(a)}–${end}` : `${fmt.format(new Date(`${a}T00:00:00Z`))} – ${end}`;
    })
    .join(", ");
}

export type CampaignTotals = { source: AdsSource; id: string; name: string; days: number; impressions: number; clicks: number; cost: number; conversions: number };

export type AdsSummary = {
  states: Map<string, AdsState>;
  onDays: string[];
  offDays: string[];
  unknownDays: string[];
  totals: { impressions: number; clicks: number; cost: number; conversions: number };
  /** Часы, в которые показы шли хотя бы в половину дней с рекламой: [первый, последний]. */
  typicalHours: [number, number] | null;
  campaigns: CampaignTotals[];
};

export function summarizeAds(days: string[], covered: Set<string>, rows: AdsDay[]): AdsSummary {
  const inPeriod = rows.filter((r) => days.includes(r.day));
  const states = adsStates(days, covered, inPeriod);
  const pick = (s: AdsState) => days.filter((d) => states.get(d) === s);
  const onDays = pick("on");

  const totals = { impressions: 0, clicks: 0, cost: 0, conversions: 0 };
  const campaigns = new Map<string, CampaignTotals & { daySet: Set<string> }>();
  const hourDays = new Map<number, Set<string>>();
  for (const r of inPeriod) {
    totals.impressions += r.impressions;
    totals.clicks += r.clicks;
    totals.cost += r.cost;
    totals.conversions += r.conversions;
    const key = `${r.source}:${r.campaignId}`;
    const c = campaigns.get(key) ?? {
      source: r.source,
      id: r.campaignId,
      name: r.campaignName,
      days: 0,
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      daySet: new Set<string>(),
    };
    c.name = r.campaignName;
    c.impressions += r.impressions;
    c.clicks += r.clicks;
    c.cost += r.cost;
    c.conversions += r.conversions;
    if (r.impressions > 0) c.daySet.add(r.day);
    campaigns.set(key, c);
    for (const h of r.hours) hourDays.set(h, (hourDays.get(h) ?? new Set()).add(r.day));
  }
  totals.cost = Math.round(totals.cost * 100) / 100;
  totals.conversions = Math.round(totals.conversions * 100) / 100;

  const typical = [...hourDays.entries()].filter(([, s]) => s.size * 2 >= onDays.length && onDays.length > 0).map(([h]) => h);
  return {
    states,
    onDays,
    offDays: pick("off"),
    unknownDays: pick("unknown"),
    totals,
    typicalHours: typical.length ? [Math.min(...typical), Math.max(...typical)] : null,
    campaigns: [...campaigns.values()]
      .map(({ daySet, ...c }) => ({ ...c, days: daySet.size, cost: Math.round(c.cost * 100) / 100 }))
      .sort((a, b) => b.cost - a.cost || b.clicks - a.clicks),
  };
}
