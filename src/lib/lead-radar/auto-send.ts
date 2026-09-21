/**
 * Автоотправка очереди (конвейер): каплями до дневного лимита sent.
 * Темп: 15 или 30 мин (setting) — cron стучится чаще, API сам пропускает рано.
 */
import "server-only";
import {
  listQueuedSites,
  countQueuedForDate,
} from "@/lib/data/lead-radar";
import { getAllSettings } from "@/lib/data/settings";
import { getDbPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import {
  getDailySendLimit,
  getAutoSendEnabled,
  getAutoSendIntervalMin,
  isAutoSendWindowMsk,
  countSentForBatchDate,
  mskDateISO,
} from "@/lib/lead-radar/config";
import { sendQueuedLead } from "@/lib/lead-radar/send-queued";
import { sendPlainAutoSendDigest } from "@/lib/lead-radar/telegram-digest";

export type AutoSendResult = {
  ok: true;
  enabled: boolean;
  inWindow: boolean;
  batchDate: string;
  sentLimit: number;
  sentBefore: number;
  sentAfter: number;
  remainingBudget: number;
  attempted: number;
  succeeded: number;
  failed: Array<{ siteId: string; domain?: string; error: string }>;
  queuedLeft: number;
  intervalMin?: number;
  telegram?: { ok: boolean; error?: string };
  skippedReason?: string;
};

async function minutesSinceLastContact(batchDate: string): Promise<number | null> {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT TIMESTAMPDIFF(MINUTE, MAX(contacted_at), NOW()) AS m
     FROM lead_radar_sites
     WHERE batch_date = ?
       AND status IN ('contacted','replied','won')
       AND contacted_at IS NOT NULL`,
    [batchDate]
  );
  const m = (rows as RowDataPacket[])[0]?.m;
  if (m == null) return null;
  return Number(m);
}

/**
 * Одна «капля»: до `perRun` писем (по умолчанию 1).
 */
export async function runAutoSendDrip(options?: {
  perRun?: number;
  force?: boolean;
  skipTelegram?: boolean;
  /** Игнорировать окно часов (только для ручного теста). */
  ignoreWindow?: boolean;
  /** Игнорировать интервал 15/30 (ручной тест). */
  ignoreInterval?: boolean;
}): Promise<AutoSendResult> {
  const batchDate = mskDateISO();
  const sentLimit = await getDailySendLimit();
  const enabled = await getAutoSendEnabled();
  const inWindow = isAutoSendWindowMsk(new Date());
  const intervalMin = await getAutoSendIntervalMin();
  const perRun = Math.min(5, Math.max(1, options?.perRun ?? 1));

  const sentBefore = await countSentForBatchDate(batchDate);
  const base: Omit<AutoSendResult, "ok"> & { ok: true } = {
    ok: true,
    enabled,
    inWindow,
    batchDate,
    sentLimit,
    sentBefore,
    sentAfter: sentBefore,
    remainingBudget: Math.max(0, sentLimit - sentBefore),
    attempted: 0,
    succeeded: 0,
    failed: [],
    queuedLeft: await countQueuedForDate(batchDate),
    intervalMin,
  };

  if (!enabled && !options?.force) {
    return { ...base, skippedReason: "auto_send_disabled" };
  }
  if (!inWindow && !options?.ignoreWindow && !options?.force) {
    return { ...base, skippedReason: "outside_send_window" };
  }
  if (sentBefore >= sentLimit) {
    return { ...base, skippedReason: "daily_send_limit", remainingBudget: 0 };
  }

  if (!options?.ignoreInterval && !options?.force) {
    const since = await minutesSinceLastContact(batchDate);
    if (since != null && since < intervalMin) {
      return {
        ...base,
        skippedReason: `interval_${intervalMin}m`,
      };
    }
  }

  const budget = Math.min(perRun, sentLimit - sentBefore);
  const queued = await listQueuedSites(batchDate);
  const ready = queued.filter((s) => s.email && s.kp_html && s.kp_subject);
  const slice = ready.slice(0, budget);

  const failed: AutoSendResult["failed"] = [];
  let succeeded = 0;

  for (const site of slice) {
    base.attempted++;
    const result = await sendQueuedLead({
      siteId: site.id,
      skipTelegram: true,
    });
    if (result.ok) {
      succeeded++;
    } else {
      failed.push({
        siteId: site.id,
        domain: site.domain,
        error: result.error,
      });
    }
  }

  const sentAfter = await countSentForBatchDate(batchDate);
  const queuedLeft = await countQueuedForDate(batchDate);

  let telegram: { ok: boolean; error?: string } | undefined;
  if (succeeded > 0 && !options?.skipTelegram) {
    const settings = await getAllSettings();
    telegram = await sendPlainAutoSendDigest({
      botToken: settings.telegram_bot_token,
      chatId: settings.telegram_chat_id,
      sentNow: succeeded,
      sentToday: sentAfter,
      sentLimit,
      queuedLeft,
    });
  }

  return {
    ok: true,
    enabled,
    inWindow,
    batchDate,
    sentLimit,
    sentBefore,
    sentAfter,
    remainingBudget: Math.max(0, sentLimit - sentAfter),
    attempted: base.attempted,
    succeeded,
    failed,
    queuedLeft,
    intervalMin,
    telegram,
  };
}
