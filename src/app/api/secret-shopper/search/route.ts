import { NextRequest, NextResponse } from "next/server";

const RU_DOMAINS = /\.(ru|рф|su|москва|moscow|дети|xn--[a-z0-9]+)$/i;
const SKIP_DOMAINS = /yandex|google|2gis|wikipedia|facebook|vk\.com|instagram|youtube|t\.me|telegram/i;

export async function POST(req: NextRequest) {
  const { city, niche } = await req.json();
  if (!city || !niche) return NextResponse.json({ error: "city and niche required" }, { status: 400 });

  const query = `${niche} ${city} сайт`;
  const results: Array<{ domain: string; name: string; url: string }> = [];
  const seen = new Set<string>();

  try {
    for (let page = 0; page < 30; page += 10) {
      const searchUrl = `https://yandex.ru/search/?text=${encodeURIComponent(query)}&p=${page / 10}&lr=225`; // lr=225 = Россия
      
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
          "Accept": "text/html",
          "Accept-Language": "ru-RU,ru;q=0.9",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) break;

      const html = await res.text();
      const linkPattern = /href="https?:\/\/([^\/"]+)"/gi;
      let match;

      while ((match = linkPattern.exec(html)) !== null) {
        let domain = match[1].replace(/^www\./, "").toLowerCase();
        
        // Только Россия
        if (!RU_DOMAINS.test(domain)) continue;
        // Пропускаем поисковики и соцсети
        if (SKIP_DOMAINS.test(domain)) continue;
        if (domain.length < 5 || !domain.includes(".")) continue;
        if (seen.has(domain)) continue;

        seen.add(domain);
        results.push({
          domain,
          name: domain.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          url: `https://${domain}`,
        });
      }

      if (results.length >= 20) break;
      await new Promise(r => setTimeout(r, 1500));
    }
  } catch (err) {
    console.error("[search] Yandex error:", err);
  }

  // Моки если ничего не нашли
  if (results.length === 0) {
    return NextResponse.json({ sites: generateMocks(city, niche), source: "mock" });
  }

  return NextResponse.json({ sites: results.slice(0, 20), source: "yandex" });
}

function generateMocks(city: string, niche: string) {
  const words = ["pro", "elite", "good", "top", "vip", "lux", "prime", "art", "neo", "max"];
  return words.map((w, i) => ({
    domain: `${niche.toLowerCase().replace(/\s/g, "-")}-${w}-${i}.ru`,
    name: `${niche} «${w}» ${city}`,
    url: `https://${niche.toLowerCase().replace(/\s/g, "-")}-${w}-${i}.ru`,
  }));
}
