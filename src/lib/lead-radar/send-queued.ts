/**
 * Ручная отправка лида из очереди «Сегодня» (human-in-the-loop).
 */
import "server-only";
import nodemailer from "nodemailer";
import {
  getSiteById,
  logEmail,
  createFollowUp,
  updateSiteStatus,
  bumpBatchCounter,
  countQueuedForDate,
  upsertBatchPlan,
} from "@/lib/data/lead-radar";
import { getAllSettings } from "@/lib/data/settings";
import {
  sendSentNotification,
  sendSkipNotification,
} from "@/lib/lead-radar/telegram-digest";

export type SendQueuedResult =
  | {
      ok: true;
      messageId: string;
      sentTo: string;
      telegram: { ok: boolean; error?: string };
      testMode: boolean;
    }
  | { ok: false; error: string; status?: number };

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

    const info = await transporter.sendMail({
      from: `"lead-web.pro" <${smtpUser || "leadweb@yandex.ru"}>`,
      replyTo: "leadweb@yandex.ru",
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
      await createFollowUp({ siteId: site.id, type: "email" });
      await updateSiteStatus(site.id, "contacted");
      const batchDate = toBatchDate(site.batch_date);
      await bumpBatchCounter(batchDate, "sent_count");
      const queuedCount = await countQueuedForDate(batchDate);
      await upsertBatchPlan({ batchDate, queuedCount });

      if (!params.skipTelegram) {
        const settings = await getAllSettings();
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
    return { ok: false, error: err?.message || "send_failed", status: 500 };
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
