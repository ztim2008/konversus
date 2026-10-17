/**
 * Тест месячного отчёта SEO-позиций (без фреймворка).
 * node scripts/test-seo-positions-report.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/seo-positions/report.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { buildMonthReport, median, rankLabel } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

assert.equal(median([44, Infinity, 47]), 47);
assert.equal(median([Infinity, Infinity]), Infinity);
assert.equal(median([10, 20]), 15);
assert.equal(rankLabel(Infinity, 100), "нет в топ-100");

const from = new Date("2026-09-30T19:00:00Z");
const to = new Date("2026-10-31T19:00:00Z");
let n = 0;
const snap = (keywordId, day, position, status = position ? "found" : "not_found", top = []) => ({
  id: String(n++),
  keywordId,
  checkedAt: `2026-10-${String(day).padStart(2, "0")}T05:00:00.000Z`,
  status,
  position,
  page: null,
  matchedUrl: null,
  depth: 0,
  credits: 1,
  top,
  errorText: null,
});

const keywords = [
  { id: "a", keyword: "растёт", projectId: "p", isActive: true, checkingSince: null },
  { id: "b", keyword: "падает", projectId: "p", isActive: true, checkingSince: null },
  { id: "c", keyword: "появился", projectId: "p", isActive: true, checkingSince: null },
  { id: "d", keyword: "одна проверка", projectId: "p", isActive: true, checkingSince: null },
];
const topStart = [{ position: 1, host: "olx.uz", url: "", title: "" }, { position: 2, host: "old.uz", url: "", title: "" }];
const topEnd = [{ position: 1, host: "olx.uz", url: "", title: "" }, { position: 2, host: "new.uz", url: "", title: "" }];
const snapshots = [
  snap("a", 1, 50, "found", topStart), snap("a", 2, 48), snap("a", 3, 90), snap("a", 4, 99, "error"),
  snap("a", 28, 20), snap("a", 29, 18), snap("a", 30, 19, "found", topEnd),
  snap("b", 1, 5), snap("b", 30, 9),
  snap("c", 1, null), snap("c", 2, null), snap("c", 29, 40), snap("c", 30, 42),
  snap("d", 15, 30),
].sort((x, y) => x.checkedAt.localeCompare(y.checkedAt));

const r = buildMonthReport({
  keywords,
  snapshots,
  notes: [],
  from,
  to,
  depth: 100,
  ownDomain: "master-kotlov.uz",
  monthPrep: "октябре 2026",
  timeZone: "Asia/Tashkent",
});

const byName = Object.fromEntries(r.keywords.map((k) => [k.keyword, k]));
assert.equal(byName["растёт"].start, 50, "медиана первых трёх 50/48/90");
assert.equal(byName["растёт"].end, 19, "медиана последних трёх 20/18/19, ошибка не считается");
assert.equal(byName["растёт"].delta, 31);
assert.equal(byName["падает"].delta, -4);

const sameDay = buildMonthReport({
  keywords: [keywords[0]],
  snapshots: [snap("a", 17, 71), { ...snap("a", 17, 69), checkedAt: "2026-10-17T05:10:00.000Z" }],
  notes: [],
  from,
  to,
  depth: 100,
  ownDomain: "x.uz",
  monthPrep: "октябре 2026",
  timeZone: "Asia/Tashkent",
});
assert.equal(sameDay.keywords[0].delta, null, "две проверки в один день — не изменение");

const small = buildMonthReport({
  keywords: [keywords[0]],
  snapshots: [snap("a", 1, 48), snap("a", 20, 47)],
  notes: [],
  from,
  to,
  depth: 100,
  ownDomain: "x.uz",
  monthPrep: "октябре 2026",
  timeZone: "Asia/Tashkent",
});
assert.equal(small.keywords[0].delta, 0, "сдвиг на 1 место — шум");
assert.equal(byName["появился"].start, Infinity);
assert.equal(byName["появился"].end, 41);
assert.ok(byName["появился"].delta > 0);
assert.equal(byName["одна проверка"].delta, null, "одной проверки мало для изменения");
assert.deepEqual(r.grew.map((k) => k.keyword), ["появился", "растёт"]);
assert.deepEqual(r.fell.map((k) => k.keyword), ["падает"]);
assert.equal(r.buckets[1].start, 1);
assert.equal(r.buckets[4].start, 1);
assert.ok(r.competitors.some((c) => c.host === "new.uz" && c.start === 0 && c.end === 1));
assert.ok(r.competitors.some((c) => c.host === "old.uz" && c.start === 1 && c.end === 0));
assert.match(r.summary, /выросли 2 из 3/);
assert.equal(r.checkDays, 7, "дни 1, 2, 3, 15, 28, 29, 30; день 4 — только ошибка");

console.log("seo-positions report tests OK");
