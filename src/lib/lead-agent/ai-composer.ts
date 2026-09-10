/**
 * AI Composer — персонализированное КП под бренд lead-web.pro.
 */
import { callOpenRouter } from "@/lib/ai/openrouter";

interface SiteSnapshot {
  url: string;
  title: string;
  description: string;
  h1: string[];
  textContent: string;
}

export interface KpContext {
  domain: string;
  niche: string;
  city: string;
  issues: string[];
  contactName?: string;
  cms?: string;
  travel?: boolean;
}

export type KpGenerateResult = {
  subject: string;
  bodyText: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
  source: "ai" | "fallback";
};

async function fetchSite(url: string): Promise<SiteSnapshot> {
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  const res = await fetch(normalized, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadWebRadar/1.0)" },
  });
  const html = await res.text();

  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]?.trim() || "";
  const desc =
    (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
      [])[1]?.trim() || "";
  const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi) || [];
  const h1 = h1Matches.map((h) => h.replace(/<[^>]+>/g, "").trim()).filter(Boolean);

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

const KP_SYSTEM_PROMPT = `Ты пишешь исходящие письма от команды lead-web.pro (веб-разработка и заявки с сайта).
Не упоминай Konversus. Бренд только lead-web.pro.

Задача: короткий персональный текст письма владельцу бизнеса (тело без HTML).

ПРАВИЛА:
1. Не шаблонничай — опирайся на факты сайта.
2. Учти CMS/платформу: Tilda/Wix — аккуратно про рост и стабильность; WordPress — скорость/дизайн; Битрикс — доработки; самописный — как плюс зрелости.
3. 1–2 конкретные проблемы и зачем это бьёт по заявкам.
4. 1 мысль: как автоматизация или доработка сайта даст рост.
5. Живой тон, без угроз и без «вы нарушаете закон». Про риски cookie/политики — мягко.
6. Один бесплатный совет.
7. 120–200 слов. Без markdown. Без темы письма в теле. Без блока контактов в конце (их добавит шаблон).
8. Не описывай скриншот — он будет в письме отдельно.

СТРУКТУРА:
- Приветствие (по имени если есть, иначе «Здравствуйте!»)
- Что посмотрели и одна конкретная деталь
- Проблема → влияние на заявки
- Что можем предложить коротко
- Бесплатный совет
- Мягкий переход: можно разобрать подробнее (без URL)`;

function fallbackBody(ctx: KpContext): string {
  const issues = (ctx.issues || []).slice(0, 3).join("; ") || "несколько точек роста по сайту";
  return `Здравствуйте${ctx.contactName ? `, ${ctx.contactName}` : ""}!

Посмотрели сайт ${ctx.domain}${ctx.city ? ` (${ctx.city})` : ""}${ctx.cms ? `, платформа ${ctx.cms}` : ""}. Заметили: ${issues}.

Это часто снижает конверсию в заявки даже при хорошем трафике. Можем коротко разобрать, что поправить в первую очередь и где поможет автоматизация или доработка сайта.

Кейсы по всей России — на lead-web.pro. Если откликнется — ответьте на письмо, подскажем без обязательства.`;
}

export async function generatePersonalizedKP(ctx: KpContext): Promise<KpGenerateResult> {
  const subjectBase = ctx.domain.replace(/^www\./, "");
  const defaultSubject = `Посмотрел сайт ${subjectBase}: пара идей по заявкам`;

  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) {
    return {
      subject: defaultSubject,
      bodyText: fallbackBody(ctx),
      tokensIn: 0,
      tokensOut: 0,
      model: "none",
      source: "fallback",
    };
  }

  let snapshot: SiteSnapshot;
  try {
    snapshot = await fetchSite(ctx.domain);
  } catch {
    snapshot = { url: ctx.domain, title: "", description: "", h1: [], textContent: "" };
  }

  const siteInfo = [
    `URL: ${snapshot.url}`,
    `Title: ${snapshot.title || "не найден"}`,
    `Description: ${snapshot.description || "отсутствует"}`,
    `H1: ${snapshot.h1.join(" | ") || "не найден"}`,
    `Текст сайта (фрагмент): ${snapshot.textContent.slice(0, 2500)}`,
    "",
    `CMS/платформа: ${ctx.cms || "не определена"}`,
    `Ниша: ${ctx.niche}`,
    `Город: ${ctx.city}`,
    `Выезд возможен: ${ctx.travel ? "да" : "нет (удалённо + кейсы РФ)"}`,
    `Найденные проблемы: ${ctx.issues.join(", ") || "мелкие недочёты"}`,
    ctx.contactName ? `Имя: ${ctx.contactName}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await callOpenRouter(
      [
        { role: "system", content: KP_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Напиши только текст тела письма (без темы).\n\nДанные:\n\n${siteInfo}`,
        },
      ],
      {
        apiKey,
        model: "deepseek/deepseek-chat",
        maxTokens: 800,
      }
    );

    return {
      subject: defaultSubject,
      bodyText: result.content.trim(),
      tokensIn: result.usage.promptTokens,
      tokensOut: result.usage.completionTokens,
      model: result.model,
      source: "ai",
    };
  } catch {
    return {
      subject: defaultSubject,
      bodyText: fallbackBody(ctx),
      tokensIn: 0,
      tokensOut: 0,
      model: "none",
      source: "fallback",
    };
  }
}

/** @deprecated используйте generatePersonalizedKP → bodyText */
export async function generatePersonalizedKPText(ctx: KpContext): Promise<string> {
  const r = await generatePersonalizedKP(ctx);
  return r.bodyText;
}
