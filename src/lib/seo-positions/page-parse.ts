/** Разбор HTML страницы без DOM: чистые функции, используются и в тестах. */

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  laquo: "«",
  raquo: "»",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  copy: "©",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return NAMED[code.toLowerCase()] ?? m;
  });
}

function clean(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? "");
  }
  return out;
}

export type ParsedPage = {
  title: string | null;
  description: string | null;
  h1: string[];
  canonical: string | null;
  robots: string | null;
  words: number;
  metrika: boolean;
  gtm: boolean;
  links: string[];
};

export function parseHtml(raw: string, baseUrl: string): ParsedPage {
  const html = raw.replace(/<!--[\s\S]*?-->/g, " ");
  const markup = html.replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, " ");
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let description: string | null = null;
  let robots: string | null = null;
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const name = (a.name || "").toLowerCase();
    if (name === "description" && description === null) description = (a.content || "").trim();
    if ((name === "robots" || name === "googlebot") && a.content) robots = robots ? `${robots}, ${a.content}` : a.content;
  }
  let canonical: string | null = null;
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if ((a.rel || "").toLowerCase().split(/\s+/).includes("canonical") && a.href) {
      canonical = resolve(a.href, baseUrl);
      break;
    }
  }
  const h1 = [...markup.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => clean(m[1])).filter(Boolean);

  const body = markup.replace(/<head\b[\s\S]*?<\/head>/i, " ").replace(/<svg\b[\s\S]*?<\/svg>/gi, " ");
  const words = (clean(body).match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => /\p{L}/u.test(w)).length;

  const links: string[] = [];
  for (const m of markup.matchAll(/<a\b[^>]*>/gi)) {
    const href = attrs(m[0]).href;
    if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const abs = resolve(href, baseUrl);
    if (abs) links.push(abs);
  }

  return {
    title: titleMatch ? clean(titleMatch[1]) || null : null,
    description: description || null,
    h1,
    canonical,
    robots,
    words,
    metrika: /mc\.yandex\.[a-z]+\/(metrika|watch)|\bym\(\s*\d{4,}/.test(html),
    gtm: /googletagmanager\.com\/gtm\.js/.test(html),
    links: [...new Set(links)],
  };
}

function resolve(href: string, base: string): string | null {
  try {
    const u = new URL(href.trim(), base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export function isNoindex(robots: string | null, xRobots: string | null): boolean {
  return /noindex|\bnone\b/i.test(`${robots ?? ""} ${xRobots ?? ""}`);
}

/** Кодировка из Content-Type или meta charset; по умолчанию utf-8. */
export function detectCharset(contentType: string | null, headBytes: string): string {
  const fromHeader = contentType?.match(/charset=([\w-]+)/i)?.[1];
  const fromMeta = headBytes.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  const cs = (fromHeader || fromMeta || "utf-8").toLowerCase();
  return cs === "cp1251" ? "windows-1251" : cs;
}
