import type { SeoKeyword, SeoProject, SeoSnapshot } from "@/lib/seo-positions/data";

export type KeywordRow = {
  keyword: SeoKeyword;
  last: SeoSnapshot | null;
  lastOk: SeoSnapshot | null;
  prevOk: SeoSnapshot | null;
  change: { kind: "up" | "down" | "same" | "appeared" | "dropped"; text: string } | null;
  best: number | null;
  history: SeoSnapshot[];
};

export function depthLabel(project: SeoProject) {
  return `топ-${project.maxPages * 10}`;
}

export function describeChange(prev: SeoSnapshot | null, last: SeoSnapshot | null, depth: string): KeywordRow["change"] {
  if (!prev || !last) return null;
  if (prev.position && last.position) {
    if (prev.position === last.position) return { kind: "same", text: "без изменений" };
    return prev.position > last.position
      ? { kind: "up", text: `поднялся с ${prev.position} на ${last.position}` }
      : { kind: "down", text: `опустился с ${prev.position} на ${last.position}` };
  }
  if (!prev.position && last.position) return { kind: "appeared", text: `появился в ${depth}: ${last.position}` };
  if (prev.position && !last.position) return { kind: "dropped", text: `выпал из ${depth}, было ${prev.position}` };
  return null;
}

export function buildKeywordRows(project: SeoProject, keywords: SeoKeyword[], snapshots: SeoSnapshot[]): KeywordRow[] {
  const byKeyword = new Map<string, SeoSnapshot[]>();
  for (const s of snapshots) {
    const list = byKeyword.get(s.keywordId) ?? [];
    list.push(s);
    byKeyword.set(s.keywordId, list);
  }
  const depth = depthLabel(project);

  return keywords.map((keyword) => {
    const history = byKeyword.get(keyword.id) ?? [];
    const ok = history.filter((s) => s.status !== "error");
    const lastOk = ok.at(-1) ?? null;
    const prevOk = ok.at(-2) ?? null;
    const positions = ok.map((s) => s.position).filter((p): p is number => p !== null);
    return {
      keyword,
      last: history.at(-1) ?? null,
      lastOk,
      prevOk,
      change: describeChange(prevOk, lastOk, depth),
      best: positions.length ? Math.min(...positions) : null,
      history,
    };
  });
}
