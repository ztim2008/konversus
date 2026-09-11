"use client";
import type { Lead } from "../lib/types";
import { KP_TEMPLATE } from "../lib/types";

export function hotLabel(score: number) {
  if (score >= 75) return { e: "🔥", t: "ГОРЯЧИЙ", c: "#ef4444" };
  if (score >= 60) return { e: "🟡", t: "ТЁПЛЫЙ", c: "#f59e0b" };
  return { e: "🔵", t: "ХОЛОДНЫЙ", c: "#3b82f6" };
}

export function generateKP(lead: Lead, kpTemplate?: string) {
  const template = kpTemplate || KP_TEMPLATE;
  const name = lead.contactName || lead.name;
  const greeting =
    name && name.length > 0 ? `Здравствуйте, ${name}!` : "Здравствуйте!";
  const problems = lead.problems
    .filter((p) => !p.includes("📩"))
    .map((p, i) => `${i === 0 ? "🔴" : "🟡"} ${p}`);
  return template
    .replace("Здравствуйте!", greeting)
    .replace("[ДОМЕН]", lead.domain)
    .replace("[ПРОБЛЕМЫ]", problems.join("\n"));
}

/** Fallback HTML только если нет шаблона lead-web.pro (AI/generate-kp). */
export function buildEmailHtml(lead: Lead, kpText: string) {
  const problems = lead.problems || [];
  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
<tr><td style="padding:28px 36px 16px;">
<div style="font-size:13px;font-weight:700;letter-spacing:0.04em;color:#0f172a;">lead-web.pro</div>
<div style="font-size:12px;color:#64748b;margin-top:4px;">веб-разработка · заявки с сайта</div>
</td></tr>
<tr><td style="padding:8px 36px 20px;">
<div style="font-size:20px;font-weight:700;color:#0f172a;">Посмотрел сайт ${lead.domain}</div>
</td></tr>
<tr><td style="padding:0 36px 20px;">
<div style="font-size:13px;font-weight:600;color:#64748b;margin-bottom:10px;">Что заметили:</div>
${problems
  .map(
    (p: string, i: number) => `
<div style="padding:10px 14px;margin-bottom:8px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;">
<span style="color:${i === 0 ? "#ef4444" : "#f59e0b"};font-weight:700;">${i === 0 ? "❌" : "⚠️"}</span>
<span style="color:#334155;font-size:14px;">${p}</span>
</div>`
  )
  .join("")}
</td></tr>
<tr><td style="padding:0 36px 24px;">
<div style="color:#334155;font-size:14px;line-height:1.7;white-space:pre-wrap;">${kpText.replace(/\n/g, "<br>")}</div>
</td></tr>
<tr><td style="padding:20px 36px;border-top:1px solid #e2e8f0;background:#f8fafc;">
<div style="font-weight:700;color:#0f172a;font-size:14px;">Команда lead-web.pro</div>
<div style="margin-top:8px;font-size:12px;">
<a href="https://lead-web.pro" style="color:#2563eb;text-decoration:none;margin-right:14px;">lead-web.pro</a>
<a href="https://t.me/bilarius" style="color:#2563eb;text-decoration:none;">Telegram @bilarius</a>
</div>
</td></tr>
</table>
<div style="text-align:center;padding:14px;color:#94a3b8;font-size:11px;">Письмо от lead-web.pro · не Konversus</div>
</td></tr></table>
</body></html>`;
}
