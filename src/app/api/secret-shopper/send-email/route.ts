import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { logEmail, createFollowUp, updateSiteStatus } from "@/lib/data/lead-radar";

export async function POST(req: NextRequest) {
  const { to, subject, html, testMode, siteId, radarId } = await req.json();
  const finalTo = testMode ? (process.env.SMTP_USER || "bilariuss@yandex.ru") : (to || process.env.SMTP_USER);

  if (!finalTo) {
    return NextResponse.json({ error: "to required" }, { status: 400 });
  }
  if (!html || !subject) {
    return NextResponse.json({ error: "subject and html required" }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.yandex.ru", port: 465, secure: true,
      auth: { user: process.env.SMTP_USER || "", pass: process.env.SMTP_PASS || "" },
    });

    const fromUser = process.env.SMTP_USER || "leadweb@yandex.ru";
    const trackingHtml =
      html +
      `<img src="https://konversus.ru/api/secret-shopper/track-open?siteId=${encodeURIComponent(siteId || "")}" width="1" height="1" style="display:none" alt="" />`;

    const info = await transporter.sendMail({
      from: `"lead-web.pro" <${fromUser}>`,
      replyTo: "leadweb@yandex.ru",
      to: finalTo,
      subject,
      html: trackingHtml,
    });

    await logEmail({
      siteId,
      radarId,
      toEmail: finalTo,
      subject,
      messageId: info.messageId,
    });

    if (!testMode && siteId) {
      await createFollowUp({ siteId, type: "email" });
      await updateSiteStatus(siteId, "contacted");
    }

    return NextResponse.json({ ok: true, messageId: info.messageId, sentTo: finalTo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
