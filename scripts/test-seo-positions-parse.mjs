/**
 * Тест разбора HTML страниц SEO-позиций (без фреймворка).
 * node scripts/test-seo-positions-parse.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/seo-positions/page-parse.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { parseHtml, decodeEntities, isNoindex, detectCharset } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

assert.equal(decodeEntities("&laquo;Котлы&raquo; &amp; &#1082;&#x43E;"), "«Котлы» & ко");

const html = `<!doctype html><html><head>
<meta charset="utf-8"><title> Ремонт котлов
 в Ташкенте &mdash; Мастер </title>
<meta name="description" content="Выезд за 1 час">
<META NAME="robots" CONTENT="index, follow">
<link rel="canonical" href="/kotly/">
<script>var x = "<h1>не заголовок</h1>"; ym(109748463, "init")</script>
</head><body>
<h1 class="t">Ремонт <b>газовых</b> котлов</h1>
<h1></h1>
<p>Один два три 2026 года.</p>
<a href="/uslugi#top">Услуги</a> <a href="tel:+998">тел</a> <a href="https://t.me/x">tg</a> <a href="/uslugi">дубль</a>
<style>.a{color:red}</style>
</body></html>`;
const p = parseHtml(html, "https://master-kotlov.uz/page");
assert.equal(p.title, "Ремонт котлов в Ташкенте — Мастер");
assert.equal(p.description, "Выезд за 1 час");
assert.equal(p.canonical, "https://master-kotlov.uz/kotly/");
assert.deepEqual(p.h1, ["Ремонт газовых котлов"], "пустой H1 и H1 из скрипта не считаются");
assert.equal(p.robots, "index, follow");
assert.equal(p.metrika, true);
assert.equal(p.gtm, false);
assert.deepEqual(p.links, ["https://master-kotlov.uz/uslugi", "https://t.me/x"]);
assert.ok(p.words >= 10 && p.words <= 14, `слов: ${p.words}`);

const bare = parseHtml("<html><body>текст</body></html>", "https://a.uz/");
assert.equal(bare.title, null);
assert.equal(bare.canonical, null);
assert.equal(bare.metrika, false);

assert.equal(isNoindex("noindex, follow", null), true);
assert.equal(isNoindex(null, "none"), true);
assert.equal(isNoindex("index, follow", null), false);
assert.equal(detectCharset("text/html; charset=Windows-1251", ""), "windows-1251");
assert.equal(detectCharset(null, '<meta charset="cp1251">'), "windows-1251");
assert.equal(detectCharset(null, ""), "utf-8");

console.log("seo-positions parse: OK");
