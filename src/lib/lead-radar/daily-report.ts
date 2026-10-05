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

export type LiveDayFacts = {
  sent: number;
  touch1: number;
  touch2: number;
  touch3: number;
  skipped: number;
  opened: number;
  replied: number;
  bounce: number;
  stillQueued: number;
};

function emptyLiveDayFacts(): LiveDayFacts {
  return {
    sent: 0,
    touch1: 0,
    touch2: 0,
    touch3: 0,
    skipped: 0,
    opened: 0,
    replied: 0,
    bounce: 0,
    stillQueued: 0,
  };
}

/**
 * Живой пересчёт по письмам дня. Колонки в lead_radar_batches — снимок вечернего отчёта
 * и не растут, если письмо открыли на следующий день.
 */
export async function collectFactsForDates(
  dates: string[]
): Promise<Record<string, LiveDayFacts>> {
  const unique = [...new Set(dates.map((d) => String(d).slice(0, 10)).filter(Boolean))];
  const out: Record<string, LiveDayFacts> = {};
  for (const date of unique) out[date] = emptyLiveDayFacts();
  if (unique.length === 0) return out;

  const db = getDbPool();
  const placeholders = unique.map(() => "?").join(",");

  const [statusRows] = (await db.query(
    `SELECT DATE_FORMAT(batch_date, '%Y-%m-%d') AS d,
       SUM(status IN ('contacted','replied','won')) AS sent,
       SUM(status = 'skipped') AS skipped,
       SUM(status IN ('replied','won')) AS replied,
       SUM(status = 'bounced') AS bounce,
       SUM(status = 'queued') AS still_queued
     FROM lead_radar_sites
     WHERE batch_date IN (${placeholders})
     GROUP BY DATE_FORMAT(batch_date, '%Y-%m-%d')`,
    unique
  )) as any;

  const [openRows] = (await db.query(
    `SELECT DATE_FORMAT(s.batch_date, '%Y-%m-%d') AS d,
       COUNT(DISTINCT f.site_id) AS opened
     FROM lead_follow_ups f
     JOIN lead_radar_sites s ON s.id = f.site_id
     WHERE s.batch_date IN (${placeholders})
       AND f.opened_at IS NOT NULL
     GROUP BY DATE_FORMAT(s.batch_date, '%Y-%m-%d')`,
    unique
  )) as any;

  for (const row of statusRows as any[]) {
    const date = String(row.d || "").slice(0, 10);
    if (!out[date]) out[date] = emptyLiveDayFacts();
    out[date].sent = Number(row.sent ?? 0);
    out[date].skipped = Number(row.skipped ?? 0);
    out[date].replied = Number(row.replied ?? 0);
    out[date].bounce = Number(row.bounce ?? 0);
    out[date].stillQueued = Number(row.still_queued ?? 0);
  }

  for (const row of openRows as any[]) {
    const date = String(row.d || "").slice(0, 10);
    if (!out[date]) out[date] = emptyLiveDayFacts();
    out[date].opened = Number(row.opened ?? 0);
  }

  const [touchRows] = (await db.query(
    `SELECT DATE_FORMAT(DATE_ADD(sent_at, INTERVAL 3 HOUR), '%Y-%m-%d') AS d,
       SUM(touch_no = 1) AS touch1,
       SUM(touch_no = 2) AS touch2,
       SUM(touch_no = 3) AS touch3,
       SUM(opened_at IS NOT NULL) AS opened,
       SUM(replied_at IS NOT NULL) AS replied
     FROM lead_follow_ups
     WHERE type = 'email'
       AND DATE_FORMAT(DATE_ADD(sent_at, INTERVAL 3 HOUR), '%Y-%m-%d') IN (${placeholders})
     GROUP BY DATE_FORMAT(DATE_ADD(sent_at, INTERVAL 3 HOUR), '%Y-%m-%d')`,
    unique
  )) as any;

  for (const row of touchRows as any[]) {
    const date = String(row.d || "").slice(0, 10);
    if (!out[date]) out[date] = emptyLiveDayFacts();
    const touch1 = Number(row.touch1 ?? 0);
    const touch2 = Number(row.touch2 ?? 0);
    const touch3 = Number(row.touch3 ?? 0);
    const touchSent = touch1 + touch2 + touch3;
    if (touchSent <= 0) continue;
    out[date].touch1 = touch1;
    out[date].touch2 = touch2;
    out[date].touch3 = touch3;
    out[date].sent = touchSent;
    out[date].opened = Number(row.opened ?? 0);
    const touchReplied = Number(row.replied ?? 0);
    if (touchReplied > out[date].replied) out[date].replied = touchReplied;
  }

  for (const date of unique) {
    const facts = out[date];
    if (!facts) continue;
    if (facts.touch1 + facts.touch2 + facts.touch3 === 0) {
      facts.touch1 = facts.sent;
    }
  }

  return out;
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
