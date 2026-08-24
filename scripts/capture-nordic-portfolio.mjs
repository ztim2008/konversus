#!/usr/bin/env node
/**
 * Снимки первого экрана живых сайтов Nordic → portfolio/services/*.jpg
 * Запуск: node scripts/capture-nordic-portfolio.mjs
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "portfolio", "services");
fs.mkdirSync(OUT, { recursive: true });

const SITES = [
  { id: "konversus", url: "https://konversus.ru/" },
  { id: "leads", url: "https://leads.konversus.ru/" },
  { id: "chat", url: "https://chat.konversus.ru/" },
  { id: "architect", url: "https://konversus.ru/architect" },
  { id: "nordic-builder", url: "https://nordic-builder.ru/" },
  { id: "craft-nordic", url: "https://craft.nordic-builder.ru/" },
  { id: "nordic-store", url: "https://nordic-builder.store/" },
  { id: "proektmap", url: "https://proektmap.ru/" },
  { id: "prokuklyash", url: "https://prokuklyash.ru/" },
  { id: "marketfon", url: "https://xn----7sbptikgmuv.xn--p1ai/" },
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: "ru-RU",
  });
  const page = await context.newPage();
  const results = [];

  for (const site of SITES) {
    const file = `${site.id}.jpg`;
    const dest = path.join(OUT, file);
    try {
      console.log("SHOT", site.id);
      await page.goto(site.url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: dest, type: "jpeg", quality: 82, fullPage: false });
      results.push({ id: site.id, ok: true, file, bytes: fs.statSync(dest).size });
      console.log(" OK", file);
    } catch (e) {
      results.push({ id: site.id, ok: false, error: String(e.message || e) });
      console.log(" FAIL", site.id, e.message);
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(results, null, 2));
  console.log("DONE", results.filter((r) => r.ok).length + "/" + results.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
