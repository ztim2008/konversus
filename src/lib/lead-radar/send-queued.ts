/**
 * Отправка лида из очереди (ручная кнопка или авто-конвейер).
 */
import "server-only";
import nodemailer from "nodemailer";
import {
  getSiteById,
  logEmail,
  createFollowUp,
  updateSiteStatus,
  bumpBatchCounter,
  countSendableQueued,
  countQueuedForDate,
  upsertBatchPlan,
  markLeadBounced,
} from "@/lib/data/lead-radar";
import { getAllSettings } from "@/lib/data/settings";
import {
  sendSentNotification,
  sendSkipNotification,
} from "@/lib/lead-radar/telegram-digest";
import {
  countOutboundOnDate,
  getDailySendLimit,
  mskDateISO,
} from "@/lib/lead-radar/config";
import { getActiveSenderProfile } from "@/lib/lead-radar/sender-profiles";

export type SendQueuedResult =
  | {
      ok: true;
      messageId: string;
      sentTo: string;
      telegram: { ok: boolean; error?: string };
      testMode: boolean;
    }
  | { ok: false; error: string; status?: number };

/** Постоянный отказ ящика. Временные 421/450 не трогаем — следующий тик повторит. */
function isHardBounce(message: string): boolean {
  return /550|553|5\.7\.1|policy rejection|recipients were rejected|user unknown|mailbox unavailable|no such user|recipient address rejected/i.test(
    message
  );
}

function toBatchDate(value: unknown): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const raw = String(value);
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const mo = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  return new Date().toISOString().slice(0, 10);
}

export async function sendQueuedLead(params: {
  siteId: string;
  /** Если true — письмо уходит на SMTP_USER, статус contacted не ставим. */
  testMode?: boolean;
  skipTelegram?: boolean;
}): Promise<SendQueuedResult> {
  const site = await getSiteById(params.siteId);
  if (!site) {
    return { ok: false, error: "site_not_found", status: 404 };
  }
  if (site.status !== "queued" && !params.testMode) {
    return { ok: false, error: "not_queued", status: 409 };
  }
  if (!site.email) {
    return { ok: false, error: "no_email", status: 400 };
  }
  if (!site.kp_html || !site.kp_subject) {
    return { ok: false, error: "no_kp", status: 400 };
  }

  if (!params.testMode) {
    const sentToday = await countOutboundOnDate(mskDateISO());
    const sendLimit = await getDailySendLimit();
    if (sentToday >= sendLimit) {
      return {
        ok: false,
        error: `daily_send_limit_${sendLimit}`,
        status: 429,
      };
    }
  }

  const testMode = !!params.testMode;
  const smtpUser = process.env.SMTP_USER || "";
  const finalTo = testMode ? smtpUser || "bilariuss@yandex.ru" : site.email;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.yandex.ru",
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: { user: smtpUser, pass: process.env.SMTP_PASS || "" },
    });

    const trackingHtml =
      site.kp_html +
      `<img src="https://konversus.ru/api/secret-shopper/track-open?siteId=${encodeURIComponent(site.id)}" width="1" height="1" style="display:none" alt="" />`;

    const profile = await getActiveSenderProfile();
    const fromAddr = smtpUser || profile.replyToEmail || "leadweb@yandex.ru";
    const replyTo = profile.replyToEmail || smtpUser || fromAddr;

    const info = await transporter.sendMail({
      from: `"${profile.fromName}" <${fromAddr}>`,
      replyTo,
      to: finalTo,
      subject: testMode ? `[Тест] ${site.kp_subject}` : site.kp_subject,
      html: trackingHtml,
    });

    await logEmail({
      siteId: site.id,
      radarId: site.radar_id,
      toEmail: finalTo,
      subject: site.kp_subject,
      messageId: info.messageId,
    });

    let telegram: { ok: boolean; error?: string } = { ok: true };

    if (!testMode) {
      await createFollowUp({
        siteId: site.id,
        type: "email",
        touchNo: 1,
        messageId: info.messageId,
      });
      await updateSiteStatus(site.id, "contacted");
      const batchDate = toBatchDate(site.batch_date);
      await bumpBatchCounter(batchDate, "sent_count");
      const queuedToday = await countQueuedForDate(batchDate);
      await upsertBatchPlan({ batchDate, queuedCount: queuedToday });
      const queuedCount = await countSendableQueued();

      if (!params.skipTelegram) {
        const settings = await getAllSettings();
        const sentToday = await countOutboundOnDate(mskDateISO());
        const sendLimit = await getDailySendLimit();
        telegram = await sendSentNotification({
          botToken: settings.telegram_bot_token,
          chatId: settings.telegram_chat_id,
          name: site.name,
          domain: site.domain,
          platform: site.platform,
          email: site.email,
          screenshotUrl: site.screenshot_url,
          screenshotPath: site.screenshot_path,
          kpSubject: site.kp_subject,
          kpHtml: site.kp_html,
          pulseLine: `Сегодня ${sentToday}/${sendLimit} · в очереди ${queuedCount}`,
          publicOrigin:
            process.env.NEXT_PUBLIC_BASE_URL ||
            process.env.NEXT_PUBLIC_SITE_URL ||
            "https://konversus.ru",
        });
      }
    }

    return {
      ok: true,
      messageId: info.messageId,
      sentTo: finalTo,
      telegram,
      testMode,
    };
  } catch (err: any) {
    const message = err?.message || "send_failed";
    if (isHardBounce(message)) {
      await markLeadBounced(site.id, message);
    }
    return { ok: false, error: message, status: 500 };
  }
}

export async function skipQueuedLead(params: {
  siteId: string;
  skipTelegram?: boolean;
}): Promise<
  | {
      ok: true;
      queuedCount: number;
      telegram: { ok: boolean; error?: string };
    }
  | { ok: false; error: string; status?: number }
> {
  const site = await getSiteById(params.siteId);
  if (!site) return { ok: false, error: "site_not_found", status: 404 };
  if (site.status !== "queued") {
    return { ok: false, error: "not_queued", status: 409 };
  }
  await updateSiteStatus(params.siteId, "skipped");
  const batchDate = toBatchDate(site.batch_date);
  await bumpBatchCounter(batchDate, "skipped_count");
  const queuedCount = await countQueuedForDate(batchDate);
  await upsertBatchPlan({ batchDate, queuedCount });

  let telegram: { ok: boolean; error?: string } = { ok: true };
  if (!params.skipTelegram) {
    const settings = await getAllSettings();
    telegram = await sendSkipNotification({
      botToken: settings.telegram_bot_token,
      chatId: settings.telegram_chat_id,
      name: site.name,
      domain: site.domain,
      platform: site.platform,
      queuedRemaining: queuedCount,
    });
  }

  return { ok: true, queuedCount, telegram };
}
