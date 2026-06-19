import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { logEmail } from "@/lib/data/lead-radar";

export async function POST(req: NextRequest) {
  const { to, subject, html, testMode, siteId, radarId } = await req.json();

  const finalTo = testMode ? "bilariuss@yandex.ru" : (to || "bilariuss@yandex.ru");
  if (!subject || !html) return NextResponse.json({ error: "subject and html required" }, { status: 400 });

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.yandex.ru", port: 465, secure: true,
      auth: { user: process.env.SMTP_USER || "bilariuss@yandex.ru", pass: process.env.SMTP_PASS || "" },
    });

    const info = await transporter.sendMail({
      from: `"Алексей Тимофеев | Konversus" <${process.env.SMTP_USER || "bilariuss@yandex.ru"}>`,
      to: finalTo, subject, html,
    });

    // Сохраняем в историю
    await logEmail({
      siteId, radarId,
      toEmail: finalTo,
      subject,
      messageId: info.messageId,
      status: "sent",
    });

    return NextResponse.json({ ok: true, messageId: info.messageId, sentTo: finalTo });
  } catch (err: any) {
    // Логируем ошибку
    await logEmail({
      siteId, radarId,
      toEmail: finalTo, subject,
      status: "failed",
    }).catch(() => {});

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
