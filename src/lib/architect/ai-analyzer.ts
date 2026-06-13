/**
 * AI Analyzer — двухступенчатый анализ бизнеса через OpenRouter.
 *
 * Stage 1 (fast model — Gemini Flash): структурная экстракция.
 *   Вход: ArchitectSnapshot → JSON с нишей, аудиторией, проблемами, missing assets.
 *
 * Stage 2 (strong model — Claude/GPT-4): стратегия роста.
 *   Вход: структурированные данные → ArchitectReport (6 секций).
 */

import { callOpenRouter } from "@/lib/ai/openrouter";
import type { ArchitectReport, ArchitectSnapshot } from "@/lib/architect/types";

// ── Stage 1: Extraction ───────────────────────────────────────────────────

const STAGE1_SYSTEM = `Ты — аналитик данных. Получаешь снимок сайта/страницы и извлекаешь структурированные данные.
Отвечай СТРОГО валидным JSON без markdown-обёртки.

JSON-схема:
{
  "niche": "краткое описание ниши (1-2 слова)",
  "target_audience": "описание целевой аудитории (1 предложение)",
  "business_type": "B2B | B2C | C2C | marketplace-seller",
  "key_products_or_services": ["список товаров/услуг, до 5 пунктов"],
  "detected_problems": ["список очевидных проблем, до 7 пунктов"],
  "missing_assets": ["чего не хватает: SEO, блог, соцсети, отзывы, кейсы, etc."],
  "seo_signals": {
    "title_ok": true,
    "description_ok": true,
    "h1_ok": true,
    "schema_ok": true,
    "og_ok": true
  },
  "trust_signals": ["что есть: сертификаты, отзывы, кейсы, контакты, etc."]
}`;

interface Stage1Result {
  niche: string;
  target_audience: string;
  business_type: string;
  key_products_or_services: string[];
  detected_problems: string[];
  missing_assets: string[];
  seo_signals: Record<string, boolean>;
  trust_signals: string[];
}

async function runStage1(
  snapshot: ArchitectSnapshot,
  fastModel: string,
  apiKey: string
): Promise<Stage1Result> {
  const snapshotSummary = JSON.stringify({
    url: snapshot.url,
    source_type: snapshot.source_type,
    title: snapshot.title,
    description: snapshot.description,
    h1: snapshot.h1,
    headings: snapshot.headings?.slice(0, 10),
    cms: snapshot.cms,
    has_og_tags: snapshot.has_og_tags,
    has_schema_org: snapshot.has_schema_org,
    seo_title_length: snapshot.seo_title_length,
    seo_description_length: snapshot.seo_description_length,
    h1_count: snapshot.h1_count,
    image_count: snapshot.image_count,
    word_count: snapshot.word_count,
    external_scripts_count: snapshot.external_scripts_count,
    has_resource_hints: snapshot.has_resource_hints,
    // SEO-аудит: конкретные провалы повышают потенциал роста
    seo_score: snapshot.seo_metrics?.score ?? null,
    seo_fails: snapshot.seo_metrics?.checks
      .filter(c => c.status === "fail")
      .map(c => c.label) ?? [],
    seo_warns: snapshot.seo_metrics?.checks
      .filter(c => c.status === "warn")
      .map(c => c.label) ?? [],
    raw_text: snapshot.raw_text?.slice(0, 2000),
    seller_name: snapshot.seller_name,
    products: snapshot.products?.slice(0, 3),
  });

  const result = await callOpenRouter(
    [
      { role: "system", content: STAGE1_SYSTEM },
      {
        role: "user",
        content: `Данные бизнеса:\n${snapshotSummary}`,
      },
    ],
    { apiKey, model: fastModel, maxTokens: 1500 }
  );

  return parseJsonSafe<Stage1Result>(result.content, {
    niche: "неизвестно",
    target_audience: "не определено",
    business_type: "B2C",
    key_products_or_services: [],
    detected_problems: [],
    missing_assets: [],
    seo_signals: {},
    trust_signals: [],
  });
}

