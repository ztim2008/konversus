/**
 * One-off: rebuild queued KP HTML under active sender profile (alexey).
 * Keeps body text; swaps Igor/lead-web persona strings; rewraps template.
 *
 * Usage: node --env-file=.env.local scripts/rebuild-kp-alexey.mjs
 */
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      if (!process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* ignore */
  }
}
loadEnvLocal();

const PROFILE = {
  id: "alexey",
  displayName: "Алексей",
  fullName: "Алексей Тимофеев",
  role: "специалист по сайтам для строителей",
  brand: "russait.ru",
  tagline: "сайты для тех, кто строит из дерева",
  phoneE164: "+79212013252",
  phoneDisplay: "+7 (921) 201-32-52",
  primarySiteUrl: "https://russait.ru/",
  primarySiteLabel: "russait.ru",
  secondarySiteUrl: "https://маркет-фон.рф/",
  secondarySiteLabel: "маркет-фон.рф",
  videoUrl: "https://vkvideo.ru/@craftum_design",
  videoLabel: "Видеоканал Craftum Design",
  photoUrl:
    "https://konversus.ru/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg",
  offerBullets: [
    "Обработка фото объектов с помощью ИИ — аккуратное портфолио без «сырых» снимков",
    "Коммерческие предложения и презентации под объекты / клиентов",
    "Каталог продукции: буклет или PDF для менеджеров и выставок",
    "Настройка рекламы и аналитика конкурентов — где теряются заявки",
    "Разбор слабых сторон сайта и воронки: что мешает звонкам",
  ],
};

const PUBLIC_ORIGIN = "https://konversus.ru";

function absoluteUrl(url) {
  if (!url) return "";
  if (String(url).startsWith("http://") || String(url).startsWith("https://")) {
    return String(url);
  }
  return `${PUBLIC_ORIGIN}${String(url).startsWith("/") ? url : `/${url}`}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractBodyText(kpHtml) {
  if (!kpHtml) return "";
  const m = kpHtml.match(/<!--kp-body-->([\s\S]*?)<!--\/kp-body-->/);
  const chunk = m ? m[1] : kpHtml;
  return chunk
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function rewritePersona(text) {
  return text
    .replace(/Меня зовут Игорь[^.\n]*(?:lead-web\.pro)?\.?/gi, "Меня зовут Алексей Тимофеев, специалист по сайтам для строителей (russait.ru).")
    .replace(/Игорь\s*[,·—-]?\s*веб-разработчик(?:\s*lead-web\.pro)?/gi, "Алексей Тимофеев, специалист по сайтам для строителей")
    .replace(/С уважением,?\s*Игорь/gi, "С уважением,\nАлексей Тимофеев")
    .replace(/Игорь/g, "Алексей")
    .replace(/lead-web\.pro/gi, "russait.ru")
    .replace(/Команда russait\.ru/gi, "Алексей · russait.ru");
}

function textToHtmlParagraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const lines = escapeHtml(b).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1c1917;">${lines}</p>`;
    })
    .join("\n");
}

function buildCta(leadId, batchDate) {
  const batch = batchDate || new Date().toISOString().slice(0, 10);
  if (!leadId) return PROFILE.primarySiteUrl;
  const u = new URL("https://konversus.ru/api/lead-radar/interest");
  u.searchParams.set("lead", leadId);
  u.searchParams.set("batch", batch);
  return u.toString();
}

function buildCallBridge(leadId, batchDate) {
  const batch = batchDate || new Date().toISOString().slice(0, 10);
  if (!leadId) return `tel:${PROFILE.phoneE164}`;
  const u = new URL("https://konversus.ru/api/lead-radar/call");
  u.searchParams.set("lead", leadId);
  u.searchParams.set("batch", batch);
  return u.toString();
}

function parseIssues(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw);
      return Array.isArray(j) ? j.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function batchDateStr(v) {
  if (!v) return new Date().toISOString().slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : new Date().toISOString().slice(0, 10);
}

