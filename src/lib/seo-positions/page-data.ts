import "server-only";

import { listKeywords, listNotes, listSnapshots, type SeoProject } from "@/lib/seo-positions/data";
import { getRuns } from "@/lib/seo-positions/runs";
import { buildKeywordRows } from "@/lib/seo-positions/view";

type SearchParams = Record<string, string | string[] | undefined>;

function one(sp: SearchParams, key: string) {
  const v = sp[key];
  return typeof v === "string" ? v : undefined;
}

export async function loadProjectPage(project: SeoProject, sp: SearchParams) {
  const daysParam = Number(one(sp, "days"));
  const days = [7, 30, 90].includes(daysParam) ? daysParam : 30;

  const [keywords, snapshots, notes, runs] = await Promise.all([
    listKeywords(project.id),
    listSnapshots(project.id, days),
    listNotes(project.id, days),
    getRuns(project.id),
  ]);
  return {
    days,
    notes,
    positionsRun: runs.positions,
    error: one(sp, "error")?.slice(0, 200) ?? null,
    selectedId: one(sp, "kw") ?? null,
    rows: buildKeywordRows(project, keywords, snapshots),
  };
}

export function publicBaseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || "https://konversus.ru").replace(/\/$/, "");
}