// ── Stage 2: Strategy ─────────────────────────────────────────────────────

const STAGE2_SYSTEM = `Ты — AI-архитектор роста бизнеса. Твоя задача — не просто дать аналитику, а показать КОНКРЕТНЫЕ ПУТИ РОСТА ДОХОДА.

Получаешь структурированные данные бизнеса. Формируешь стратегический отчёт.

Отвечай СТРОГО валидным JSON без markdown-обёртки.

JSON-схема ответа (без пояснений, только JSON):
{
  "growth_potential_pct": <число от 10 до 80, ТОЛЬКО ЦЕЛОЕ>,
  "verdict": "2-3 предложения. Конкретно и честно о главной проблеме.",
  "niche": "ниша одной строкой",
  "target_audience": "целевая аудитория одним предложением",
  "positioning_map": {
    "current_image": "Как бизнес выглядит сейчас",
    "perceived_audience": "Кто реально приходит",
    "potential_image": "Каким может стать при правильной упаковке",
    "positioning_gaps": ["разрыв 1", "разрыв 2", "разрыв 3"],
    "brand_keywords": ["слово1", "слово2", "слово3", "слово4"]
  },
  "revenue_leaks": [
    {
      "channel": "название канала",
      "status": "missing|weak|present",
      "estimated_loss": "X ₽/мес или диапазон",
      "description": "почему теряет здесь"
    }
  ],
  "growth_opportunities": [
    {
      "title": "название",
      "description": "что сделать и почему принесёт доход",
      "impact": "high|medium|low",
      "effort": "high|medium|low",
      "type": "SEO|контент|лендинг|соцсети|маркетплейс|автоматизация|упаковка"
    }
  ],
  "roadmap": [
    {
      "task": "конкретная задача",
      "category": "SEO|Design|Content|Tech|Marketing",
      "complexity": "easy|medium|hard",
      "timeline": "срок",
      "revenue_impact_pct": <число от 5 до 40>
    }
  ],
  "digital_assets": [
    {
      "asset": "название актива",
      "purpose": "зачем нужен",
      "priority": "must|should|nice"
    }
  ],
  "top_actions": [
    {
      "title": "конкретное действие (до 8 слов)",
      "reason": "одно предложение — почему именно это даст максимальный ROI",
      "category": "SEO | Дизайн | Аналитика | Контент | Техника | Маркетинг"
    }
  ],
  "summary": "2-3 предложения финального призыва к действию"
}

ВАЖНО для top_actions: ровно 3 действия, строго по убыванию ROI. Это не повторение roadmap — это ГЛАВНЫЙ ВЫВОД всего анализа. Учитывай SEO fails, отсутствие аналитики, слабый дизайн, потери дохода — и выбирай то, что быстрее всего изменит ситуацию. Первое действие должно быть самым срочным.

═══ КАК РАССЧИТАТЬ growth_potential_pct ═══
Это процент ПРИРОСТА дохода который можно получить за 6-12 месяцев при выполнении roadmap.
Считай по следующей шкале — выбирай ОДНО значение:

10-20%: сайт почти идеален. SEO score > 85, есть Schema, OG, H1, description, alt, canonical. Сильный бренд, активные соцсети, хорошие отзывы. Резервы минимальны.

21-35%: приличный сайт с точечными проблемами. Часть SEO-сигналов есть, но есть 2-4 warn. Нет Schema или canonical. Соцсети слабые или нет. Нет Schema.org.

36-50%: типичный средний сайт. SEO score 40-70. Отсутствует H1 или description. OG частично. Нет структурных данных. Соцсетей нет или мертвые.

51-65%: слабый сайт. SEO score < 40. Несколько fail-проверок. Нет description, H1, OG, alt у изображений. Нет контактов в schema. Нет блога/контента.

66-80%: катастрофа. SEO score < 20, множество fail. Нет мобильной адаптации, нет HTTPS, нет мета-тегов, нет H1. Или вообще нет сайта (только маркетплейс).

ВАЖНО: seo_score уже вычислен автоматически и передан в данных. Используй его как основной сигнал. Не округляй до 55 — выбирай реальное значение из шкалы выше.`;


