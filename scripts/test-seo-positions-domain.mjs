/**
 * Тест сравнения доменов SEO-позиций (без фреймворка).
 * node scripts/test-seo-positions-domain.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/seo-positions/domain.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { normalizeDomain, urlMatchesDomain } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

const cases = [
  ["master-kotlov.uz", "master-kotlov.uz"],
  ["https://master-kotlov.uz/", "master-kotlov.uz"],
  ["WWW.Master-Kotlov.UZ/ru/page?x=1", "master-kotlov.uz"],
  ["http://www.example.uz.", "example.uz"],
  ["", null],
  ["not a domain", null],
  ["localhost", null],
];
for (const [input, expected] of cases) {
  assert.equal(normalizeDomain(input), expected, `normalizeDomain(${JSON.stringify(input)})`);
}

const d = "master-kotlov.uz";
assert.equal(urlMatchesDomain("https://master-kotlov.uz/", d), true);
assert.equal(urlMatchesDomain("https://www.master-kotlov.uz/ru", d), true);
assert.equal(urlMatchesDomain("https://ru.master-kotlov.uz/", d), true);
assert.equal(urlMatchesDomain("https://masterkotlov.uz/", d), false);
assert.equal(urlMatchesDomain("https://master-kotlov.uz.attacker.com/", d), false);
assert.equal(urlMatchesDomain("https://evil-master-kotlov.uz/", d), false);
assert.equal(urlMatchesDomain("not a url", d), false);

console.log("seo-positions domain tests OK");
