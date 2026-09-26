/**
 * AI Composer — персонализированное КП под активный профиль отправителя.
 * Модель: DeepSeek через OpenRouter.
 */
import { callOpenRouter } from "@/lib/ai/openrouter";
import { getSetting } from "@/lib/data/settings";
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
}

export type KpGenerateResult = {
  subject: string;
  bodyText: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
  source: "ai" | "fallback";
};

const DEEPSEEK_MODEL = "deepseek/deepseek-chat";

async function resolveOpenRouterKey(): Promise<string> {
  const fromEnv = (process.env.OPENROUTER_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  try {
    return (await getSetting("openrouter_api_key")).trim();
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

  const apiKey = await resolveOpenRouterKey();
  if (!apiKey) {
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
    console.error("[ai-composer] DeepSeek/OpenRouter error:", err);
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
