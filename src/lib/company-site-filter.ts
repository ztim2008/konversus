/**
 * Фильтр: только сайты компаний/исполнителей.
 * Отсекает статьи, рейтинги, агрегаторы, соцсети, СМИ.
 */
import "server-only";

export type RejectReason =
  | "blacklist_domain"
  | "article_url"
  | "article_title"
  | "social"
  | "no_domain";

const BLACKLIST_DOMAINS = new Set([
  // каталоги / агрегаторы
  "2gis.ru",
  "zoon.ru",
  "yell.ru",
  "yandex.ru",
  "yandex.com",
  "google.com",
  "google.ru",
  "avito.ru",
  "youdo.com",
  "profi.ru",
  "flamp.ru",
  "otzovik.com",
  "irecommend.ru",
  "tiu.ru",
  "pulscen.ru",
  "blizko.ru",
  "orgpage.ru",
  "cataloxy.ru",
  "spr.ru",
  "yp.ru",
  // маркетплейсы
  "wildberries.ru",
  "ozon.ru",
  "market.yandex.ru",
  // соц / видео
  "vk.com",
  "vk.ru",
  "ok.ru",
  "t.me",
  "telegram.me",
  "youtube.com",
  "youtu.be",
  "rutube.ru",
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  // СМИ / энциклопедии / площадки статей
  "wikipedia.org",
  "ru.wikipedia.org",
  "dzen.ru",
  "zen.yandex.ru",
  "vc.ru",
  "habr.com",
  "rbc.ru",
  "ria.ru",
  "lenta.ru",
  "kommersant.ru",
  "forbes.ru",
  "kp.ru",
  "fontanka.ru",
  "tinkoff.ru",
  "banki.ru",
  "hh.ru",
  "superjob.ru",
  "linkedin.com",
]);

const ARTICLE_PATH_RE =
  /\/(blog|blogs|article|articles|news|novosti|rating|ratings|top|obzor|obzory|howto|kak-|wiki|guides?|statyi|posts?)\b/i;

const ARTICLE_TITLE_RE =
  /\b(рейтинг|топ[-\s]?\d+|обзор|\d+\s+лучш\w*\s+компани|лучш\w*\s+компани|как (сделать|выбрать|отремонтировать)|сравнени[ея]|куда обратиться)\b/i;

function hostMatchesBlacklist(domain: string): boolean {
  const d = domain.toLowerCase();
  for (const bad of BLACKLIST_DOMAINS) {
    if (d === bad || d.endsWith(`.${bad}`)) return true;
  }
  return false;
}

export function classifyCompanySite(params: {
  url: string;
  title: string;
  snippet?: string;
  domain: string | null;
}): { ok: true } | { ok: false; reason: RejectReason } {
  const { url, title, snippet, domain } = params;
  if (!domain) return { ok: false, reason: "no_domain" };

  if (hostMatchesBlacklist(domain)) {
    return { ok: false, reason: "blacklist_domain" };
  }

  let path = "";
  try {
    path = new URL(url.startsWith("http") ? url : `https://${url}`).pathname;
  } catch {
    path = url;
  }

  if (ARTICLE_PATH_RE.test(path) || ARTICLE_PATH_RE.test(url)) {
    return { ok: false, reason: "article_url" };
  }

  const text = `${title} ${snippet || ""}`;
  if (ARTICLE_TITLE_RE.test(text)) {
    return { ok: false, reason: "article_title" };
  }

  return { ok: true };
}

export function guessCompanyName(title: string, domain: string): string {
  let name = title
    .replace(/\s*[|—–-]\s*.+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name || name.length < 2) {
    name = domain.split(".")[0] || domain;
  }
  return name.slice(0, 255);
}
