/**
 * Автоотправка очереди (конвейер): каплями до дневного лимита sent.
 * Клиенту — письмо; вам в TG — скрин + email + текст КП + пульс N/40.
 * Вечерний итог — отдельный daily-report.
 */
import "server-only";
import {
  listSendableQueued,
  countSendableQueued,
  moveQueuedToBatch,
  skipQueuedIds,
} from "@/lib/data/lead-radar";
import { getDbPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import {
  getDailySendLimit,
  getAutoSendEnabled,
  getAutoSendIntervalMin,
  isAutoSendWindowMsk,
  countOutboundOnDate,
  mskDateISO,
} from "@/lib/lead-radar/config";
import { sendQueuedLead } from "@/lib/lead-radar/send-queued";
import { listDueSequenceSites, sendSequenceTouch } from "@/lib/lead-radar/sequence";

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

function sqlDateISO(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const raw = String(value);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return "";
}

/** Пауза между любыми письмами дня: и новыми, и повторными. */
async function secondsSinceLastOutbound(): Promise<number | null> {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT TIMESTAMPDIFF(SECOND, MAX(sent_at), NOW()) AS s
     FROM lead_follow_ups
     WHERE type = 'email'`
  );
  const s = (rows as RowDataPacket[])[0]?.s;
  if (s == null) return null;
  return Number(s);
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

  const sentBefore = await countOutboundOnDate(batchDate);
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
    queuedLeft: await countSendableQueued(),
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
    const sinceSec = await secondsSinceLastOutbound();
    // 90 с запаса: cron ровно в */15 часто даёт 14 мин из‑за TIMESTAMPDIFF.
    const needSec = intervalMin * 60 - 90;
    if (sinceSec != null && sinceSec < needSec) {
      return {
        ...base,
        skippedReason: `interval_${intervalMin}m`,
      };
    }
  }

  const budget = Math.min(perRun, sentLimit - sentBefore);
  const due = await listDueSequenceSites(budget);
  const failed: AutoSendResult["failed"] = [];
  let succeeded = 0;
  let lastTelegram: { ok: boolean; error?: string } | undefined;

  for (const site of due) {
    base.attempted++;
    const result = await sendSequenceTouch({
      siteId: site.id,
      skipTelegram: !!options?.skipTelegram,
    });
    if (result.ok) {
      succeeded++;
      if (result.telegram) lastTelegram = result.telegram;
    } else {
      failed.push({
        siteId: site.id,
        domain: site.domain || undefined,
        error: result.error,
      });
    }
  }

  const queuedBudget = Math.max(0, budget - due.length);
  const queued = queuedBudget > 0 ? await listSendableQueued() : [];
  const seenEmail = new Set<string>();
  const unique: typeof queued = [];
  const duplicateIds: string[] = [];
  for (const site of queued) {
    const email = String(site.email || "").trim().toLowerCase();
    if (!email) continue;
    if (seenEmail.has(email)) {
      duplicateIds.push(String(site.id));
      continue;
    }
    seenEmail.add(email);
    unique.push(site);
  }
  if (duplicateIds.length) {
    await skipQueuedIds(duplicateIds, "duplicate_email");
  }
  const slice = unique.slice(0, queuedBudget);

  for (const site of slice) {
    base.attempted++;
    const siteBatch = sqlDateISO(site.batch_date);
    if (siteBatch !== batchDate) {
      await moveQueuedToBatch(String(site.id), batchDate);
    }
    // Клиенту письмо + вам в TG карточка (скрин, email, текст КП, пульс)
    const result = await sendQueuedLead({
      siteId: site.id,
      skipTelegram: !!options?.skipTelegram,
    });
    if (result.ok) {
      succeeded++;
      if (result.telegram) lastTelegram = result.telegram;
    } else {
      failed.push({
        siteId: site.id,
        domain: site.domain,
        error: result.error,
      });
    }
  }

  const sentAfter = await countOutboundOnDate(batchDate);
  const queuedLeft = await countSendableQueued();

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
    telegram: lastTelegram,
  };
}
