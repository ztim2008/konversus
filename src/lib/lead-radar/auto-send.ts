/**
 * Автоотправка очереди (конвейер): каплями до дневного лимита sent.
 * Human-in-the-loop снят решением владельца 2026-09-14.
 */
import "server-only";
import {
  listQueuedSites,
  countQueuedForDate,
} from "@/lib/data/lead-radar";
import { getAllSettings } from "@/lib/data/settings";
import {
  getDailySendLimit,
  getAutoSendEnabled,
  isAutoSendWindowMsk,
  countSentForBatchDate,
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
  telegram?: { ok: boolean; error?: string };
  skippedReason?: string;
};

function todayIso(): string {
  // batch_date в БД = календарный день сервера/CURDATE; для отчётов используем UTC date
  // как и nightly (ISO slice). Для окна МСК — отдельно.
  return new Date().toISOString().slice(0, 10);
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
}): Promise<AutoSendResult> {
  const batchDate = todayIso();
  const sentLimit = await getDailySendLimit();
  const enabled = await getAutoSendEnabled();
  const inWindow = isAutoSendWindowMsk(new Date());
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
      skipTelegram: true, // не спамим TG на каждое письмо
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
    telegram,
  };
}
