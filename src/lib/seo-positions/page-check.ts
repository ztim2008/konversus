import "server-only";

import { urlMatchesDomain } from "@/lib/seo-positions/domain";
import { detectCharset, isNoindex, parseHtml, type ParsedPage } from "@/lib/seo-positions/page-parse";

const UA = "Mozilla/5.0 (compatible; KonversusSEO/1.0; +https://konversus.ru)";
const MAX_REDIRECTS = 5;
const MAX_BYTES = 3_000_000;

export type FetchedPage = {
  url: string;
  statusCode: number | null;
  finalUrl: string | null;
  redirects: number;
  noindex: boolean;
  parsed: ParsedPage | null;
  error: string | null;
};

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Загружает страницу своего домена. Редиректы — вручную, чтобы не уйти на чужой сайт; HTML разбирается, остальное — только код ответа. */
export async function fetchPage(url: string, domain: string): Promise<FetchedPage> {
  let current = url;
  let redirects = 0;
  try {
    for (;;) {
      if (!urlMatchesDomain(current, domain)) {
        return { url, statusCode: null, finalUrl: current, redirects, noindex: false, parsed: null, error: "Редирект на другой сайт" };
      }
      const res = await fetch(current, {
        redirect: "manual",
        headers: { "user-agent": UA, accept: "text/html,*/*;q=0.5", "accept-language": "ru,en;q=0.5" },
        signal: AbortSignal.timeout(10_000),
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        await res.body?.cancel();
        if (++redirects > MAX_REDIRECTS) {
          return { url, statusCode: res.status, finalUrl: current, redirects, noindex: false, parsed: null, error: "Слишком много редиректов" };
        }
        current = new URL(location, current).toString();
        continue;
      }
      const contentType = res.headers.get("content-type");
      const xRobots = res.headers.get("x-robots-tag");
      if (!/html/i.test(contentType ?? "")) {
        await res.body?.cancel();
        return { url, statusCode: res.status, finalUrl: current, redirects, noindex: isNoindex(null, xRobots), parsed: null, error: null };
      }
      const buf = Buffer.from(await res.arrayBuffer()).subarray(0, MAX_BYTES);
      const charset = detectCharset(contentType, buf.subarray(0, 4096).toString("latin1"));
      let html: string;
      try {
        html = new TextDecoder(charset).decode(buf);
      } catch {
        html = buf.toString("utf8");
      }
      const parsed = parseHtml(html, current);
      return {
        url,
        statusCode: res.status,
        finalUrl: current,
        redirects,
        noindex: isNoindex(parsed.robots, xRobots),
        parsed,
        error: null,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? (err.name === "TimeoutError" ? "Не ответил за 10 секунд" : err.message) : String(err);
    return { url, statusCode: null, finalUrl: current, redirects, noindex: false, parsed: null, error: message.slice(0, 200) };
  }
}
