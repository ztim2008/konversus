import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { RowDataPacket } from "mysql2";

import { getDbPool } from "@/lib/db";
import {
  crawlFindings,
  isAllowed,
  pagesLabel,
  parseRobots,
  parseSitemap,
  SKIP_EXT,
  type CrawlPage,
  type Finding,
  type RobotsRules,
} from "@/lib/seo-positions/crawl-parse";
import type { SeoProject } from "@/lib/seo-positions/data";
import { urlMatchesDomain } from "@/lib/seo-positions/domain";
import { fetchPage, fetchText, sleep, type FetchedPage } from "@/lib/seo-positions/page-check";
import { normalizeUrl, shortPath } from "@/lib/seo-positions/pages";
import type { RunProgress } from "@/lib/seo-positions/runs";

export const MAX_CRAWL_PAGES = 100;
const MAX_SITEMAP_FILES = 10;
const LINK_DEPTH = 2;

const hash = (url: string) => createHash("sha1").update(url).digest("hex");

function crawlable(url: string, domain: string, robots: RobotsRules): boolean {
  if (!urlMatchesDomain(url, domain)) return false;
  try {
    const u = new URL(url);
    return !SKIP_EXT.test(u.pathname) && isAllowed(u.pathname + u.search, robots);
  } catch {
    return false;
  }
}

async function sitemapUrls(domain: string, robots: RobotsRules): Promise<string[]> {
  const queue = robots.sitemaps.length ? [...robots.sitemaps] : [`https://${domain}/sitemap.xml`];
  const seen = new Set<string>();
  const urls: string[] = [];
  while (queue.length && seen.size < MAX_SITEMAP_FILES && urls.length < MAX_CRAWL_PAGES * 3) {
    const file = queue.shift()!;
    if (seen.has(file) || /\.gz$/i.test(file)) continue;
    seen.add(file);
    const xml = await fetchText(file, domain);
    if (!xml) continue;
    const parsed = parseSitemap(xml);
    queue.push(...parsed.sitemaps);
    urls.push(...parsed.urls);
  }
  return urls;
}

