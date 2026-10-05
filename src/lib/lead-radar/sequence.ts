/**
 * Второе касание через 4 дня, третье через 10 дней от первого.
 * В ту же переписку. Скрин сайта — в каждом письме, если он есть.
 * Цепочка только у карточек, где у первого письма сохранён Message-ID.
 */
import "server-only";
import nodemailer from "nodemailer";
import type { RowDataPacket } from "mysql2";
import { getDbPool } from "@/lib/db";
import {
  claimDueFollowUp,
  countSendableQueued,
  createFollowUp,
  getSiteById,
  logEmail,
  markLeadBounced,
  releaseFollowUpClaim,
} from "@/lib/data/lead-radar";
import { getAllSettings } from "@/lib/data/settings";
import { renderLeadWebKpHtml } from "@/lib/lead-agent/kp-html-template";
import {
  countOutboundOnDate,
  getDailySendLimit,
  mskDateISO,
  mskDayBoundsUtc,
} from "@/lib/lead-radar/config";
import { getActiveSenderProfile } from "@/lib/lead-radar/sender-profiles";
import { sendSentNotification } from "@/lib/lead-radar/telegram-digest";
import {
  angleMessageId,
  followUpBody,
  replySubject,
  secondFinding,
} from "@/lib/lead-radar/sequence-copy";

export type SequenceSendResult =
  | {
      ok: true;
      touch: 2 | 3;
      messageId: string;
      sentTo: string;
      telegram: { ok: boolean; error?: string };
    }
  | { ok: false; error: string; status?: number };

function isHardBounce(message: string): boolean {
  return /550|553|5\.7\.1|policy rejection|recipients were rejected|user unknown|mailbox unavailable|no such user|recipient address rejected/i.test(
    message
  );
}

function batchDateOf(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || mskDateISO();
}

type DueRow = { id: string; domain: string | null; email: string | null };

const CHAIN_SQL = `
  s.status = 'contacted'
  AND s.follow_up_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM lead_follow_ups f
    WHERE f.site_id = s.id AND f.touch_no = 1 AND f.message_id IS NOT NULL
  )
  AND (
    SELECT COUNT(*) FROM lead_follow_ups f
    WHERE f.site_id = s.id AND f.type = 'email'
  ) < 3`;

/** Повторные письма, которые должны уйти сегодня: утренний сбор оставляет им место в лимите. */
export async function countSequenceReservedToday(iso?: string): Promise<number> {
  const date = iso || mskDateISO();
  const { end } = mskDayBoundsUtc(date);
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT COUNT(*) AS c FROM lead_radar_sites s
     WHERE ${CHAIN_SQL} AND s.follow_up_at < ?`,
    [end]
  );
  return Number((rows as RowDataPacket[])[0]?.c ?? 0);
}

/** Карточки, которым пора второе или третье письмо. Старые без Message-ID не входят. */
export async function listDueSequenceSites(limit: number): Promise<DueRow[]> {
  const db = getDbPool();
  const take = Math.min(20, Math.max(1, limit));
  const [rows] = await db.query(
    `SELECT s.id, s.domain, s.email
     FROM lead_radar_sites s
     WHERE ${CHAIN_SQL} AND s.follow_up_at <= NOW()
     ORDER BY s.follow_up_at ASC
     LIMIT ${take}`
  );
  return rows as DueRow[];
}

async function threadMessageId(siteId: string): Promise<string | null> {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT message_id FROM lead_follow_ups
     WHERE site_id = ? AND touch_no = 1 AND message_id IS NOT NULL
     ORDER BY sent_at ASC LIMIT 1`,
    [siteId]
  );
  const id = (rows as RowDataPacket[])[0]?.message_id;
  return id ? String(id) : null;
}

