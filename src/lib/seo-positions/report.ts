import type { SeoKeyword, SeoNote, SeoSnapshot } from "@/lib/seo-positions/data";

/** Место для расчётов: «нет в выдаче» — бесконечность, чтобы медиана и сравнение работали без выдуманного числа. */
type Rank = number;

export type ReportKeyword = {
  keyword: string;
  start: Rank | null;
  end: Rank | null;
  delta: number | null;
  checks: number;
};

export type Bucket = { label: string; start: number; end: number };

export type CompetitorMove = { host: string; start: number; end: number };

export type MonthReport = {
  keywords: ReportKeyword[];
  buckets: Bucket[];
  grew: ReportKeyword[];
  fell: ReportKeyword[];
  same: ReportKeyword[];
  noData: ReportKeyword[];
  competitors: CompetitorMove[];
  notes: SeoNote[];
  checkDays: number;
  summary: string;
};

const SAMPLE = 3;
/** Сдвиг на 1–2 места — обычные колебания Google, в отчёте это «без изменений». */
export const NOISE = 2;

function rankOf(s: SeoSnapshot): Rank {
  return s.status === "found" && s.position ? s.position : Infinity;
}

export function median(values: Rank[]): Rank | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  const a = sorted[mid - 1];
  const b = sorted[mid];
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((a + b) / 2) : Math.max(a, b);
}

export function rankLabel(rank: Rank | null, depth: number) {
  if (rank === null) return "нет данных";
  return Number.isFinite(rank) ? String(rank) : `нет в топ-${depth}`;
}

function bucketIndex(rank: Rank, depth: number) {
  if (!Number.isFinite(rank)) return 4;
  if (rank <= 3) return 0;
  if (rank <= 10) return 1;
  if (rank <= 30) return 2;
  return rank <= depth ? 3 : 4;
}

/**
 * snapshots — снимки за месяц и до 7 дней до него (для базы, если в начале месяца проверок не было).
 * from/to — границы месяца в UTC.
 */
export function buildMonthReport(input: {
  keywords: SeoKeyword[];
  snapshots: SeoSnapshot[];
  notes: SeoNote[];
  from: Date;
  to: Date;
  depth: number;
  ownDomain: string;
  monthPrep: string;
  timeZone: string;
}): MonthReport {
  const { from, to, depth } = input;
  const inMonth = (s: SeoSnapshot) => {
    const t = new Date(s.checkedAt).getTime();
    return t >= from.getTime() && t < to.getTime();
  };
  const ok = input.snapshots.filter((s) => s.status !== "error");

  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: input.timeZone });
  const checkDays = new Set(ok.filter(inMonth).map((s) => dayFmt.format(new Date(s.checkedAt)))).size;

  const hostStart = new Map<string, number>();
  const hostEnd = new Map<string, number>();
  const isOwn = (host: string) => host === input.ownDomain || host.endsWith(`.${input.ownDomain}`);

  const keywords: ReportKeyword[] = input.keywords.map((k) => {
    const all = ok.filter((s) => s.keywordId === k.id);
    const month = all.filter(inMonth);
    const before = all.filter((s) => new Date(s.checkedAt).getTime() < from.getTime());
    // Начало и конец не пересекаются: при 4 проверках — по 2, при 1 проверке начало берётся из последней до месяца.
    const sample = Math.min(SAMPLE, Math.floor(month.length / 2));
    const startSet = sample > 0 ? month.slice(0, sample) : before.slice(-1);
    const endSet = sample > 0 ? month.slice(-sample) : month.slice(-1);

    const firstTop = startSet[0]?.top ?? [];
    const lastTop = month.at(-1)?.top ?? [];
    for (const t of firstTop) if (!isOwn(t.host)) hostStart.set(t.host, (hostStart.get(t.host) ?? 0) + 1);
    for (const t of lastTop) if (!isOwn(t.host)) hostEnd.set(t.host, (hostEnd.get(t.host) ?? 0) + 1);

    const start = median(startSet.map(rankOf));
    const end = median(endSet.map(rankOf));
    const startDay = startSet.length ? dayFmt.format(new Date(startSet.at(-1)!.checkedAt)) : null;
    const endDay = endSet.length ? dayFmt.format(new Date(endSet[0].checkedAt)) : null;
    let delta: number | null = null;
    if (start !== null && end !== null && startDay && endDay && startDay < endDay) {
      if (Number.isFinite(start) && Number.isFinite(end)) delta = start - end;
      else if (Number.isFinite(end)) delta = depth + 1 - end;
      else if (Number.isFinite(start)) delta = -(depth + 1 - start);
      else delta = 0;
      if (Math.abs(delta) <= NOISE) delta = 0;
    }
    return { keyword: k.keyword, start, end, delta, checks: month.length };
  });

  const labels = ["1–3", "4–10", "11–30", `31–${depth}`, `нет в топ-${depth}`];
  const buckets: Bucket[] = labels.map((label) => ({ label, start: 0, end: 0 }));
  for (const k of keywords) {
    if (k.start !== null) buckets[bucketIndex(k.start, depth)].start++;
    if (k.end !== null) buckets[bucketIndex(k.end, depth)].end++;
  }

  const withDelta = keywords.filter((k) => k.delta !== null);
  const grew = withDelta.filter((k) => k.delta! > 0).sort((a, b) => b.delta! - a.delta!);
  const fell = withDelta.filter((k) => k.delta! < 0).sort((a, b) => a.delta! - b.delta!);
  const same = withDelta.filter((k) => k.delta === 0);
  const noData = keywords.filter((k) => k.delta === null);

  const hosts = new Set([...hostStart.keys(), ...hostEnd.keys()]);
  const competitors = [...hosts]
    .map((host) => ({ host, start: hostStart.get(host) ?? 0, end: hostEnd.get(host) ?? 0 }))
    .sort((a, b) => b.end - a.end || b.start - a.start)
    .slice(0, 10);

  const top10Start = buckets[0].start + buckets[1].start;
  const top10End = buckets[0].end + buckets[1].end;
  const parts = [`В ${input.monthPrep}: выросли ${grew.length} из ${withDelta.length} запросов, упали ${fell.length}`];
  parts.push(`в первой десятке ${top10Start} → ${top10End}`);
  const best = grew[0];
  if (best) parts.push(`лучший рост — «${best.keyword}»: ${rankLabel(best.start, depth)} → ${rankLabel(best.end, depth)}`);
  const summary = withDelta.length ? `${parts.join(", ")}.` : "За этот месяц проверок пока мало для выводов.";

  return { keywords, buckets, grew, fell, same, noData, competitors, notes: input.notes, checkDays, summary };
}