async function savePage(crawlId: string, p: CrawlPage) {
  const cut = (s: string | null | undefined, n: number) => (s ? s.slice(0, n) : null);
  await getDbPool().execute(
    `insert ignore into seo_crawl_pages (crawl_id, url_hash, url, in_sitemap, status_code, redirects, final_url, title, description,
       h1_count, canonical, noindex, metrika, gtm, words, is_html, error_text)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crawlId,
      hash(p.url),
      cut(p.url, 1000),
      p.inSitemap ? 1 : 0,
      p.statusCode,
      Math.min(p.redirects, 255),
      cut(p.finalUrl, 1000),
      cut(p.title, 500),
      cut(p.description, 1000),
      p.h1Count,
      cut(p.canonical, 1000),
      p.noindex ? 1 : 0,
      p.metrika ? 1 : 0,
      p.gtm ? 1 : 0,
      p.words,
      p.isHtml ? 1 : 0,
      cut(p.error, 300),
    ]
  );
}

function toCrawlPage(url: string, inSitemap: boolean, f: FetchedPage): CrawlPage {
  return {
    url,
    inSitemap,
    statusCode: f.statusCode,
    redirects: f.redirects,
    finalUrl: f.finalUrl,
    title: f.parsed?.title ?? null,
    description: f.parsed?.description ?? null,
    h1Count: f.parsed?.h1.length ?? 0,
    canonical: f.parsed?.canonical ?? null,
    noindex: f.noindex,
    metrika: f.parsed?.metrika ?? false,
    gtm: f.parsed?.gtm ?? false,
    words: f.parsed?.words ?? 0,
    isHtml: !!f.parsed,
    error: f.error,
  };
}

/** Обход до MAX_CRAWL_PAGES страниц: по sitemap, а если его нет — по ссылкам с главной на глубину LINK_DEPTH. */
export async function runCrawl(project: SeoProject, month: string, progress: RunProgress): Promise<string> {
  const domain = project.domain;
  await progress(0, 0, "Читаю robots.txt и sitemap");
  const robots = parseRobots((await fetchText(`https://${domain}/robots.txt`, domain, 500_000)) ?? "");
  const delay = Math.min(5000, Math.max(1000, (robots.crawlDelay ?? 0) * 1000));

  const seen = new Set<string>();
  const queue: { url: string; depth: number }[] = [];
  const enqueue = (url: string, depth: number) => {
    const key = normalizeUrl(url);
    if (seen.has(key) || !crawlable(url, domain, robots)) return;
    seen.add(key);
    queue.push({ url, depth });
  };
  for (const url of await sitemapUrls(domain, robots)) enqueue(url, 0);
  const sitemapSet = new Set(seen);
  const source = queue.length ? "sitemap" : "links";
  if (!queue.length) enqueue(`https://${domain}/`, 0);

  const crawlId = randomUUID();
  const pool = getDbPool();
  await pool.execute("delete from seo_crawls where project_id = ? and month = ?", [project.id, month]);
  await pool.execute(
    "insert into seo_crawls (id, project_id, month, started_at, pages_total, source) values (?, ?, ?, now(3), 0, ?)",
    [crawlId, project.id, month, source]
  );

  let done = 0;
  const pages: CrawlPage[] = [];
  while (queue.length && done < MAX_CRAWL_PAGES) {
    const { url, depth } = queue.shift()!;
    await progress(done, Math.min(MAX_CRAWL_PAGES, done + queue.length + 1), `Страница ${shortPath(url)}`);
    if (done > 0) await sleep(delay);
    const fetched = await fetchPage(url, domain);
    const page = toCrawlPage(url, sitemapSet.has(normalizeUrl(url)), fetched);
    pages.push(page);
    await savePage(crawlId, page);
    done++;
    if (source === "links" && depth < LINK_DEPTH && fetched.parsed) {
      for (const link of fetched.parsed.links) enqueue(link, depth + 1);
    }
  }
  await pool.execute("update seo_crawls set finished_at = now(3), pages_total = ? where id = ?", [done, crawlId]);
  await progress(done, done, "Готово");
  const issues = crawlFindings(pages).length;
  return `${pagesLabel(done)} ${source === "sitemap" ? "из sitemap.xml" : "по ссылкам"}, ${issues ? `типов замечаний: ${issues}` : "замечаний нет"}`;
}

type CrawlRow = RowDataPacket & { id: string; month: string; finished_at: Date | null; pages_total: number; source: string };
type PageRow = RowDataPacket & {
  url: string;
  in_sitemap: number;
  status_code: number | null;
  redirects: number;
  final_url: string | null;
  title: string | null;
  description: string | null;
  h1_count: number;
  canonical: string | null;
  noindex: number;
  metrika: number;
  gtm: number;
  words: number;
  is_html: number;
  error_text: string | null;
};

export type CrawlSummary = {
  month: string;
  finishedAt: Date | null;
  pagesTotal: number;
  source: "sitemap" | "links";
  findings: Finding[];
};

async function summarize(c: CrawlRow): Promise<CrawlSummary> {
  const [rows] = await getDbPool().query<PageRow[]>("select * from seo_crawl_pages where crawl_id = ?", [c.id]);
  const pages: CrawlPage[] = rows.map((r) => ({
    url: r.url,
    inSitemap: !!r.in_sitemap,
    statusCode: r.status_code,
    redirects: r.redirects,
    finalUrl: r.final_url,
    title: r.title,
    description: r.description,
    h1Count: r.h1_count,
    canonical: r.canonical,
    noindex: !!r.noindex,
    metrika: !!r.metrika,
    gtm: !!r.gtm,
    words: r.words,
    isHtml: !!r.is_html,
    error: r.error_text,
  }));
  return {
    month: c.month,
    finishedAt: c.finished_at,
    pagesTotal: c.finished_at ? c.pages_total : pages.length,
    source: c.source === "links" ? "links" : "sitemap",
    findings: crawlFindings(pages),
  };
}

/** Обход за месяц и последний законченный обход до него — для «было / стало». */
export async function loadCrawls(projectId: string, month: string): Promise<{ current: CrawlSummary | null; previous: CrawlSummary | null }> {
  const [rows] = await getDbPool().query<CrawlRow[]>(
    `select id, month, finished_at, pages_total, source from seo_crawls where project_id = ? and month <= ? order by month desc, started_at desc`,
    [projectId, month]
  );
  const cur = rows.find((r) => r.month === month);
  const prev = rows.find((r) => r.month < month && r.finished_at);
  return {
    current: cur ? await summarize(cur) : null,
    previous: prev ? await summarize(prev) : null,
  };
}
