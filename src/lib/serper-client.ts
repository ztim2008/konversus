/**
 * Serper.dev — органическая Google-выдача (не карты).
 * Ключ: SERPER_API_KEY в .env.local
 */
import "server-only";

export interface SerperOrganicItem {
  title: string;
  link: string;
  snippet?: string;
  position: number;
}

export interface SerperSearchResult {
  query: string;
  organic: SerperOrganicItem[];
  credits?: number;
}

function getApiKey(): string {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) throw new Error("SERPER_API_KEY не задан в .env.local");
  return key;
}

export async function searchSerperOrganic(params: {
  query: string;
  num?: number;
  page?: number;
}): Promise<SerperSearchResult> {
  const apiKey = getApiKey();
  const num = Math.min(Math.max(params.num ?? 20, 1), 100);
  const page = params.page ?? 1;

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: params.query,
      gl: "ru",
      hl: "ru",
      num,
      page,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const data = (await res.json()) as {
    organic?: Array<{ title?: string; link?: string; snippet?: string; position?: number }>;
    credits?: number;
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.message || data.error || `Serper HTTP ${res.status}`);
  }

  const organic: SerperOrganicItem[] = (data.organic || [])
    .filter((o) => o.link && o.title)
    .map((o, i) => ({
      title: String(o.title),
      link: String(o.link),
      snippet: o.snippet ? String(o.snippet) : undefined,
      position: typeof o.position === "number" ? o.position : i + 1,
    }));

  return { query: params.query, organic, credits: data.credits };
}

/** Запрос под исполнителей в городе (география v1). */
export function buildCompanySerpQuery(niche: string, city: string): string {
  const n = niche.trim();
  const c = city.trim();
  // Без «Россия»; акцент на услуги/компанию в городе
  return `${n} ${c}`;
}

export function extractDomain(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}
