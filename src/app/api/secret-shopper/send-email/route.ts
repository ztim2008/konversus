import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { to, subject, html, testMode } = await req.json();
  if (!to || !subject || !html) return NextResponse.json({ error: "to, subject, html required" }, { status: 400 });

  const finalTo = testMode ? "bilariuss@yandex.ru" : to;

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.yandex.ru",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER || "bilariuss@yandex.ru",
        pass: process.env.SMTP_PASS || "",
      },
    });

    const info = await transporter.sendMail({
      from: `"Алексей Тимофеев | Konversus" <${process.env.SMTP_USER || "bilariuss@yandex.ru"}>`,
      to: finalTo,
      subject,
      html,
    });

    return NextResponse.json({ ok: true, messageId: info.messageId, sentTo: finalTo });
  } catch (err: any) {
    console.error("[send-email]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
