/**
 * Глубокий поиск email: главная → /contacts… → ссылки «Контакт» → ещё N внутренних.
 */
import "server-only";

const CONTACT_PATHS = [
  "/contacts",
  "/contact",
  "/kontakty",
  "/kontact",
  "/o-nas",
  "/about",
  "/about-us",
  "/company",
  "/rekvizity",
  "/requisites",
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const EMAIL_BLACKLIST = [
  "example.com",
  "email.com",
  "domain.com",
  "sentry.io",
  "wixpress.com",
  "tilda.ws",
  "tildacdn.com",
  "jquery.com",
  "schema.org",
  "w3.org",
  "googleapis.com",
  "gstatic.com",
  "cloudflare.com",
  "github.com",
  "gravatar.com",
];

const NOREPLY_RE = /^(noreply|no-reply|donotreply|mailer-daemon|postmaster)@/i;

export type DeepEmailResult = {
  email: string | null;
  sourceUrl: string | null;
  candidates: string[];
  pagesScanned: number;
};

function normalizeBase(url: string): URL {
  const u = url.startsWith("http") ? url : `https://${url}`;
  return new URL(u);
}

function sameHost(a: string, baseHost: string): boolean {
  try {
    const h = new URL(a).hostname.replace(/^www\./i, "").toLowerCase();
    return h === baseHost.replace(/^www\./i, "").toLowerCase();
  } catch {
    return false;
  }
}

function isGoodEmail(email: string, siteHost: string): boolean {
  const e = email.toLowerCase();
  if (NOREPLY_RE.test(e)) return false;
  const domain = e.split("@")[1] || "";
  if (EMAIL_BLACKLIST.some((b) => domain === b || domain.endsWith(`.${b}`))) return false;
  if (e.endsWith(".png") || e.endsWith(".jpg") || e.endsWith(".css") || e.endsWith(".js")) return false;
  // предпочитаем корпоративный, но не режем чужие рабочие ящики жёстко
  void siteHost;
  return true;
}

function scoreEmail(email: string, siteHost: string): number {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  const host = siteHost.replace(/^www\./i, "").toLowerCase();
  let s = 0;
  if (domain === host || host.endsWith(`.${domain}`) || domain.endsWith(`.${host.split(".").slice(-2).join(".")}`)) {
    s += 50;
  }
  if (/^(info|mail|hello|contact|zakaz|order|office|admin)@/i.test(email)) s += 10;
  return s;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KonversusLeadRadar/1.0)" },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (ct && !/text\/html|application\/xhtml/i.test(ct) && !ct.includes("text/")) {
      // всё равно пробуем
    }
    return await res.text();
  } catch {
    return null;
  }
}

function extractEmails(html: string): string[] {
  const found = new Set<string>();
  // mailto:
  for (const m of html.matchAll(/mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi)) {
    found.add(m[1].toLowerCase());
  }
  const plain = html.match(EMAIL_RE) || [];
  for (const e of plain) found.add(e.toLowerCase());
  return Array.from(found);
}

function extractInternalLinks(html: string, base: URL): string[] {
  const links: string[] = [];
  const host = base.hostname;
  for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith("javascript:") || raw.startsWith("mailto:") || raw.startsWith("tel:")) continue;
    try {
      const abs = new URL(raw, base).href;
      if (!sameHost(abs, host)) continue;
      links.push(abs.split("#")[0]);
    } catch {
      /* skip */
    }
  }
  // приоритет контактным текстам — отдельным проходом ниже в findDeepEmail
  return links;
}

function contactishLink(url: string, anchorNearby?: string): boolean {
  const u = url.toLowerCase();
  if (/contact|kontak|about|o-nas|rekvizit|company/i.test(u)) return true;
  if (anchorNearby && /контакт|связь|написать|о\s*нас|реквизит/i.test(anchorNearby)) return true;
  return false;
}

export async function findDeepEmail(startUrl: string, maxInternal = 6): Promise<DeepEmailResult> {
  const base = normalizeBase(startUrl);
  const siteHost = base.hostname;
  const origin = base.origin;
  const scanned = new Set<string>();
  const queue: string[] = [base.href];

  for (const p of CONTACT_PATHS) {
    queue.push(new URL(p, origin).href);
  }

  const allCandidates: { email: string; page: string; score: number }[] = [];
  let pagesScanned = 0;

  while (queue.length && pagesScanned < maxInternal + 3) {
    const page = queue.shift()!;
    const key = page.replace(/\/$/, "").toLowerCase();
    if (scanned.has(key)) continue;
    scanned.add(key);

    const html = await fetchHtml(page);
    pagesScanned++;
    if (!html) continue;

    for (const email of extractEmails(html)) {
      if (!isGoodEmail(email, siteHost)) continue;
      allCandidates.push({
        email,
        page,
        score: scoreEmail(email, siteHost),
      });
    }

    // уже нашли хороший корпоративный — можно рано выйти
    const bestNow = [...allCandidates].sort((a, b) => b.score - a.score)[0];
    if (bestNow && bestNow.score >= 50) {
      break;
    }

    if (pagesScanned === 1 || queue.length < maxInternal) {
      const links = extractInternalLinks(html, base);
      const preferred = links.filter((l) => contactishLink(l));
      const rest = links.filter((l) => !contactishLink(l));
      for (const l of [...preferred, ...rest]) {
        const k = l.replace(/\/$/, "").toLowerCase();
        if (scanned.has(k)) continue;
        if (queue.length >= maxInternal + 5) break;
        queue.push(l);
      }
    }
  }

  allCandidates.sort((a, b) => b.score - a.score);
  const uniq = new Map<string, { email: string; page: string; score: number }>();
  for (const c of allCandidates) {
    if (!uniq.has(c.email)) uniq.set(c.email, c);
  }
  const ranked = Array.from(uniq.values()).sort((a, b) => b.score - a.score);
  const top = ranked[0];

  return {
    email: top?.email ?? null,
    sourceUrl: top?.page ?? null,
    candidates: ranked.map((r) => r.email).slice(0, 5),
    pagesScanned,
  };
}
