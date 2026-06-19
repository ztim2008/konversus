import { NextRequest, NextResponse } from "next/server";

// Большой справочник ниш
const NICHE_QUERIES: Record<string, string[]> = {
  "Стоматологии": ["стоматология", "стоматологическая клиника", "дантист", " dental clinic"],
  "Строительство": ["строительная компания", "строительство домов", "ремонт квартир", "строительная фирма"],
  "Кафе и рестораны": ["кафе", "ресторан", "кофейня", "доставка еды", "cafe"],
  "Автосервисы": ["автосервис", "автомастерская", "шиномонтаж", "кузовной ремонт", "car service"],
  "Юристы": ["юридическая компания", "адвокат", "юридические услуги", "law firm"],
  "Клиники": ["медицинский центр", "клиника", "медцентр", "medical clinic"],
  "Салоны красоты": ["салон красоты", "парикмахерская", "барбершоп", "beauty salon", "ногтевой сервис"],
  "Фитнес-клубы": ["фитнес клуб", "тренажерный зал", "спортзал", "йога студия", "fitness"],
  "Отели": ["гостиница", "отель", "хостел", "мини-отель", "hotel"],
  "Грузоперевозки": ["грузоперевозки", "транспортная компания", "перевозка грузов", "логистика"],
  "Интернет-магазины": ["интернет магазин", "онлайн магазин", "ecommerce", "доставка"],
  "Недвижимость": ["агентство недвижимости", "риэлтор", "квартиры", "real estate"],
  "Бухгалтерия": ["бухгалтерские услуги", "бухгалтер", "аутсорсинг бухгалтерии"],
  "Охранные предприятия": ["охранное предприятие", "чоп", "системы безопасности", "видеонаблюдение"],
  "Рекламные агентства": ["рекламное агентство", "маркетинговое агентство", "digital агентство", "контекстная реклама"],
  "Туризм": ["турагентство", "туроператор", "travel agency", "горящие туры"],
  "Образование": ["образовательный центр", "курсы", "репетитор", "школа", "training"],
  "Производство": ["производственная компания", "завод", "производство", "manufacturing"],
  "Сельское хозяйство": ["фермерское хозяйство", "агрокомплекс", "теплица", "сельхоз"],
  "IT-компании": ["it компания", "разработка по", "веб-студия", "software"],
};

const RU_DOMAIN = /\.(ru|рф|su|москва|moscow|дети)$/i;
const SKIP = /yandex|google|2gis|wikipedia|facebook|vk\.com|instagram|youtube|t\.me|telegram|avito|youla|cian/i;

async function searchYandex(query: string): Promise<string[]> {
  const domains: string[] = [];
  const seen = new Set<string>();

  try {
    for (let page = 0; page < 40; page += 10) {
      const url = `https://yandex.ru/search/?text=${encodeURIComponent(query + " сайт")}&p=${page / 10}&lr=225`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36", "Accept": "text/html", "Accept-Language": "ru-RU,ru;q=0.9" },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) break;
      const html = await res.text();
      
      const matches = html.matchAll(/href="https?:\/\/([^\/"]+)"/gi);
      for (const m of matches) {
        let d = m[1].replace(/^www\./, "").toLowerCase();
        if (!RU_DOMAIN.test(d) || SKIP.test(d) || d.length < 5) continue;
        if (seen.has(d)) continue;
        seen.add(d);
        domains.push(d);
      }
      if (domains.length >= 25) break;
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (e) { /* идём дальше */ }
  
  return domains;
}

export async function POST(req: NextRequest) {
  const { city, niche } = await req.json();
  if (!city || !niche) return NextResponse.json({ error: "city and niche required" }, { status: 400 });

  const queries = NICHE_QUERIES[niche] || [niche];
  const allDomains: string[] = [];
  const seen = new Set<string>();

  // Ищем по всем вариантам запросов
  for (const q of queries.slice(0, 3)) {
    const domains = await searchYandex(`${q} ${city}`);
    for (const d of domains) {
      if (!seen.has(d)) { seen.add(d); allDomains.push(d); }
    }
    if (allDomains.length >= 30) break;
  }

  const sites = allDomains.slice(0, 30).map(d => ({
    domain: d,
    name: d.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    url: `https://${d}`,
  }));

  return NextResponse.json({ sites, source: "yandex", count: sites.length });
}
