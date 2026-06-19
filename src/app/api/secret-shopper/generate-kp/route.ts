import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { domain, issues, niche, city } = await req.json();
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });

  try {
    const prompt = `Ты — Алексей Тимофеев, веб-разработчик с 17-летним опытом. Напиши персонализированное КП владельцу сайта ${domain} (ниша: ${niche}, ${city}). Проблемы сайта: ${(issues || []).join(", ") || "мелкие недочёты"}. Структура: приветствие → что проверил → какие проблемы → почему важно → что предлагаешь (2-3 дня) → контакты @bilarius +7 921 201-32-52 → первая консультация бесплатно. Пиши как живой человек. До 200 слов.`;

    const key = process.env.OPENROUTER_API_KEY || "";
    if (!key) throw new Error("no key");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}`, "HTTP-Referer": "https://konversus.ru" },
      body: JSON.stringify({ model: "deepseek/deepseek-chat", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 400 }),
      signal: AbortSignal.timeout(20000),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    if (text) return NextResponse.json({ kp: text, source: "ai" });
  } catch {}

  return NextResponse.json({ kp: `Здравствуйте!\n\nПроверил ваш сайт ${domain}. Нашёл: ${(issues||[]).join(", ")||"мелкие недочёты"}.\n\nГотов исправить за 2-3 дня. Портфолио: behance.net/timofeev_aleksey\n\n@bilarius | +7 921 201-32-52`, source: "fallback" });
}
