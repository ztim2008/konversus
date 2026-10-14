/**
 * Слот каталога: свой ассортимент, карточка товара, ящик не noreply.
 * Слабое фото на картинке глазами не доказать — в очередь кладём черновик проблем,
 * Алексей правит его в редакторе перед отправкой.
 */
import "server-only";

import { getSetting, setManySetting } from "@/lib/data/settings";
import {
  extractH1Texts,
  pickHonestH1,
  readResponseHtml,
} from "@/lib/lead-radar/page-facts";

export const SETTING_CATALOG_CURSOR = "lead_radar_catalog_cursor";

export const CATALOG_NICHES = [
  "спецодежда оптом от производителя",
  "рабочая обувь оптом каталог",
  "производство упаковки каталог",
  "мебель от производителя каталог",
  "промышленное оборудование каталог производитель",
  "металлоизделия производство каталог",
  "стройматериалы оптом от производителя",
  "спецодежда производитель интернет-магазин",
] as const;

const DENY_PATH =
  /\/(cart|checkout|login|signin|sign-up|search|blog|news|novosti|about|o-kompanii|o-nas|contacts|kontakty|privacy|politika|vakans|otzyv|review|compare|wishlist|account|personal|delivery|dostavka|oplata|payment)\b/i;

const PRODUCT_HINT =
  /\/(product|products|catalog|catalogue|shop|goods|item|tovar|tovary|specodezhda|produkciya|production|katalog)\b/i;

const SPEC_TEXT =
  /цена|руб|артикул|состав|размер|характеристик|опт|плотност|гост|материал|мм\b|кг\b/i;

export type CatalogFit =
  | {
      ok: true;
      productUrl: string;
      productName: string;
      sku: string | null;
      problems: string[];
    }
  | { ok: false; reason: string };

export async function takeNextCatalogNiche(): Promise<string> {
  const raw = (await getSetting(SETTING_CATALOG_CURSOR)).trim();
  const parsed = Number.parseInt(raw || "0", 10);
  const idx = Number.isFinite(parsed)
    ? Math.abs(parsed) % CATALOG_NICHES.length
    : 0;
  await setManySetting({ [SETTING_CATALOG_CURSOR]: String(idx + 1) });
  return CATALOG_NICHES[idx];
}

/** Ящик, на который можно написать опту. noreply не берём, zakaz@ берём. */
export function isCatalogMailbox(email: string): boolean {
  const local = (email.split("@")[0] || "").toLowerCase();
  if (local.length < 2) return false;
  if (/noreply|no-reply|no_reply|donotreply|mailer|webmaster|bounce/.test(local)) {
    return false;
  }
  return true;
}

export function catalogSerpQuery(niche: string): string {
  return `${niche.trim()} -avito -2gis -profi -youdo -domclick -yell -zoon -wildberries -ozon -market.yandex.ru`;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KonversusCatalog/1.0)",
        Accept: "text/html",
      },
    });
    if (!res.ok) return null;
    const html = await readResponseHtml(res);
    return html.slice(0, 1_500_000);
  } catch {
    return null;
  }
}

function toAbsolute(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function sameHost(a: string, b: string): boolean {
  try {
    const host = (value: string) =>
      new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
    return host(a) === host(b);
  } catch {
    return false;
  }
}

function productLinks(html: string, pageUrl: string): string[] {
  const scored: Array<{ url: string; score: number }> = [];
  const seen = new Set<string>();
  const re = /<a\b[^>]*href=["']([^"'#]+)["']/gi;
  for (const match of html.matchAll(re)) {
    const abs = toAbsolute(match[1], pageUrl);
    if (!abs || !sameHost(abs, pageUrl) || seen.has(abs)) continue;
    let path = "/";
    try {
      path = new URL(abs).pathname;
    } catch {
      continue;
    }
    if (DENY_PATH.test(path) || path.length < 2) continue;
    const segments = path.split("/").filter(Boolean);
    if (segments.length < 2 && !PRODUCT_HINT.test(path)) continue;
    let score = segments.length;
    if (PRODUCT_HINT.test(path)) score += 3;
    if (score < 2) continue;
    seen.add(abs);
    scored.push({ url: abs, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((item) => item.url);
}

function countContentImages(html: string): number {
  const re = /<img\b[^>]*>/gi;
  let count = 0;
  for (const tag of html.match(re) ?? []) {
    if (/logo|icon|sprite|pixel|spacer|svg/i.test(tag)) continue;
    if (/src=["']data:image\/svg/i.test(tag)) continue;
    count += 1;
  }
  return count;
}

function readSku(html: string): string | null {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const match = text.match(/артикул[:\s№#]*([A-Za-z0-9][A-Za-z0-9\-_/]{1,24})/i);
  const sku = match?.[1]?.trim() || "";
  if (!sku || !/\d/.test(sku)) return null;
  return sku;
}

function cardProblems(imageCount: number): string[] {
  if (imageCount <= 2) {
    return [
      "нет крупных планов ткани и деталей",
      "нет инфографики",
    ];
  }
  return ["нет инфографики, характеристики только текстом под фото"];
}

function pageLooksLikeCard(html: string): { name: string; images: number } | null {
  const name = pickHonestH1(extractH1Texts(html));
  if (!name) return null;
  const images = countContentImages(html);
  if (images < 1) return null;
  const text = html.replace(/<[^>]+>/g, " ");
  if (!SPEC_TEXT.test(text)) return null;
  return { name, images };
}

/** Открывает главную и 1–2 карточки. Пустой слот лучше слабого сайта. */
export async function inspectCatalog(pageUrl: string): Promise<CatalogFit> {
  const home = await fetchHtml(pageUrl);
  if (!home) return { ok: false, reason: "catalog_unreachable" };

  const links = productLinks(home, pageUrl);
  if (links.length < 6) return { ok: false, reason: "thin_catalog" };

  for (const productUrl of links.slice(0, 3)) {
    const html = await fetchHtml(productUrl);
    if (!html) continue;
    const card = pageLooksLikeCard(html);
    if (!card) continue;
    const sku = readSku(html);
    const problems = cardProblems(card.images);
    if (sku) problems.push(`Артикул: ${sku}`);
    return {
      ok: true,
      productUrl,
      productName: card.name,
      sku,
      problems,
    };
  }

  return { ok: false, reason: "no_product_card" };
}
