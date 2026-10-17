import "server-only";

import { hostOf, urlMatchesDomain } from "@/lib/seo-positions/domain";
import {
  claimKeyword,
  creditsUsedSince,
  insertSnapshot,
  lastOkStatus,
  listDueKeywords,
  listKeywords,
  releaseKeyword,
  type SeoKeyword,
  type SeoProject,
  type TopItem,
} from "@/lib/seo-positions/data";
import { plural } from "@/lib/seo-positions/pages";
import { UserFacingError, type RunProgress } from "@/lib/seo-positions/runs";

/** Потолок кредитов Serper за 24 часа на весь модуль. Проверка не стартует, если он исчерпан. */
export function getDailyCreditCap(): number {
  const n = Number(process.env.SEO_POSITIONS_DAILY_CREDIT_CAP);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 300;
}

type SerperPage = { organic: { title: string; link: string }[]; credits: number };

async function fetchSerperPage(project: SeoProject, keyword: string, page: number): Promise<SerperPage> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) throw new Error("SERPER_API_KEY не задан");

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: keyword, gl: project.gl, hl: project.hl, location: project.location, page }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => ({}))) as {
    organic?: { title?: string; link?: string }[];
    credits?: number;
    message?: string;
  };
  if (!res.ok) throw new Error(data.message || `Serper HTTP ${res.status}`);

  return {
    organic: (data.organic ?? [])
      .filter((o) => o.link && o.title)
      .map((o) => ({ title: String(o.title), link: String(o.link) })),
    credits: typeof data.credits === "number" ? data.credits : 1,
  };
}

type ScanResult = { match: { position: number; page: number; url: string } | null; depth: number; credits: number; top: TopItem[] };

/** Листает выдачу по 10, пока не найдёт домен или не дойдёт до max_pages. Позиция — сквозной номер среди органики. */
async function scan(project: SeoProject, keyword: SeoKeyword, acc: { credits: number }): Promise<ScanResult> {
  let depth = 0;
  let top: TopItem[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= project.maxPages; page++) {
    const result = await fetchSerperPage(project, keyword.keyword, page);
    acc.credits += result.credits;
    if (result.organic.length === 0) break;

    // Страницы — отдельные запросы, Google между ними может повторить результат с прошлой страницы.
    const fresh = result.organic.filter((o) => !seen.has(o.link));
    fresh.forEach((o) => seen.add(o.link));
    const items = fresh.map((o, i) => ({
      position: depth + i + 1,
      host: hostOf(o.link) ?? "",
      url: o.link,
      title: o.title.slice(0, 200),
    }));
    if (page === 1) top = items.slice(0, 10);

    const match = items.find((it) => urlMatchesDomain(it.url, project.domain));
    depth += items.length;
    if (match) return { match: { position: match.position, page, url: match.url }, depth, credits: acc.credits, top };
  }
  return { match: null, depth, credits: acc.credits, top };
}

export async function checkKeyword(project: SeoProject, keyword: SeoKeyword): Promise<"done" | "busy" | { error: string }> {
  if (!(await claimKeyword(keyword.id))) return "busy";

  const acc = { credits: 0 };
  let lastError: string | null = null;
  let depth = 0;
  let top: TopItem[] = [];
  try {
    let result = await scan(project, keyword, acc);
    // Сайт мог проскочить между страницами, пока Google перетасовал выдачу. «Выпал» подтверждаем вторым проходом.
    if (!result.match && (await lastOkStatus(keyword.id)) === "found") {
      const retry = await scan(project, keyword, acc);
      if (retry.match) result = retry;
    }
    depth = result.depth;
    top = result.top;
    const credits = acc.credits;

    if (result.match) {
      await insertSnapshot({
        keywordId: keyword.id,
        status: "found",
        position: result.match.position,
        page: result.match.page,
        matchedUrl: result.match.url,
        depth,
        credits,
        top,
        errorText: null,
      });
      return "done";
    }
    await insertSnapshot({
      keywordId: keyword.id,
      status: "not_found",
      position: null,
      page: null,
      matchedUrl: null,
      depth,
      credits,
      top,
      errorText: null,
    });
  } catch (err) {
    await insertSnapshot({
      keywordId: keyword.id,
      status: "error",
      position: null,
      page: null,
      matchedUrl: null,
      depth,
      credits: acc.credits,
      top,
      errorText: err instanceof Error ? err.message : String(err),
    });
    lastError = err instanceof Error ? err.message : String(err);
  } finally {
    await releaseKeyword(keyword.id);
  }
  return lastError ? { error: lastError } : "done";
}

export type RunResult = { checked: number; skippedBusy: number; stoppedByCap: boolean; creditsBefore: number; errors: number; lastError: string | null };

async function runQueue(
  items: { project: SeoProject; keyword: SeoKeyword }[],
  onItem?: (index: number, total: number, keyword: SeoKeyword) => Promise<void>
): Promise<RunResult> {
  const cap = getDailyCreditCap();
  const creditsBefore = await creditsUsedSince(24);
  const result: RunResult = { checked: 0, skippedBusy: 0, stoppedByCap: false, creditsBefore, errors: 0, lastError: null };

  for (const [i, { project, keyword }] of items.entries()) {
    await onItem?.(i, items.length, keyword);
    if ((await creditsUsedSince(24)) + project.maxPages * 2 > cap) {
      result.stoppedByCap = true;
      break;
    }
    const status = await checkKeyword(project, keyword);
    if (status === "busy") result.skippedBusy++;
    else result.checked++;
    if (typeof status === "object") {
      result.errors++;
      result.lastError = status.error;
    }
  }
  return result;
}

export async function checkProjectNow(project: SeoProject, keywordId: string | undefined, progress: RunProgress): Promise<string> {
  const keywords = (await listKeywords(project.id)).filter(
    (k) => k.isActive && (!keywordId || k.id === keywordId)
  );
  const result = await runQueue(
    keywords.map((keyword) => ({ project, keyword })),
    (i, total, keyword) => progress(i, total, `Запрос «${keyword.keyword}»`)
  );
  await progress(keywords.length, keywords.length, "Готово");
  const credits = (await creditsUsedSince(24)) - result.creditsBefore;
  const parts = [`${result.checked} ${plural(result.checked, "запрос проверен", "запроса проверено", "запросов проверено")}`];
  if (result.skippedBusy) parts.push(`уже проверялись: ${result.skippedBusy}`);
  parts.push(`кредитов Serper: ${credits}`);
  if (result.errors) {
    const msg = `С ошибкой: ${result.errors} из ${keywords.length} (${(result.lastError ?? "").slice(0, 120)}). ${parts.join(", ")}`;
    if (result.errors === result.checked) throw new UserFacingError(msg);
    parts.push(`с ошибкой: ${result.errors} (${(result.lastError ?? "").slice(0, 120)})`);
  }
  if (result.stoppedByCap) throw new UserFacingError(`Остановлено: дневной потолок ${getDailyCreditCap()} кредитов. ${parts.join(", ")}`);
  return parts.join(", ");
}

export async function runDailyChecks(limit = 200): Promise<RunResult & { due: number }> {
  const due = await listDueKeywords(limit);
  const result = await runQueue(due);
  return { ...result, due: due.length };
}
