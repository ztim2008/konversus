/**
 * Тест обхода сайта SEO-позиций: robots.txt, sitemap, находки (без фреймворка).
 * node scripts/test-seo-positions-crawl.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const toDataUrl = (path, replace = (s) => s) => {
  const source = replace(readFileSync(new URL(path, import.meta.url), "utf8"));
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
};
const pagesUrl = toDataUrl("../src/lib/seo-positions/pages.ts");
const { parseRobots, isAllowed, parseSitemap, crawlFindings, pagesLabel } = await import(
  toDataUrl("../src/lib/seo-positions/crawl-parse.ts", (s) => s.replace('"@/lib/seo-positions/pages"', JSON.stringify(pagesUrl)))
);

const robots = parseRobots(`
User-agent: Yandex
Disallow: /only-yandex

User-agent: Googlebot
User-agent: *
Disallow: /admin
Disallow: /*?sort=
Allow: /admin/public
Disallow: /tmp$
Crawl-delay: 2 # секунды
Sitemap: https://site.uz/sitemap.xml
`);
assert.deepEqual(robots.sitemaps, ["https://site.uz/sitemap.xml"]);
assert.equal(robots.crawlDelay, 2);
assert.equal(isAllowed("/only-yandex", robots), true, "правила другого бота не применяются");
assert.equal(isAllowed("/admin/users", robots), false);
assert.equal(isAllowed("/admin/public/page", robots), true, "длинное Allow сильнее");
assert.equal(isAllowed("/catalog?sort=price", robots), false);
assert.equal(isAllowed("/tmp", robots), false);
assert.equal(isAllowed("/tmp/x", robots), true, "$ — точный конец");
assert.equal(isAllowed("/", parseRobots("")), true);
assert.equal(isAllowed("/x", parseRobots("User-agent: *\nDisallow:")), true, "пустой Disallow разрешает всё");

const index = parseSitemap(`<?xml version="1.0"?><sitemapindex><sitemap><loc>https://site.uz/s1.xml</loc></sitemap></sitemapindex>`);
assert.deepEqual(index, { urls: [], sitemaps: ["https://site.uz/s1.xml"] });
const set = parseSitemap(`<urlset><url><loc> https://site.uz/ </loc></url><url><loc><![CDATA[https://site.uz/a?x=1&amp;y=2]]></loc></url></urlset>`);
assert.deepEqual(set.urls, ["https://site.uz/", "https://site.uz/a?x=1&y=2"]);

const base = {
  inSitemap: true,
  statusCode: 200,
  redirects: 0,
  title: "Уникальный",
  description: null,
  h1Count: 1,
  canonical: null,
  noindex: false,
  metrika: true,
  gtm: false,
  words: 500,
  isHtml: true,
  error: null,
};
const page = (path, extra = {}) => ({ ...base, url: `https://site.uz${path}`, finalUrl: `https://site.uz${path}`, title: `T ${path}`, ...extra });
const pages = [
  page("/"),
  page("/a", { title: "Кухни", description: "Одно" }),
  page("/b", { title: "кухни ", description: "Одно" }),
  page("/c", { h1Count: 0, words: 40 }),
  page("/d", { h1Count: 3, metrika: false }),
  page("/e", { metrika: false, gtm: true }),
  page("/f", { noindex: true }),
  page("/g", { canonical: "https://www.site.uz/" }),
  page("/h", { canonical: "https://site.uz/h/" }),
  page("/i", { statusCode: 404 }),
  page("/j", { error: "Не ответил за 10 секунд", statusCode: null }),
  page("/k", { redirects: 2, finalUrl: "https://site.uz/" }),
  page("/l", { inSitemap: false, title: null }),
  page("/file", { isHtml: false, title: null, h1Count: 0, words: 0, metrika: false }),
];
const byId = Object.fromEntries(crawlFindings(pages).map((f) => [f.id, f.urls.map((u) => u.replace("https://site.uz", ""))]));
assert.deepEqual(byId.errors, ["/i", "/j"]);
assert.deepEqual(byId.redirect_chains, ["/k"]);
assert.deepEqual(byId.sitemap_redirects, ["/k"]);
assert.deepEqual(byId.no_title, ["/l"]);
assert.deepEqual(byId.dup_title, ["/a", "/b"], "регистр и пробелы не важны");
assert.deepEqual(byId.dup_description, ["/a", "/b"]);
assert.deepEqual(byId.no_h1, ["/c"]);
assert.deepEqual(byId.multi_h1, ["/d"]);
assert.deepEqual(byId.noindex_in_sitemap, ["/f"]);
assert.deepEqual(byId.canonical_other, ["/g"], "www и слэш на конце — та же страница");
assert.deepEqual(byId.no_metrika, ["/d"], "не-HTML файлы не проверяются");
assert.deepEqual(byId.metrika_gtm, ["/e"]);
assert.deepEqual(byId.thin, ["/c"]);
assert.deepEqual(crawlFindings([page("/")]), []);

const redirected = crawlFindings([
  page("/", { title: "Главная" }),
  page("/index", { title: "Главная", redirects: 1, finalUrl: "https://site.uz/" }),
  page("/page2", { title: "Airfel", redirects: 1, finalUrl: "https://site.uz/airfel" }),
  page("/airfel", { title: "Airfel" }),
]);
assert.deepEqual(
  redirected.map((f) => f.id),
  ["sitemap_redirects"],
  "страница после редиректа проверяется один раз, дубля title нет"
);
const onlyRedirect = crawlFindings([page("/old", { redirects: 1, finalUrl: "https://site.uz/new", h1Count: 0 })]);
assert.ok(onlyRedirect.some((f) => f.id === "no_h1"), "если конечной страницы нет в обходе, её содержимое проверяется");
assert.equal(pagesLabel(1), "1 страница");
assert.equal(pagesLabel(3), "3 страницы");
assert.equal(pagesLabel(11), "11 страниц");

console.log("seo-positions crawl: OK");
