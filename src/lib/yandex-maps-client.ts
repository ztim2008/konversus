import "server-only";
import { chromium } from "playwright";

export interface YandexLead {
  source: "yandex";
  domain: string;
  name: string;
  url: string;
  phone?: string;
}

const RU_DOMAIN = /\.(ru|рф|су|москва|moscow|дети)$/i;
const SKIP = /yandex|google|2gis|wikipedia|facebook|vk\.com|instagram|youtube|t\.me|telegram|avito|youla|cian|dzen|ya\.ru|yastatic|wildberries|ozon|vseinstrumenti|leroymerlin|dns-shop/i;

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

async function searchYandexMaps(query: string, city: string): Promise<string[]> {
  const domains: string[] = [];
  const seen = new Set<string>();
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "ru-RU",
    });
    const page = await context.newPage();

    const searchUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(query + " " + city)}`;
    console.log(`[yandex-maps] ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    // Yandex.Maps грузится дольше Google — ждём
    await page.waitForTimeout(6000);

    // Скроллим карточки слева
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => {
        const panel = document.querySelector(".search-list-view__list") || document.querySelector('[class*="scroll"]') || document.body;
        panel.scrollBy(0, 400);
      });
      await page.waitForTimeout(1500);
    }

    // Собираем ссылки с сайтов
    const links = await page.evaluate(() => {
      const results: string[] = [];
      const allLinks = document.querySelectorAll("a[href]");
      allLinks.forEach(a => {
        const h = (a as HTMLAnchorElement).href;
        // Ищем внешние ссылки (не яндекс, не карты)
        if (h.startsWith("http") && !h.includes("yandex") && !h.includes("yastatic") && !h.includes("ya.ru")) {
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
    console.error("[yandex-maps] error:", err);
  } finally {
    await browser.close();
  }

  return domains;
}

export async function searchYandex(
  niche: string,
  city: string,
  onProgress?: (source: string, count: number) => void
): Promise<YandexLead[]> {
  const queries = NICHE_QUERIES[niche] || [niche];
  const allDomains: string[] = [];
  const seen = new Set<string>();

  for (const q of queries.slice(0, 2)) {
    try {
      const domains = await searchYandexMaps(q, city);
      for (const d of domains) {
        if (!seen.has(d)) {
          seen.add(d);
          allDomains.push(d);
        }
      }
    } catch {}

    if (onProgress) onProgress("yandex", allDomains.length);
    if (allDomains.length >= 25) break;
  }

  return allDomains.slice(0, 30).map(d => ({
    source: "yandex" as const,
    domain: d,
    name: d.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    url: `https://${d}`,
  }));
}
