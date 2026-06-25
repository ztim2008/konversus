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
  const greeting = name && name.length > 0 ? `Здравствуйте, ${name}!` : "Здравствуйте!";
  const problems = lead.problems.filter(p => !p.includes("📩")).map((p, i) => `${i === 0 ? "🔴" : "🟡"} ${p}`);
  return template.replace("Здравствуйте!", greeting).replace("[ДОМЕН]", lead.domain).replace("[ПРОБЛЕМЫ]", problems.join("\n"));
}

export function buildEmailHtml(lead: Lead, kpText: string) {
  const problems = lead.problems || [];
  const photoUrl = "https://konversus.ru/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg";
  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0e13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e13;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
<tr><td style="padding:32px 40px 20px;text-align:center;">
<div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.02em;">Аудит сайта</div>
<div style="font-size:16px;color:#6366f1;margin-top:6px;font-weight:600;">${lead.domain}</div>
</td></tr>
<tr><td style="padding:0 40px 24px;">
<div style="font-size:14px;font-weight:600;color:#94a3b8;margin-bottom:12px;">Обнаруженные проблемы:</div>
${problems.map((p: string, i: number) => `
<div style="padding:10px 16px;margin-bottom:8px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
<span style="color:${i === 0 ? '#ef4444' : '#f59e0b'};font-weight:700;">${i === 0 ? '🔴' : '🟡'}</span>
<span style="color:#d4d4d8;font-size:14px;">${p}</span>
</div>`).join('')}
</td></tr>
<tr><td style="padding:0 40px 24px;">
<div style="color:#d4d4d8;font-size:14px;line-height:1.7;white-space:pre-wrap;">${kpText.replace(/\n/g, '<br>')}</div>
</td></tr>
<tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);background:rgba(99,102,241,0.05);">
<table cellpadding="0" cellspacing="0" width="100%"><tr>
<td width="56"><img src="${photoUrl}" width="48" height="48" style="border-radius:50%;object-fit:cover;border:2px solid #6366f1;" alt="Алексей Тимофеев" /></td>
<td>
<div style="font-weight:700;color:#fff;font-size:15px;">Алексей Тимофеев</div>
<div style="color:#94a3b8;font-size:12px;margin-top:2px;">17 лет в digital · 120+ проектов</div>
<div style="margin-top:8px;font-size:12px;">
<a href="https://t.me/bilarius" style="color:#6366f1;text-decoration:none;margin-right:16px;">📱 @bilarius</a>
<a href="tel:+79212013252" style="color:#6366f1;text-decoration:none;margin-right:16px;">📞 +7 921 201-32-52</a>
<a href="https://konversus.ru" style="color:#6366f1;text-decoration:none;">🌐 konversus.ru</a>
</div>
<div style="margin-top:6px;font-size:11px;color:#64748b;">
<a href="https://konversus.ru/about" style="color:#64748b;">Портфолио</a> · 
<a href="https://ssl.konversus.ru" style="color:#64748b;">SSL Doctor</a> · 
<a href="https://leads.konversus.ru" style="color:#64748b;">Leads AI</a>
</div>
</td></tr></table>
</td></tr>
</table>
<div style="text-align:center;padding:16px;color:#475569;font-size:11px;">Отчёт создан сервисом Konversus Lead Radar</div>
</td></tr></table>
</body></html>`;
}
