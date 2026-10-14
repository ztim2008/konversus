import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

import { getCurrentAdmin } from "@/lib/auth/session";
import {
  bumpBatchCounter,
  createFollowUp,
  getSiteById,
  logEmail,
  updateSiteStatus,
} from "@/lib/data/lead-radar";
import {
  catalogLetterHtml,
  catalogLetterSubject,
  catalogLetterText,
} from "@/lib/lead-radar/catalog-letter";
import { countOutboundOnDate, getDailySendLimit, mskDateISO } from "@/lib/lead-radar/config";

export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function field(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function asImage(value: FormDataEntryValue | null): File | null {
  if (!(value instanceof File) || value.size <= 0) return null;
  return value;
}

/**
 * Ручная отправка шаблона Алексея.
 * Без обоих фото письмо не уходит. Автокапля этот маршрут не вызывает.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Нужны поля и два фото" }, { status: 400 });
  }

  const siteId = field(form, "siteId");
  const productName = field(form, "productName");
  const sku = field(form, "sku");
  const problems = field(form, "problems");
  const testMode = field(form, "testMode") === "1";
  const before = asImage(form.get("before"));
  const after = asImage(form.get("after"));

  if (!siteId || !productName || problems.length < 8) {
    return NextResponse.json(
      { error: "Заполните товар и проблемы с фото" },
      { status: 400 }
    );
  }
  if (!before || !after) {
    return NextResponse.json(
      { error: "Нужны оба файла: было и стало" },
      { status: 400 }
    );
  }
  for (const file of [before, after]) {
    if (file.size > MAX_BYTES || !IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Фото: jpg, png или webp, до 8 МБ каждое" },
        { status: 400 }
      );
    }
  }

  const site = await getSiteById(siteId);
  if (!site) {
    return NextResponse.json({ error: "site_not_found" }, { status: 404 });
  }
  if (!testMode && site.status !== "queued") {
    return NextResponse.json({ error: "Лид уже не в очереди" }, { status: 409 });
  }
  const toEmail = String(site.email || "").trim();
  if (!toEmail) {
    return NextResponse.json({ error: "Нет email" }, { status: 400 });
  }

  const smtpUser = process.env.SMTP_USER || "";
  const fromAddr = smtpUser || "bilariuss@yandex.ru";
  const finalTo = testMode ? fromAddr : toEmail;

  if (!testMode) {
    const sentToday = await countOutboundOnDate(mskDateISO());
    const sendLimit = await getDailySendLimit();
    if (sentToday >= sendLimit) {
      return NextResponse.json(
        { error: `Дневной лимит ${sendLimit} уже закрыт` },
        { status: 429 }
      );
    }
  }

  const subject = catalogLetterSubject(productName);
  const text = catalogLetterText({ productName, sku, problems });
  const html = catalogLetterHtml(text);

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.yandex.ru",
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: { user: smtpUser, pass: process.env.SMTP_PASS || "" },
      connectionTimeout: 20_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });

    const info = await transporter.sendMail({
      from: `"Алексей Тимофеев" <${fromAddr}>`,
      replyTo: fromAddr,
      to: finalTo,
      subject: testMode ? `[Тест] ${subject}` : subject,
      text,
      html,
      attachments: [
        {
          filename: after.name || "stalo.jpg",
          content: Buffer.from(await after.arrayBuffer()),
          contentType: after.type,
        },
        {
          filename: before.name || "bylo.jpg",
          content: Buffer.from(await before.arrayBuffer()),
          contentType: before.type,
        },
      ],
    });

    await logEmail({
      siteId,
      radarId: site.radar_id,
      toEmail: finalTo,
      subject,
      messageId: info.messageId,
    });

    if (!testMode) {
      await createFollowUp({ siteId, type: "email", touchNo: 1 });
      await updateSiteStatus(siteId, "contacted");
      const batchDate = site.batch_date
        ? String(site.batch_date).slice(0, 10)
        : mskDateISO();
      await bumpBatchCounter(batchDate, "sent_count");
    }

    return NextResponse.json({
      ok: true,
      messageId: info.messageId,
      sentTo: finalTo,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "send_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