function renderHtml(site, bodyText) {
  const p = PROFILE;
  const batch = batchDateStr(site.batch_date);
  const cta = buildCta(site.id, batch);
  const callHref = buildCallBridge(site.id, batch);
  const issues = parseIssues(site.problems).slice(0, 4);
  const shot = absoluteUrl(site.screenshot_url || "");
  const photo = p.photoUrl;
  const platform = (site.platform || "").trim();
  const bodyHtml = textToHtmlParagraphs(bodyText);
  const bullets = p.offerBullets || [];

  const metaBits = [
    escapeHtml(site.name || site.domain),
    platform
      ? `платформа: <strong style="color:#1c1917;">${escapeHtml(platform)}</strong>`
      : "",
  ].filter(Boolean);

  const issuesBlock =
    issues.length > 0
      ? `<p style="margin:16px 0 6px;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#78716c;">Что заметили</p>
<ul style="margin:0 0 18px;padding:0 0 0 18px;color:#44403c;font-size:14px;line-height:1.5;">
${issues
  .map(
    (i) =>
      `<li style="margin:0 0 6px;">${escapeHtml(String(i).replace(/^❌\s*|^⚠️\s*/, ""))}</li>`
  )
  .join("\n")}
</ul>`
      : "";

  const offerBlock =
    bullets.length > 0
      ? `<p style="margin:18px 0 6px;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#78716c;">Чем ещё могу помочь</p>
<ul style="margin:0 0 18px;padding:0 0 0 18px;color:#44403c;font-size:14px;line-height:1.5;">
${bullets.map((b) => `<li style="margin:0 0 6px;">${escapeHtml(b)}</li>`).join("\n")}
</ul>`
      : "";

  const shotHtml = shot
    ? `<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#78716c;">Фрагмент главной ${escapeHtml(site.domain)}</p>
<a href="${escapeHtml(cta)}" style="display:block;border:1px solid #e7e5e4;border-radius:4px;overflow:hidden;text-decoration:none;margin:0 0 20px;">
  <img src="${escapeHtml(shot)}" alt="Скриншот ${escapeHtml(site.domain)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;" />
</a>`
    : "";

  const photoCell = `<td style="vertical-align:middle;padding:0 14px 0 0;width:72px;">
  <img src="${escapeHtml(photo)}" alt="${escapeHtml(p.fullName)}" width="72" height="72" style="display:block;width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid #e7e5e4;" />
</td>`;

  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e7e5e4;">
        <tr><td style="padding:22px 28px 12px;border-bottom:3px solid #1c1917;font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#1c1917;">${escapeHtml(p.brand)}</div>
          <div style="margin-top:4px;font-size:12px;color:#78716c;">${escapeHtml(p.tagline)}</div>
        </td></tr>
        <tr><td style="padding:24px 28px 8px;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0 0 16px;font-size:13px;color:#78716c;">${metaBits.join(" · ")}</p>
          ${shotHtml}
          <!--kp-body-->
          ${bodyHtml}
          <!--/kp-body-->
          ${issuesBlock}
          ${offerBlock}
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:12px;">
            <tr>
              ${photoCell}
              <td style="vertical-align:middle;">
                <a href="${escapeHtml(callHref)}" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;padding:14px 22px;font-size:17px;font-weight:700;border-radius:2px;letter-spacing:0.01em;">
                  Позвонить: ${escapeHtml(p.phoneDisplay)}
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:14px 0 0;font-size:13px;color:#57534e;line-height:1.45;">
            ${escapeHtml(p.fullName)} · ${escapeHtml(p.role)}<br/>
            <a href="${escapeHtml(cta)}" style="color:#78716c;font-size:12px;text-decoration:underline;">Сайт ${escapeHtml(p.primarySiteLabel)} — портфолио</a>
            <br/><a href="${escapeHtml(p.videoUrl)}" style="color:#78716c;font-size:12px;text-decoration:underline;">${escapeHtml(p.videoLabel)}</a>
          </p>
          <p style="margin:10px 0 0;font-size:12px;color:#a8a29e;line-height:1.4;">
            Или ответьте на это письмо — подскажу по сайту без обязательства.
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px;background:#fafaf9;border-top:1px solid #e7e5e4;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#57534e;line-height:1.55;">
          <strong style="display:block;font-size:14px;color:#1c1917;margin-bottom:2px;">${escapeHtml(p.fullName)}</strong>
          ${escapeHtml(p.role)} · ${escapeHtml(p.brand)}<br/>
          <a href="${escapeHtml(callHref)}" style="display:inline-block;margin-top:6px;font-size:16px;font-weight:700;color:#1c1917;text-decoration:none;">${escapeHtml(p.phoneDisplay)}</a><br/>
          <a href="${escapeHtml(cta)}" style="color:#a8a29e;font-size:11px;text-decoration:underline;">${escapeHtml(p.primarySiteLabel)}</a>
          · <a href="${escapeHtml(p.secondarySiteUrl)}" style="color:#a8a29e;font-size:11px;text-decoration:underline;">${escapeHtml(p.secondarySiteLabel)}</a>
          <br/><a href="${escapeHtml(p.videoUrl)}" style="color:#a8a29e;font-size:11px;text-decoration:underline;">${escapeHtml(p.videoLabel)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function main() {
  const db = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
  });

  const [rows] = await db.query(
    `SELECT id, domain, name, platform, problems, screenshot_url, kp_html, kp_subject, batch_date
     FROM lead_radar_sites WHERE status = 'queued' ORDER BY queued_at DESC`
  );

  let ok = 0;
  for (const site of rows) {
    const rawBody = extractBodyText(site.kp_html);
    const body = rewritePersona(rawBody || `Здравствуйте!\n\nПосмотрел сайт ${site.domain}. Готов коротко разобрать точки роста по заявкам.`);
    const html = renderHtml(site, body);
    await db.query(
      `UPDATE lead_radar_sites SET kp_html = ? WHERE id = ?`,
      [html, site.id]
    );
    ok++;
  }

  console.log(JSON.stringify({ rebuilt: ok, total: rows.length }, null, 2));
  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
