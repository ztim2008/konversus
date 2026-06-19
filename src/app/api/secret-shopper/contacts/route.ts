import { NextRequest, NextResponse } from "next/server";

// Извлекает контакты с сайта через AI
export async function POST(req: NextRequest) {
  const { sites } = await req.json();
  if (!Array.isArray(sites)) return NextResponse.json({ error: "sites array required" }, { status: 400 });

  const results: Array<{ domain: string; phone?: string; email?: string; vk?: string; telegram?: string }> = [];

  for (const site of sites.slice(0, 10)) {
    try {
      // Пытаемся достать HTML сайта
      const res = await fetch(`https://${site.domain}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
        redirect: "follow",
      });
      const html = await res.text();

      // Ищем телефон (российские форматы)
      const phoneMatch = html.match(/(?:\+7|8)[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/);
      // Ищем email
      const emailMatch = html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
      // Ищем VK
      const vkMatch = html.match(/vk\.com\/([a-z0-9_.]+)/i);
      // Ищем Telegram
      const tgMatch = html.match(/(?:t\.me|telegram\.me)\/([a-z0-9_]+)/i);

      results.push({
        domain: site.domain,
        phone: phoneMatch?.[0] || undefined,
        email: emailMatch?.[0] || undefined,
        vk: vkMatch ? `https://vk.com/${vkMatch[1]}` : undefined,
        telegram: tgMatch ? `@${tgMatch[1]}` : undefined,
      });
    } catch {
      results.push({ domain: site.domain });
    }

    // Задержка между запросами
    await new Promise(r => setTimeout(r, 500));
  }

  return NextResponse.json({ contacts: results });
}
