import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

const NICHE_QUERIES: Record<string, string[]> = {
  "Стоматологии": ["стоматология", "стоматологическая клиника", "дантист"],
  "Строительство": ["строительная компания", "ремонт квартир", "строительство домов"],
  "Кафе и рестораны": ["кафе", "ресторан", "кофейня"],
  "Автосервисы": ["автосервис", "шиномонтаж", "кузовной ремонт"],
  "Юристы": ["юридическая компания", "адвокат", "юридические услуги"],
  "Клиники": ["медицинский центр", "клиника", "медцентр"],
  "Салоны красоты": ["салон красоты", "парикмахерская", "барбершоп"],
  "Фитнес-клубы": ["фитнес клуб", "тренажерный зал", "спортзал"],
  "Отели": ["гостиница", "отель", "хостел"],
  "Грузоперевозки": ["грузоперевозки", "транспортная компания", "доставка грузов"],
  "Интернет-магазины": ["интернет магазин", "онлайн магазин", "интернет-магазин"],
  "Недвижимость": ["агентство недвижимости", "риэлтор", "квартиры"],
  "Бухгалтерия": ["бухгалтерские услуги", "бухгалтер", "аутсорсинг"],
  "Рекламные агентства": ["рекламное агентство", "маркетинговое агентство", "digital агентство"],
  "Туризм": ["турагентство", "туроператор", "горящие туры"],
  "Образование": ["образовательный центр", "курсы", "репетитор"],
  "Производство": ["производственная компания", "завод", "производство"],
  "Сельское хозяйство": ["фермерское хозяйство", "агрокомплекс", "теплица"],
  "IT-компании": ["it компания", "веб-студия", "разработка по"],
  "Охранные предприятия": ["охранное предприятие", "чоп", "видеонаблюдение"],
};

const RU_DOMAIN = /\.(ru|рф|су|москва|moscow|дети)$/i;
const SKIP = /yandex|google|2gis|wikipedia|facebook|vk\.com|instagram|youtube|t\.me|telegram|avito|youla|cian|dzen/i;

async function searchWithPlaywright(query: string, city: string): Promise<string[]> {
  const domains: string[] = [];
  const seen = new Set<string>();
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    const searchText = `${query} ${city} сайт`;

    for (let p = 0; p < 30; p += 10) {
      const url = `https://yandex.ru/search/?text=${encodeURIComponent(searchText)}&p=${p / 10}&lr=225`;
      console.log(`[search] ${url}`);

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(2000);

        // Извлекаем все ссылки из результатов поиска
        const links = await page.evaluate(() => {
          const anchors = document.querySelectorAll("a[href]");
          return Array.from(anchors)
            .map(a => (a as HTMLAnchorElement).href)
            .filter(h => h.startsWith("http"));
        });

        for (const link of links) {
          try {
            const u = new URL(link);
            let d = u.hostname.replace(/^www\./, "").toLowerCase();
            if (!RU_DOMAIN.test(d)) continue;
            if (SKIP.test(d)) continue;
            if (d.length < 5 || !d.includes(".")) continue;
            if (seen.has(d)) continue;

            seen.add(d);
            domains.push(d);
          } catch {}
        }
      } catch (err) {
        console.error(`[search] page ${p} error:`, err);
      }

      if (domains.length >= 25) break;
      await page.waitForTimeout(1500);
    }

    await context.close();
  } catch (err) {
    console.error("[search] browser error:", err);
  } finally {
    await browser.close();
  }

  return domains;
}

export async function POST(req: NextRequest) {
  const { city, niche } = await req.json();
  if (!city || !niche) return NextResponse.json({ error: "city and niche required" }, { status: 400 });

  const queries = NICHE_QUERIES[niche] || [niche];
  const allDomains: string[] = [];
  const seen = new Set<string>();

  // Ищем по первому (основному) запросу — для скорости
  const mainQuery = queries[0];
  const domains = await searchWithPlaywright(mainQuery, city);

  for (const d of domains) {
    if (!seen.has(d)) { seen.add(d); allDomains.push(d); }
  }

  const sites = allDomains.slice(0, 30).map(d => ({
    domain: d,
    name: d.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    url: `https://${d}`,
  }));

  return NextResponse.json({ sites, source: "playwright", count: sites.length });
}
