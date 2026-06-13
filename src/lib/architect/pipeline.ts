/**
 * Pipeline — оркестратор анализа.
 * Вызывается через void (без await) из API Route.
 * Последовательно: collect → snapshot → analyze → result.
 */

import {
  markArchitectFailed,
  updateArchitectResult,
  updateArchitectSnapshot,
  updateArchitectStatus,
} from "@/lib/data/architect";
import { collectSnapshot } from "@/lib/architect/data-collector";
import { analyzeWithAI } from "@/lib/architect/ai-analyzer";
import { analyzeVisual } from "@/lib/architect/visual-analyzer";
import { getAllSettings } from "@/lib/data/settings";
import type { SourceType, SpeedAudit } from "@/lib/architect/types";
import { readdir, unlink, stat } from "fs/promises";
import { join } from "path";

/** Удаляет скриншоты старше 7 дней */
async function cleanOldScreenshots() {
  try {
    const dir = join(process.cwd(), "public", "screenshots");
    const files = await readdir(dir).catch(() => []);
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const file of files) {
      if (!file.endsWith(".jpg")) continue;
      const s = await stat(join(dir, file)).catch(() => null);
      if (s && s.mtimeMs < cutoff) {
        await unlink(join(dir, file)).catch(() => undefined);
      }
    }
  } catch {
    // ignore
  }
}

// ── Google PageSpeed Insights ─────────────────────────────────────────────

interface PsAuditValue { numericValue?: number }
interface PsResult {
  categories?: { performance?: { score?: number } };
  audits?: {
    "first-contentful-paint"?: PsAuditValue;
    "largest-contentful-paint"?: PsAuditValue;
    "total-blocking-time"?: PsAuditValue;
    "cumulative-layout-shift"?: PsAuditValue;
    "interactive"?: PsAuditValue;
  };
}

/**
 * Запрашивает Google PageSpeed Insights (mobile strategy).
 * API ключ опционален — без него работает до 25k запросов/день.
 * Если API недоступен (таймаут, ошибка) — возвращает null, не ломает pipeline.
 */
async function fetchPageSpeedInsights(
  url: string,
  apiKey?: string
): Promise<Partial<SpeedAudit> | null> {
  try {
    const params = new URLSearchParams({
      url,
      strategy: "mobile",
      fields: [
        "lighthouseResult.categories.performance",
        "lighthouseResult.audits.first-contentful-paint",
        "lighthouseResult.audits.largest-contentful-paint",
        "lighthouseResult.audits.total-blocking-time",
        "lighthouseResult.audits.cumulative-layout-shift",
        "lighthouseResult.audits.interactive",
      ].join(","),
    });
    if (apiKey) params.set("key", apiKey);

    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(35_000) });
    if (!res.ok) return null;

    const data = (await res.json()) as { lighthouseResult?: PsResult };
    const lr = data.lighthouseResult;
    if (!lr) return null;

    const perfScore = lr.categories?.performance?.score;
    const fcp = lr.audits?.["first-contentful-paint"]?.numericValue;
    const lcp = lr.audits?.["largest-contentful-paint"]?.numericValue;
    const tbt = lr.audits?.["total-blocking-time"]?.numericValue;
    const cls = lr.audits?.["cumulative-layout-shift"]?.numericValue;
    const tti = lr.audits?.["interactive"]?.numericValue;

    return {
      ps_score: perfScore !== undefined ? Math.round(perfScore * 100) : undefined,
      ps_fcp_ms: fcp !== undefined ? Math.round(fcp) : undefined,
      ps_lcp_ms: lcp !== undefined ? Math.round(lcp) : undefined,
      ps_tbt_ms: tbt !== undefined ? Math.round(tbt) : undefined,
      ps_cls: cls !== undefined ? Math.round(cls * 1000) / 1000 : undefined,
      ps_tti_ms: tti !== undefined ? Math.round(tti) : undefined,
    };
  } catch {
    return null;
  }
}

/** Отправляет Telegram-уведомление о новом анализе от публичного пользователя */
async function notifyTelegram(params: {
  id: string;
  url: string;
  source_type: SourceType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report: any;
}) {
  const s = await getAllSettings();
  const botToken = s.telegram_bot_token;
  const chatId = s.telegram_chat_id;
  if (!botToken || !chatId) return;

  const { id, url, report } = params;
  const growth = report?.growth_potential_pct ?? "—";
  const niche = report?.niche ?? "Не определено";
  const verdict = report?.verdict ?? "";

  const text =
    `🔔 *Новый анализ от пользователя*\n\n` +
    `*Сайт:* ${url}\n` +
    `*Ниша:* ${niche}\n` +
    `*Потенциал роста:* +${growth}%\n\n` +
    (verdict ? `_${verdict.slice(0, 200)}_` : "");

  const buttons = [[
    { text: "📊 Открыть отчёт", url: `https://konversus.ru/architect/${id}` },
    { text: "🌐 Сайт", url: url },
  ]];

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: buttons },
    }),
    signal: AbortSignal.timeout(8_000),
  });
}

export async function runArchitectPipeline(params: {
  id: string;
  url: string;
  source_type: SourceType;
  fastModel: string;
  strongModel: string;
  apiKey: string;
  avitoClientId?: string;
  avitoClientSecret?: string;
  pagespeedApiKey?: string;
  skipNotify?: boolean;
}): Promise<void> {
  const {
    id, url, source_type, fastModel, strongModel, apiKey,
    avitoClientId, avitoClientSecret, pagespeedApiKey, skipNotify,
  } = params;

  try {
    // Фоновая очистка старых скриншотов (не блокирует)
    void cleanOldScreenshots();

    // 1. Collecting
    await updateArchitectStatus(id, "collecting");
    const snapshot = await collectSnapshot(url, source_type, {
      avitoClientId,
      avitoClientSecret,
    });

    // 1b. Для website — параллельно запускаем Visual Analysis и PageSpeed
    if (source_type === "website") {
      const [visualResult, psResult] = await Promise.allSettled([
        analyzeVisual(url, apiKey, id),
        fetchPageSpeedInsights(url, pagespeedApiKey),
      ]);

      if (visualResult.status === "fulfilled") {
        snapshot.visual_analysis = visualResult.value;
      } else {
        console.warn("[pipeline] visual analysis skipped:", visualResult.reason);
      }

      if (psResult.status === "fulfilled" && psResult.value && snapshot.speed_audit) {
        // Мержим PageSpeed данные в speed_audit, созданный data-collector'ом
        Object.assign(snapshot.speed_audit, psResult.value);
      }
    }

    await updateArchitectSnapshot(id, snapshot);

    // 2. AI Analysis
    const { report, model_used } = await analyzeWithAI(snapshot, {
      fastModel,
      strongModel,
      apiKey,
    });

    // 3. Done
    await updateArchitectResult(id, report, model_used);

    // 4. Telegram уведомление (только если не Lead Hunter — у него свой notify)
    if (!skipNotify) {
      void notifyTelegram({ id, url, source_type, report }).catch(() => undefined);
    }

  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    await markArchitectFailed(id, message).catch(() => undefined);
  }
}
