import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { logEmail, createFollowUp } from "@/lib/data/lead-radar";

export async function POST(req: NextRequest) {
  const { to, subject, html, testMode, siteId, radarId } = await req.json();
  const finalTo = testMode ? "bilariuss@yandex.ru" : (to || "bilariuss@yandex.ru");

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.yandex.ru", port: 465, secure: true,
      auth: { user: process.env.SMTP_USER || "bilariuss@yandex.ru", pass: process.env.SMTP_PASS || "" },
    });

    // Добавляем пиксель отслеживания открытий
    const trackingHtml = html + `<img src="https://konversus.ru/api/secret-shopper/track-open?siteId=${siteId || ''}" width="1" height="1" style="display:none" />`;

    const info = await transporter.sendMail({
      from: `"Алексей Тимофеев | Konversus" <${process.env.SMTP_USER || "bilariuss@yandex.ru"}>`,
      to: finalTo, subject, html: trackingHtml,
    });

    // Логируем
    await logEmail({ siteId, radarId, toEmail: finalTo, subject, messageId: info.messageId });

    // Создаём follow-up (только если не тестовый режим)
    if (!testMode && siteId) {
      await createFollowUp({ siteId, type: "email" });
    }

    return NextResponse.json({ ok: true, messageId: info.messageId, sentTo: finalTo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
