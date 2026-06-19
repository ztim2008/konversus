import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36" });
  
  await page.goto("https://yandex.ru/search/?text=юристы+Москва+сайт&lr=225", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Сохраняем HTML для анализа
  const html = await page.content();
  require("fs").writeFileSync("/tmp/yandex-search.html", html);
  
  // Пробуем разные селекторы
  const selectors = [
    "li.serp-item",
    ".serp-item",
    "[data-cid]",
    "article",
    ".Organic",
    ".organic",
    "h2 a",
    ".Link",
    ".path",
  ];
  
  for (const sel of selectors) {
    const count = await page.locator(sel).count();
    if (count > 0) console.log(`✅ ${sel}: ${count}`);
  }

  // Пробуем найти ссылки
  const allLinks = await page.locator("a[href]").evaluateAll(els => 
    els.map(el => ({ href: (el as HTMLAnchorElement).href, text: el.textContent?.trim()?.slice(0, 60) }))
      .filter(l => l.href.startsWith("http") && !l.href.includes("yandex"))
      .slice(0, 10)
  );
  console.log("\n🔗 Ссылки (первые 10):");
  allLinks.forEach(l => console.log(`  ${l.text?.slice(0, 40)} → ${l.href.slice(0, 60)}`));

  await browser.close();
}
main();
