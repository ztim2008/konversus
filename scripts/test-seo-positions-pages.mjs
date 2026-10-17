/**
 * Тест страниц под запросы и каннибализации SEO-позиций (без фреймворка).
 * node scripts/test-seo-positions-pages.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/seo-positions/pages.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { normalizeUrl, shortPath, landingPages, findCannibalization, targetMismatch, queryMatch, pageIssues, queryIssues } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

assert.equal(normalizeUrl("https://www.Master-Kotlov.uz/"), "https://master-kotlov.uz/");
assert.equal(normalizeUrl("https://master-kotlov.uz/page/?utm_source=x#top"), "https://master-kotlov.uz/page");
assert.equal(normalizeUrl("https://master-kotlov.uz/p?id=2&utm_medium=y"), "https://master-kotlov.uz/p?id=2");
assert.equal(shortPath("https://master-kotlov.uz/"), "главная");
assert.equal(shortPath("https://master-kotlov.uz/kotly"), "/kotly");

let n = 0;
const snap = (keywordId, iso, position, matchedUrl) => ({
  id: String(n++),
  keywordId,
  checkedAt: iso,
  status: position ? "found" : "not_found",
  position,
  page: null,
  matchedUrl,
  depth: 0,
  credits: 1,
  top: [],
  errorText: null,
});
const HOME = "https://master-kotlov.uz/";
const FLOOR = "https://master-kotlov.uz/obsluzhivanie-i-remont-napolnykh-kotlov";
const keywords = [
  { id: "a", keyword: "Ремонт котлов в Ташкенте", targetUrl: null, projectId: "p", isActive: true, checkingSince: null },
  { id: "b", keyword: "ремонт газовых котлов Ташкент", targetUrl: null, projectId: "p", isActive: true, checkingSince: null },
  { id: "c", keyword: "нет данных", targetUrl: "https://www.master-kotlov.uz/gaz/", projectId: "p", isActive: true, checkingSince: null },
];
const snapshots = [
  // «a»: главная один день (51), напольные котлы два дня (69, 71) — как на реальном проекте.
  snap("a", "2026-10-17T10:00:00Z", 51, HOME),
  snap("a", "2026-10-18T10:00:00Z", 69, FLOOR),
  snap("a", "2026-10-19T10:00:00Z", 71, FLOOR),
  // Две проверки в один день по Ташкенту — один день.
  snap("b", "2026-10-17T10:00:00Z", 44, HOME),
  snap("b", "2026-10-17T12:00:00Z", 46, HOME),
  snap("b", "2026-10-18T10:00:00Z", null, null),
];

const tz = "Asia/Tashkent";
const landings = landingPages(keywords, snapshots, tz);
const a = landings.find((l) => l.keywordId === "a");
assert.equal(a.main.url, FLOOR, "основная — где больше дней");
assert.equal(a.main.days, 2);
assert.equal(a.main.best, 69);
assert.equal(a.main.last, 71);
assert.equal(a.others.length, 1);
assert.equal(a.others[0].url, HOME);

const b = landings.find((l) => l.keywordId === "b");
assert.equal(b.main.days, 1, "две проверки в один день считаются одним днём");
assert.equal(b.main.last, 46);
assert.equal(b.others.length, 0);

const c = landings.find((l) => l.keywordId === "c");
assert.equal(c.main, null);
assert.equal(c.targetUrl, "https://master-kotlov.uz/gaz");
assert.equal(targetMismatch(c), false, "без данных расхождения нет");

const cann = findCannibalization(landings);
assert.equal(cann.length, 1);
assert.equal(cann[0].keywordId, "a");
assert.equal(cann[0].strengthen, HOME, "без целевой — усиливать страницу с лучшей позицией");
assert.match(cann[0].advice, /лучше главную/);

const withTarget = landingPages([{ ...keywords[0], targetUrl: FLOOR + "/" }], snapshots, tz);
assert.equal(findCannibalization(withTarget)[0].strengthen, FLOOR, "целевая важнее лучшей позиции");
assert.equal(targetMismatch(withTarget[0]), false);
const otherTarget = landingPages([{ ...keywords[0], targetUrl: "https://master-kotlov.uz/gaz" }], snapshots, tz);
assert.equal(targetMismatch(otherTarget[0]), true);

assert.equal(queryMatch("Ремонт котлов в Ташкенте", "Ремонт котлов Ташкент — мастер на дом"), "full");
assert.equal(queryMatch("ремонт газовых котлов Ташкент", "Ремонт котлов в Ташкенте"), "partial");
assert.equal(queryMatch("ремонт газовых котлов Ташкент", "Отопление под ключ"), "none");
assert.equal(queryMatch("ремонт котлов", null), "none");
assert.equal(queryMatch("Ёлки", "елки зелёные"), "full");

const okPage = {
  url: HOME,
  statusCode: 200,
  finalUrl: HOME,
  title: "Ремонт котлов в Ташкенте — выезд за час",
  description: "Мастер на дом",
  h1: "Ремонт газовых котлов",
  h1Count: 1,
  canonical: "https://www.master-kotlov.uz/",
  noindex: false,
  words: 800,
  metrika: true,
  error: null,
};
assert.deepEqual(pageIssues(okPage), []);
assert.deepEqual(queryIssues("Ремонт котлов в Ташкенте", okPage), ["В H1 не все слова запроса"]);
assert.deepEqual(
  pageIssues({ ...okPage, title: null, description: null, h1: null, h1Count: 0, words: 40, metrika: false, noindex: true }),
  ["Закрыта от индексации (noindex)", "Нет title", "Нет description", "Нет H1", "Мало текста: 40 слов", "Метрики в коде страницы нет"]
);
assert.deepEqual(pageIssues({ ...okPage, canonical: FLOOR }), ["canonical указывает на /obsluzhivanie-i-remont-napolnykh-kotlov"]);
assert.deepEqual(pageIssues({ ...okPage, url: HOME + "old", finalUrl: HOME }), ["Редирект на главную"]);
assert.deepEqual(pageIssues({ ...okPage, title: "x".repeat(82) }), ["title длинный: 82 символа, Google обрежет"]);
assert.deepEqual(pageIssues({ ...okPage, words: 21 }), ["Мало текста: 21 слово"]);
assert.deepEqual(pageIssues({ ...okPage, statusCode: 404 }), ["Ответ сервера 404"]);
assert.deepEqual(pageIssues({ ...okPage, error: "Не ответил за 10 секунд" }), ["Не ответил за 10 секунд"]);
assert.deepEqual(queryIssues("отопление", { ...okPage, statusCode: 404 }), []);

console.log("seo-positions pages: OK");
