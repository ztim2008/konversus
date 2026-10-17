import "server-only";

import { createHash } from "node:crypto";

import type { RowDataPacket } from "mysql2";

import { getDbPool } from "@/lib/db";
import { listKeywords, listSnapshotsBetween, type SeoProject } from "@/lib/seo-positions/data";
import { fetchPage, sleep, type FetchedPage } from "@/lib/seo-positions/page-check";
import { landingPages, normalizeUrl, plural, shortPath, type KeywordLanding } from "@/lib/seo-positions/pages";
import type { RunProgress } from "@/lib/seo-positions/runs";
import { monthRangeUtc, timeZoneFor } from "@/lib/seo-positions/tz";

export const MAX_CHECKED_PAGES = 10;

export type PageCheck = {
  url: string;
  checkedAt: Date;
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

type Row = RowDataPacket & {
  url: string;
  checked_at: Date;
  status_code: number | null;
  final_url: string | null;
  title: string | null;
  description: string | null;
  h1: string | null;
  h1_count: number;
  canonical: string | null;
  noindex: number;
  words: number;
  metrika: number;
  error_text: string | null;
};

const hash = (url: string) => createHash("sha1").update(url).digest("hex");

export async function listPageChecks(projectId: string, month: string): Promise<Map<string, PageCheck>> {
  const [rows] = await getDbPool().query<Row[]>("select * from seo_page_checks where project_id = ? and month = ?", [projectId, month]);
  return new Map(
    rows.map((r) => [
      r.url,
      {
        url: r.url,
        checkedAt: r.checked_at,
        statusCode: r.status_code,
        finalUrl: r.final_url,
        title: r.title,
        description: r.description,
        h1: r.h1,
        h1Count: r.h1_count,
        canonical: r.canonical,
        noindex: !!r.noindex,
        words: r.words,
        metrika: !!r.metrika,
        error: r.error_text,
      },
    ])
  );
}

async function savePageCheck(projectId: string, month: string, url: string, p: FetchedPage) {
  const cut = (s: string | null | undefined, n: number) => (s ? s.slice(0, n) : null);
  await getDbPool().execute(
    `insert into seo_page_checks (project_id, month, url_hash, url, checked_at, status_code, final_url, title, description, h1, h1_count,
       canonical, noindex, words, metrika, error_text)
     values (?, ?, ?, ?, now(3), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     on duplicate key update checked_at = now(3), status_code = values(status_code), final_url = values(final_url), title = values(title),
       description = values(description), h1 = values(h1), h1_count = values(h1_count), canonical = values(canonical),
       noindex = values(noindex), words = values(words), metrika = values(metrika), error_text = values(error_text)`,
    [
      projectId,
      month,
      hash(url),
      cut(url, 1000),
      p.statusCode,
      cut(p.finalUrl, 1000),
      cut(p.parsed?.title, 500),
      cut(p.parsed?.description, 1000),
      cut(p.parsed?.h1[0], 500),
      p.parsed?.h1.length ?? 0,
      cut(p.parsed?.canonical, 1000),
      p.noindex ? 1 : 0,
      p.parsed?.words ?? 0,
      p.parsed?.metrika ? 1 : 0,
      cut(p.error, 300),
    ]
  );
}

/** Запросы и какие страницы Google показывал по ним за месяц. */
export async function loadLandings(project: SeoProject, month: string): Promise<KeywordLanding[]> {
  const { from, to } = monthRangeUtc(month, project.gl);
  const [keywords, snapshots] = await Promise.all([
    listKeywords(project.id),
    listSnapshotsBetween(project.id, from, to),
  ]);
  return landingPages(keywords, snapshots, timeZoneFor(project.gl));
}

/** Главная, страницы из выдачи и целевые — не больше MAX_CHECKED_PAGES, в порядке важности. */
export function pagesToCheck(project: SeoProject, landings: KeywordLanding[]): string[] {
  const urls = [normalizeUrl(`https://${project.domain}/`)];
  const add = (u: string | null | undefined) => {
    if (u && !urls.includes(u)) urls.push(u);
  };
  for (const l of landings) add(l.targetUrl);
  for (const l of landings) add(l.main?.url);
  for (const l of landings) for (const o of l.others) add(o.url);
  return urls.slice(0, MAX_CHECKED_PAGES);
}

export async function checkLandingPages(project: SeoProject, month: string, progress: RunProgress): Promise<string> {
  await progress(0, 0, "Собираю страницы из выдачи за месяц");
  const urls = pagesToCheck(project, await loadLandings(project, month));
  let failed = 0;
  for (const [i, url] of urls.entries()) {
    await progress(i, urls.length, `Страница ${shortPath(url)}`);
    if (i > 0) await sleep(1000);
    const fetched = await fetchPage(url, project.domain);
    if (fetched.error || fetched.statusCode !== 200) failed++;
    await savePageCheck(project.id, month, url, fetched);
  }
  await progress(urls.length, urls.length, "Готово");
  await getDbPool().query("delete from seo_page_checks where project_id = ? and month = ? and url_hash not in (?)", [
    project.id,
    month,
    urls.map(hash),
  ]);
  const checked = `${urls.length} ${plural(urls.length, "страница проверена", "страницы проверены", "страниц проверено")}`;
  return failed ? `${checked}, не открылись: ${failed}` : checked;
}
