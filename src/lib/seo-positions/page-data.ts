import "server-only";

import { isSerperPaused, listKeywords, listNotes, listSnapshots, type SeoProject } from "@/lib/seo-positions/data";
import { loadAdsData } from "@/lib/seo-positions/ads";
import { adsStates, dayList } from "@/lib/seo-positions/ads-summary";
import { getRuns } from "@/lib/seo-positions/runs";
import { localDayAgo } from "@/lib/seo-positions/tz";
import { buildKeywordRows } from "@/lib/seo-positions/view";

type SearchParams = Record<string, string | string[] | undefined>;

function one(sp: SearchParams, key: string) {
  const v = sp[key];
  return typeof v === "string" ? v : undefined;
}

export async function loadProjectPage(project: SeoProject, sp: SearchParams) {
  const daysParam = Number(one(sp, "days"));
  const days = [7, 30, 90].includes(daysParam) ? daysParam : 30;

  const adsDays = dayList(localDayAgo(project.gl, days), localDayAgo(project.gl, 0));
  const [keywords, snapshots, notes, runs, ads, serperPaused] = await Promise.all([
    listKeywords(project.id),
    listSnapshots(project.id, days),
    listNotes(project.id, days),
    getRuns(project.id),
    loadAdsData(project.id, adsDays[0], adsDays.at(-1)!),
    isSerperPaused(),
  ]);
  /** День → «шла / стояла» только для дней, по которым есть данные; null — реклама не подключена. */
  const adsByDay = ads.links.some((l) => l.syncedAt)
    ? Object.fromEntries([...adsStates(adsDays, ads.covered, ads.rows)].filter(([, s]) => s !== "unknown"))
    : null;
  return {
    days,
    notes,
    serperPaused,
    adsByDay: adsByDay as Record<string, "on" | "off"> | null,
    positionsRun: runs.positions,
    error: one(sp, "error")?.slice(0, 200) ?? null,
    selectedId: one(sp, "kw") ?? null,
    rows: buildKeywordRows(project, keywords, snapshots),
  };
}

export function publicBaseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || "https://konversus.ru").replace(/\/$/, "");
}
