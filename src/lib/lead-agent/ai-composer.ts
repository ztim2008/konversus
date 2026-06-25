/**
 * AI Composer — персонализированная генерация КП на основе анализа сайта.
 * Фетчит сайт → AI анализирует → пишет персональное предложение.
 */
import { callOpenRouter } from "@/lib/ai/openrouter";

interface SiteSnapshot {
  url: string;
  title: string;
  description: string;
  h1: string[];
  textContent: string;
}

interface KpContext {
  domain: string;
  niche: string;
  city: string;
  issues: string[];
  contactName?: string;
}

async function fetchSite(url: string): Promise<SiteSnapshot> {
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  const res = await fetch(normalized, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; KonversusBot/1.0)" },
  });
  const html = await res.text();

  // Простой парсинг без библиотек
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]?.trim() || "";
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || 
                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) || [])[1]?.trim() || "";
  const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi) || [];
  const h1 = h1Matches.map(h => h.replace(/<[^>]+>/g, "").trim()).filter(Boolean);

  // Извлекаем текст из body (первые 3000 символов)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const text = body
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);

  return { url: normalized, title, description: desc, h1, textContent: text };
}

const KP_SYSTEM_PROMPT = `Ты — Алексей Тимофеев, веб-разработчик и дизайнер с 17-летним опытом. 
Ты помогаешь бизнесу расти через улучшение их сайтов и digital-присутствия.

Твоя задача: написать ПЕРСОНАЛИЗИРОВАННОЕ коммерческое предложение владельцу бизнеса.

ПРАВИЛА:
1. НЕ используй шаблоны. Каждое письмо — уникальное.
2. Анализируй конкретный сайт: чем компания занимается, кто их клиенты, что у них хорошо, что плохо.
3. Найди 1-2 КОНКРЕТНЫЕ проблемы и предложи КОНКРЕТНОЕ решение.
4. Пиши как живой человек, не как робот. Можно с лёгким юмором.
5. Покажи что ты РЕАЛЬНО посмотрел их сайт — упомяни деталь, которую видно только при внимательном просмотре.
6. Будь полезным: дай один бесплатный совет, даже если они не закажут.
7. Объём: 150-250 слов.
8. Не используй markdown, пиши простым текстом с переносами строк.

СТРУКТУРА ПИСЬМА:
- Приветствие по имени (если нет имени — "Здравствуйте!")
- 1 предложение: что посмотрел и что заметил (конкретная деталь с их сайта)
- 1-2 предложения: какая проблема и почему это важно для их бизнеса
- 1-2 предложения: что предлагаешь и за какой срок
- 1 бесплатный совет
- Контакты: @bilarius (Telegram), +7 921 201-32-52
- Подпись: Алексей Тимофеев, Konversus · 17 лет в digital`;

export async function generatePersonalizedKP(ctx: KpContext): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  // Фетчим сайт
  let snapshot: SiteSnapshot;
  try {
    snapshot = await fetchSite(ctx.domain);
  } catch (err) {
    // Если сайт не загрузился — используем минимум данных
    snapshot = { url: ctx.domain, title: "", description: "", h1: [], textContent: "" };
  }

  // Собираем контекст для AI
  const siteInfo = [
    `URL: ${snapshot.url}`,
    `Title: ${snapshot.title || "не найден"}`,
    `Description: ${snapshot.description || "отсутствует"}`,
    `H1: ${snapshot.h1.join(" | ") || "не найден"}`,
    `Текст сайта (фрагмент): ${snapshot.textContent.slice(0, 2500)}`,
    "",
    `Ниша (по справочнику): ${ctx.niche}`,
    `Город: ${ctx.city}`,
    `Найденные проблемы: ${ctx.issues.join(", ") || "мелкие недочёты"}`,
    ctx.contactName ? `Имя контактного лица: ${ctx.contactName}` : "",
  ].filter(Boolean).join("\n");

  const result = await callOpenRouter(
    [
      { role: "system", content: KP_SYSTEM_PROMPT },
      { role: "user", content: `Данные сайта для персонализированного КП:\n\n${siteInfo}` },
    ],
    {
      apiKey,
      model: "deepseek/deepseek-chat",
      maxTokens: 800,
    }
  );

  return result.content.trim();
}
