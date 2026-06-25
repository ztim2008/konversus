import "server-only";
import { chromium } from "playwright";

export interface GoogleLead {
  source: "google";
  domain: string;
  name: string;
  url: string;
  phone?: string;
  email?: string;
}

const RU_DOMAIN = /\.(ru|рф|су|москва|moscow|дети)$/i;
const SKIP = /yandex|google|2gis|wikipedia|facebook|vk\.com|instagram|youtube|t\.me|telegram|avito|youla|cian|dzen|ya\.ru|yastatic/i;

const NICHE_QUERIES: Record<string, string[]> = {
  "Стоматологии": ["стоматология", "стоматологическая клиника"],
  "Строительство": ["строительная компания", "ремонт квартир"],
  "Кафе и рестораны": ["кафе", "ресторан"],
  "Автосервисы": ["автосервис", "шиномонтаж"],
  "Юристы": ["юридическая компания", "адвокат"],
  "Клиники": ["медицинский центр", "клиника"],
  "Салоны красоты": ["салон красоты", "парикмахерская"],
  "Фитнес-клубы": ["фитнес клуб", "тренажерный зал"],
  "Отели": ["гостиница", "отель"],
  "Грузоперевозки": ["грузоперевозки", "транспортная компания"],
  "Интернет-магазины": ["интернет магазин", "онлайн магазин"],
  "Недвижимость": ["агентство недвижимости", "риэлтор"],
  "Бухгалтерия": ["бухгалтерские услуги", "бухгалтер"],
  "Рекламные агентства": ["рекламное агентство", "маркетинговое агентство"],
  "Туризм": ["турагентство", "туроператор"],
  "Образование": ["образовательный центр", "курсы"],
  "Производство": ["производственная компания", "завод"],
  "IT-компании": ["it компания", "веб-студия"],
};

async function searchGoogleMaps(query: string, city: string): Promise<string[]> {
  const domains: string[] = [];
  const seen = new Set<string>();
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(query + " " + city)}`;
    console.log(`[google-maps] ${mapsUrl}`);

    await page.goto(mapsUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(5000);

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const panel = document.querySelector('[role="feed"], .m6QErb') || document.body;
        panel.scrollBy(0, 500);
      });
      await page.waitForTimeout(1500);
    }

    const links = await page.evaluate(() => {
      const results: string[] = [];
      document.querySelectorAll("a[href]").forEach(a => {
        const h = (a as HTMLAnchorElement).href;
        if (h.startsWith("http") && !h.includes("google") && !h.includes("gstatic")) {
          results.push(h);
        }
      });
      return results;
    });

    for (const link of links) {
      try {
        const u = new URL(link);
        let d = u.hostname.replace(/^www\./, "").toLowerCase();
        if (!RU_DOMAIN.test(d)) continue;
        if (SKIP.test(d)) continue;
        if (d.length < 5) continue;
        if (seen.has(d)) continue;
        seen.add(d);
        domains.push(d);
      } catch {}
    }

    await context.close();
  } catch (err) {
    console.error("[google-maps] error:", err);
  } finally {
    await browser.close();
  }

  return domains;
}

async function search2GISWeb(query: string, city: string): Promise<string[]> {
  const domains: string[] = [];
  const seen = new Set<string>();
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    const searchUrl = `https://2gis.ru/${encodeURIComponent(city.toLowerCase())}/search/${encodeURIComponent(query)}`;
    console.log(`[2gis-web] ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(4000);

    const links = await page.evaluate(() => {
      const results: string[] = [];
      document.querySelectorAll("a[href]").forEach(a => {
        const h = (a as HTMLAnchorElement).href;
        if (h.startsWith("http") && !h.includes("2gis") && !h.includes("google")) {
          results.push(h);
        }
      });
      return results;
    });

    for (const link of links) {
      try {
        const u = new URL(link);
        let d = u.hostname.replace(/^www\./, "").toLowerCase();
        if (!RU_DOMAIN.test(d)) continue;
        if (SKIP.test(d)) continue;
        if (d.length < 5) continue;
        if (seen.has(d)) continue;
        seen.add(d);
        domains.push(d);
      } catch {}
    }

    await context.close();
  } catch (err) {
    console.error("[2gis-web] error:", err);
  } finally {
    await browser.close();
  }

  return domains;
}

export async function searchGoogle(
  niche: string,
  city: string,
  onProgress?: (source: string, count: number) => void
): Promise<GoogleLead[]> {
  // Если ниша есть в справочнике — используем подзапросы. Иначе — ниша как есть.
  const queries = NICHE_QUERIES[niche] || [niche.toLowerCase()];
  const allDomains: string[] = [];
  const seen = new Set<string>();

  for (const q of queries.slice(0, 2)) {
    const [gmDomains, gisDomains] = await Promise.all([
      searchGoogleMaps(q, city).catch(() => [] as string[]),
      search2GISWeb(q, city).catch(() => [] as string[]),
    ]);

    const domains = [...gmDomains, ...gisDomains];
    for (const d of domains) {
      if (!seen.has(d)) {
        seen.add(d);
        allDomains.push(d);
      }
    }

    if (onProgress) onProgress("google", allDomains.length);
    if (allDomains.length >= 25) break;
  }

  return allDomains.slice(0, 30).map(d => ({
    source: "google" as const,
    domain: d,
    name: d.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    url: `https://${d}`,
  }));
}
