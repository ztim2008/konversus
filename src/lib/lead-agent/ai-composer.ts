/**
 * AI Composer — персонализированное КП под активный профиль отправителя.
 * Модель: DeepSeek через OpenRouter.
 */
import { callDeepSeek } from "@/lib/ai/deepseek";
import { getSetting } from "@/lib/data/settings";
import { GEO_CITIES_V1 } from "@/lib/lead-radar-geo";
import {
  decodeHtmlEntities,
  extractH1Texts,
  pickHonestH1,
  readResponseHtml,
} from "@/lib/lead-radar/page-facts";
import {
  buildKpFallbackBody,
  buildKpSystemPrompt,
  getActiveSenderProfile,
} from "@/lib/lead-radar/sender-profiles";

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
  /** Страница из поиска. Без неё агент открывает корень домена и берёт чужой H1. */
  pageUrl?: string;
}

export type KpGenerateResult = {
  subject: string;
  bodyText: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
  source: "ai" | "fallback";
};

const DEEPSEEK_MODEL = "deepseek-chat";

async function resolveDeepSeekKey(): Promise<string> {
  const fromEnv = (process.env.DEEPSEEK_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  try {
    return (await getSetting("deepseek_api_key")).trim();
  } catch {
    return "";
  }
}

async function fetchSite(url: string): Promise<SiteSnapshot> {
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  const res = await fetch(normalized, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadWebRadar/1.0)" },
  });
  const html = await readResponseHtml(res);
  const cityNames = GEO_CITIES_V1.map((city) => city.name);

  const title = decodeHtmlEntities(
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/<[^>]+>/g, " ") || ""
  )
    .replace(/\s+/g, " ")
    .trim();
  const desc = decodeHtmlEntities(
    (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
      [])[1] || ""
  ).trim();
  const h1 = extractH1Texts(html);
  const honest = pickHonestH1(h1, cityNames);

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const text = decodeHtmlEntities(
    body
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);

  return { url: normalized, title, description: desc, h1: honest ? [honest] : [], textContent: text };
}

export async function generatePersonalizedKP(ctx: KpContext): Promise<KpGenerateResult> {
  const profile = await getActiveSenderProfile();
  const systemPrompt = buildKpSystemPrompt(profile);
  const fallback = () =>
    buildKpFallbackBody(profile, {
      domain: ctx.domain,
      city: ctx.city,
      cms: ctx.cms,
      contactName: ctx.contactName,
      issues: ctx.issues,
    });

  const subjectBase = ctx.domain.replace(/^www\./, "");
  const defaultSubject = `Посмотрел сайт ${subjectBase}: пара идей по заявкам`;

  const apiKey = await resolveDeepSeekKey();
  if (!apiKey) {
    console.error("[ai-composer] DEEPSEEK_API_KEY не задан, КП — шаблон");
    return {
      subject: defaultSubject,
      bodyText: fallback(),
      tokensIn: 0,
      tokensOut: 0,
      model: "none",
      source: "fallback",
    };
  }

  let snapshot: SiteSnapshot;
  try {
    snapshot = await fetchSite(ctx.pageUrl || ctx.domain);
  } catch {
    snapshot = { url: ctx.domain, title: "", description: "", h1: [], textContent: "" };
  }

  const siteInfo = [
    `URL: ${snapshot.url}`,
    `Title: ${snapshot.title || "не найден"}`,
    `Description: ${snapshot.description || "отсутствует"}`,
    `H1: ${snapshot.h1.join(" | ") || "не найден — не выдумывай заголовок страницы и не цитируй его"}`,
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
    const result = await callDeepSeek(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Напиши только текст тела письма (без темы).\n\nДанные:\n\n${siteInfo}`,
        },
      ],
      {
        apiKey,
        model: DEEPSEEK_MODEL,
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
  } catch (err) {
    console.error("[ai-composer] DeepSeek error:", err);
    return {
      subject: defaultSubject,
      bodyText: fallback(),
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