async function emailTouchCount(siteId: string): Promise<number> {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT COUNT(*) AS c FROM lead_follow_ups
     WHERE site_id = ? AND type = 'email'`,
    [siteId]
  );
  return Number((rows as RowDataPacket[])[0]?.c ?? 0);
}

export async function sendSequenceTouch(params: {
  siteId: string;
  skipTelegram?: boolean;
}): Promise<SequenceSendResult> {
  const site = await getSiteById(params.siteId);
  if (!site) return { ok: false, error: "site_not_found", status: 404 };
  if (site.status !== "contacted") {
    return { ok: false, error: "chain_stopped", status: 409 };
  }
  if (!site.email) return { ok: false, error: "no_email", status: 400 };

  const sentToday = await countOutboundOnDate(mskDateISO());
  const sendLimit = await getDailySendLimit();
  if (sentToday >= sendLimit) {
    return { ok: false, error: `daily_send_limit_${sendLimit}`, status: 429 };
  }

  const claimed = await claimDueFollowUp(site.id);
  if (!claimed) return { ok: false, error: "not_due", status: 409 };

  const already = await emailTouchCount(site.id);
  const touch = already + 1;
  if (touch !== 2 && touch !== 3) {
    if (already >= 3) {
      const db = getDbPool();
      await db.query(
        "UPDATE lead_radar_sites SET follow_up_at = NULL WHERE id = ?",
        [site.id]
      );
    } else {
      await releaseFollowUpClaim(site.id);
    }
    return { ok: false, error: "touch_out_of_range", status: 409 };
  }
  const nextTouch = touch as 2 | 3;

  const threadId = await threadMessageId(site.id);
  if (!threadId) {
    await releaseFollowUpClaim(site.id);
    return { ok: false, error: "no_thread", status: 409 };
  }

  const profile = await getActiveSenderProfile();
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://konversus.ru";
  const screenshotUrl = site.screenshot_url ? String(site.screenshot_url) : "";
  const subject = replySubject(String(site.kp_subject || `сайт ${site.domain}`));
  const html = renderLeadWebKpHtml({
    companyName: String(site.name || site.domain || ""),
    domain: String(site.domain || ""),
    platform: site.platform,
    bodyText: followUpBody({
      touch: nextTouch,
      domain: String(site.domain || ""),
      finding: nextTouch === 2 ? secondFinding(site.problems) : null,
      hasScreenshot: !!screenshotUrl,
    }),
    screenshotUrl: screenshotUrl || null,
    leadId: site.id,
    batchDate: batchDateOf(site.batch_date),
    includeOffer: false,
    publicOrigin: origin,
    profile,
  });
  const trackingHtml =
    html +
    `<img src="https://konversus.ru/api/secret-shopper/track-open?siteId=${encodeURIComponent(site.id)}" width="1" height="1" style="display:none" alt="" />`;

  const smtpUser = process.env.SMTP_USER || "";
  const fromAddr = smtpUser || profile.replyToEmail || "leadweb@yandex.ru";
  const replyTo = profile.replyToEmail || smtpUser || fromAddr;
  const headerId = angleMessageId(threadId);

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.yandex.ru",
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: { user: smtpUser, pass: process.env.SMTP_PASS || "" },
    });
    const info = await transporter.sendMail({
      from: `"${profile.fromName}" <${fromAddr}>`,
      replyTo,
      to: site.email,
      subject,
      html: trackingHtml,
      inReplyTo: headerId,
      references: headerId,
    });

    await logEmail({
      siteId: site.id,
      radarId: site.radar_id,
      toEmail: site.email,
      subject,
      messageId: info.messageId,
    });
    await createFollowUp({
      siteId: site.id,
      type: "email",
      touchNo: nextTouch,
      messageId: info.messageId,
    });

    let telegram: { ok: boolean; error?: string } = { ok: true };
    if (!params.skipTelegram) {
      const settings = await getAllSettings();
      const sentAfter = await countOutboundOnDate(mskDateISO());
      const queuedCount = await countSendableQueued();
      const touchLabel = nextTouch === 2 ? "Второе" : "Третье";
      telegram = await sendSentNotification({
        botToken: settings.telegram_bot_token,
        chatId: settings.telegram_chat_id,
        name: site.name,
        domain: site.domain,
        platform: site.platform,
        email: site.email,
        legalForm: site.legal_form,
        screenshotUrl: site.screenshot_url,
        screenshotPath: site.screenshot_path,
        kpSubject: subject,
        kpHtml: html,
        pulseLine: `${touchLabel} касание · сегодня ${sentAfter}/${sendLimit} · в очереди ${queuedCount}`,
        publicOrigin: origin,
      });
    }

    return {
      ok: true,
      touch: nextTouch,
      messageId: info.messageId,
      sentTo: site.email,
      telegram,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "send_failed";
    if (isHardBounce(message)) {
      await markLeadBounced(site.id, message);
    } else {
      await releaseFollowUpClaim(site.id);
    }
    return { ok: false, error: message, status: 500 };
  }
}