async function runStage2(
  stage1: Stage1Result,
  snapshot: ArchitectSnapshot,
  strongModel: string,
  apiKey: string
): Promise<ArchitectReport> {
  const input = JSON.stringify({
    url: snapshot.url,
    source_type: snapshot.source_type,
    seo_score: snapshot.seo_metrics?.score ?? null,
    ...stage1,
  });

  const result = await callOpenRouter(
    [
      { role: "system", content: STAGE2_SYSTEM },
      {
        role: "user",
        content: `Данные бизнеса для стратегического анализа:\n${input}`,
      },
    ],
    { apiKey, model: strongModel, maxTokens: 4000 }
  );

  const parsed = parseJsonSafe<ArchitectReport | null>(result.content, null);
  if (!parsed) {
    throw new Error("Stage 2: не удалось распарсить JSON от AI");
  }

  return { ...parsed, model_used: result.model };
}

// ── Main entry point ──────────────────────────────────────────────────────

export async function analyzeWithAI(
  snapshot: ArchitectSnapshot,
  params: {
    fastModel: string;
    strongModel: string;
    apiKey: string;
  }
): Promise<{ report: ArchitectReport; model_used: string }> {
  const stage1 = await runStage1(snapshot, params.fastModel, params.apiKey);
  const report = await runStage2(
    stage1,
    snapshot,
    params.strongModel,
    params.apiKey
  );

  // ── Санация growth_potential_pct ──────────────────────────────────────
  // Если AI вернул некорректное значение — вычисляем детерминированно по SEO-score
  const rawPct = report.growth_potential_pct;
  if (!rawPct || rawPct < 10 || rawPct > 80 || rawPct === 55) {
    const seoScore = snapshot.seo_metrics?.score ?? 50;
    report.growth_potential_pct = calcGrowthPotential(seoScore, stage1);
  }

  return {
    report,
    model_used: `${params.fastModel} → ${params.strongModel}`,
  };
}

/**
 * Детерминированный расчёт потенциала роста по объективным сигналам.
 * Используется как fallback если AI вернул подозрительное значение.
 */
function calcGrowthPotential(seoScore: number, stage1: Stage1Result): number {
  let score = 0;

  // SEO score (max 40 pts)
  if (seoScore >= 85) score += 10;
  else if (seoScore >= 70) score += 20;
  else if (seoScore >= 50) score += 30;
  else if (seoScore >= 30) score += 38;
  else score += 45;

  // Кол-во missing assets (max 20 pts)
  const missingCount = stage1.missing_assets?.length ?? 0;
  if (missingCount >= 6) score += 20;
  else if (missingCount >= 4) score += 15;
  else if (missingCount >= 2) score += 10;
  else score += 3;

  // Кол-во проблем (max 15 pts)
  const problemCount = stage1.detected_problems?.length ?? 0;
  if (problemCount >= 6) score += 15;
  else if (problemCount >= 4) score += 10;
  else if (problemCount >= 2) score += 6;
  else score += 2;

  // Trust signals (max 5 pts) — чем меньше, тем больше потенциал
  const trustCount = stage1.trust_signals?.length ?? 0;
  if (trustCount === 0) score += 5;
  else if (trustCount <= 2) score += 3;

  // Clamp to 10-80
  return Math.max(10, Math.min(80, score));
}

// ── JSON parse helper with retry ─────────────────────────────────────────

function parseJsonSafe<T>(raw: string, fallback: T): T {
  // Убираем markdown-обёртку если AI всё же вернул её
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Попробуем найти JSON внутри текста
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}
