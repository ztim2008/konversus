/**
 * Тест сводки рекламы SEO-позиций: разбор выгрузки скрипта, дни «шла / стояла», периоды, часы (без фреймворка).
 * node scripts/test-seo-positions-ads.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/seo-positions/ads-summary.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { parseAdsPayload, dayList, monthDays, summarizeAds, formatPeriods } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

assert.deepEqual(dayList("2026-09-29", "2026-10-02"), ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
assert.equal(monthDays("2026-09", "2026-10-16").length, 30, "прошлый месяц целиком");
assert.equal(monthDays("2026-10", "2026-10-16").at(-1), "2026-10-16", "текущий — до вчера");
assert.deepEqual(monthDays("2026-11", "2026-10-16"), []);
assert.equal(monthDays("2028-02", "2030-01-01").length, 29, "високосный февраль");

const row = (date, campaignId, impressions, clicks, cost, conversions, hours = []) => ({
  date,
  campaignId,
  campaignName: `Кампания ${campaignId}`,
  impressions,
  clicks,
  cost,
  conversions,
  hours,
});
const ok = parseAdsPayload(
  {
    from: "2026-10-01",
    to: "2026-10-05",
    accountName: "Мастер Котлов",
    currency: "UZS",
    rows: [
      row("2026-10-01", "1", 100, 10, 50000.555, 1, [8, 9, 10, 23, 99]),
      row("2026-10-02", 1, "80", 8, 40000, 0, [8, 9, 10]),
      row("2026-10-02", "2", 20, 1, 5000, 0, [12]),
      row("2026-10-05", "1", 50, 5, 25000, 1, [9, 10]),
    ],
  },
  "2026-10-17",
  "google"
);
assert.equal(typeof ok, "object", String(ok));
assert.equal(ok.rows[0].cost, 50000.56);
assert.deepEqual(ok.rows[0].hours, [8, 9, 10, 23], "час 99 отброшен");
assert.equal(ok.rows[1].campaignId, "1");
assert.equal(ok.rows[1].impressions, 80);
assert.equal(ok.rows[0].source, "google");

assert.match(parseAdsPayload({ from: "2026-10-05", to: "2026-10-01", rows: [] }, "2026-10-17", "google"), /from/);
assert.match(parseAdsPayload({ from: "2026-10-01", to: "2026-10-20", rows: [] }, "2026-10-17", "google"), /будущем/);
assert.match(parseAdsPayload({ from: "2026-01-01", to: "2026-10-01", rows: [] }, "2026-10-17", "google"), /92/);
assert.match(
  parseAdsPayload({ from: "2026-10-01", to: "2026-10-02", rows: [row("2026-09-30", "1", 1, 0, 0, 0)] }, "2026-10-17", "google"),
  /вне периода/
);
assert.match(
  parseAdsPayload({ from: "2026-10-01", to: "2026-10-02", rows: [row("2026-10-01", "1", -1, 0, 0, 0)] }, "2026-10-17", "google"),
  /не меньше 0/
);

// Данные пришли за 1–5 октября, 6–7 октября неизвестно. 3–4 октября показов нет — реклама стояла.
const days = dayList("2026-10-01", "2026-10-07");
const covered = new Set(dayList("2026-10-01", "2026-10-05"));
const s = summarizeAds(days, covered, ok.rows);
assert.deepEqual(s.onDays, ["2026-10-01", "2026-10-02", "2026-10-05"]);
assert.deepEqual(s.offDays, ["2026-10-03", "2026-10-04"]);
assert.deepEqual(s.unknownDays, ["2026-10-06", "2026-10-07"]);
assert.deepEqual(s.totals, { impressions: 250, clicks: 24, cost: 120000.56, conversions: 2 });
assert.deepEqual(s.typicalHours, [8, 10], "часы, которые были хотя бы в половину дней с рекламой");
assert.equal(s.campaigns[0].id, "1");
assert.equal(s.campaigns[0].days, 3);
assert.equal(s.campaigns[1].days, 1);

assert.equal(formatPeriods(["2026-10-03", "2026-10-04"]), "3–4 октября");
assert.equal(formatPeriods(["2026-10-03", "2026-10-04", "2026-10-07"]), "3–4 октября, 7 октября");
assert.equal(formatPeriods(["2026-09-30", "2026-10-01"]), "30 сентября – 1 октября");
assert.equal(formatPeriods([]), "");

console.log("seo-positions ads: OK");
