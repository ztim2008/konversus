/**
 * Вечерний факт дня: метрики → batches → Telegram daily-report.
 */
import "server-only";
import { getDbPool } from "@/lib/db";
import {
  getBatchByDate,
  updateBatchFacts,
  upsertBatchPlan,
} from "@/lib/data/lead-radar";
import { getAllSettings } from "@/lib/data/settings";
import { sendEveningReport } from "@/lib/lead-radar/telegram-digest";
import { estimateUsd } from "@/lib/lead-radar/config";

export type DailyReportResult = {
  ok: boolean;
  batchDate: string;
  queued: number;
  sent: number;
  skipped: number;
  opened: number;
  replied: number;
  bounce: number;
  tokens: number;
  usdEstimate: number;
  telegram: { ok: boolean; error?: string; skipped?: boolean; reason?: string };
  alreadyReported?: boolean;
  error?: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function collectDayFacts(batchDate: string): Promise<{
  queued: number;
  sent: number;
  skipped: number;
  opened: number;
  replied: number;
  bounce: number;
  tokens: number;
}> {
  const db = getDbPool();

  const [[statusRow]] = (await db.query(
    `SELECT
       SUM(status = 'queued') AS still_queued,
       SUM(status IN ('contacted','replied','won')) AS sent,
       SUM(status = 'skipped') AS skipped,
       SUM(status = 'replied' OR status = 'won') AS replied,
       SUM(status = 'bounced') AS bounce,
       COALESCE(SUM(COALESCE(kp_tokens_in,0) + COALESCE(kp_tokens_out,0)), 0) AS tokens
     FROM lead_radar_sites
     WHERE batch_date = ?`,
    [batchDate]
  )) as any;

  const [[openRow]] = (await db.query(
    `SELECT COUNT(DISTINCT f.site_id) AS opened
     FROM lead_follow_ups f
     JOIN lead_radar_sites s ON s.id = f.site_id
     WHERE s.batch_date = ?
       AND f.opened_at IS NOT NULL`,
    [batchDate]
  )) as any;

  const batch = await getBatchByDate(batchDate);
  const planQueued = Number(batch?.queued_count ?? 0);
  const stillQueued = Number(statusRow?.still_queued ?? 0);
  const sent = Number(statusRow?.sent ?? 0);
  const skipped = Number(statusRow?.skipped ?? 0);
  const queued =
    planQueued > 0 ? planQueued : sent + skipped + stillQueued;

  const tokensFromSites = Number(statusRow?.tokens ?? 0);
  const tokens = Math.max(tokensFromSites, Number(batch?.tokens_total ?? 0));

  return {
    queued,
    sent,
    skipped,
    opened: Number(openRow?.opened ?? 0),
    replied: Number(statusRow?.replied ?? 0),
    bounce: Number(statusRow?.bounce ?? 0),
    tokens,
  };
}

export async function runDailyReport(options?: {
  batchDate?: string;
  skipTelegram?: boolean;
  /** Повторить отчёт даже если report_sent_at уже стоит */
  force?: boolean;
}): Promise<DailyReportResult> {
  const batchDate = options?.batchDate || todayIso();
  const facts = await collectDayFacts(batchDate);

  const existing = await getBatchByDate(batchDate);
  if (!existing) {
    await upsertBatchPlan({
      batchDate,
      queuedCount: facts.queued,
      tokensTotal: facts.tokens,
    });
  }

  await updateBatchFacts({
    batchDate,
    sentCount: facts.sent,
    skippedCount: facts.skipped,
    openedCount: facts.opened,
    repliedCount: facts.replied,
    bounceCount: facts.bounce,
    tokensTotal: facts.tokens,
    markReportSent: false,
  });

  const usdEstimate = estimateUsd(facts.tokens);

  const base: DailyReportResult = {
    ok: true,
    batchDate,
    ...facts,
    usdEstimate,
    telegram: { ok: true },
  };

  if (facts.sent === 0) {
    return {
      ...base,
      telegram: { ok: true, skipped: true, reason: "zero_sent" },
    };
  }

  const batchAfter = await getBatchByDate(batchDate);
  if (batchAfter?.report_sent_at && !options?.force) {
    return {
      ...base,
      alreadyReported: true,
      telegram: { ok: true, skipped: true, reason: "already_sent" },
    };
  }

  if (options?.skipTelegram) {
    return base;
  }

  const settings = await getAllSettings();
  const publicOrigin =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://konversus.ru";

  const telegram = await sendEveningReport({
    botToken: settings.telegram_bot_token,
    chatId: settings.telegram_chat_id,
    batchDate,
    queued: facts.queued,
    sent: facts.sent,
    skipped: facts.skipped,
    opened: facts.opened,
    replied: facts.replied,
    bounce: facts.bounce,
    tokens: facts.tokens,
    usdEstimate,
    adminUrl: `${publicOrigin.replace(/\/$/, "")}/dashboard/secret-shopper`,
  });

  if (telegram.ok) {
    await updateBatchFacts({
      batchDate,
      sentCount: facts.sent,
      skippedCount: facts.skipped,
      openedCount: facts.opened,
      repliedCount: facts.replied,
      bounceCount: facts.bounce,
      tokensTotal: facts.tokens,
      markReportSent: true,
    });
  }

  return { ...base, telegram };
}
