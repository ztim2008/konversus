/**
 * HTML-шаблон КП для исходящих писем lead-web.pro.
 * Инлайн-стили, мобильный, скрин сайта получателя.
 */

export type KpHtmlInput = {
  companyName: string;
  domain: string;
  platform?: string | null;
  city?: string;
  bodyText: string;
  screenshotUrl?: string | null;
  leadId?: string | null;
  batchDate?: string;
  issues?: string[];
  publicOrigin?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtmlParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = escapeHtml(block).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1c1917;">${lines}</p>`;
    })
    .join("\n");
}

function absoluteUrl(url: string | null | undefined, origin: string): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = origin.replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export function buildLeadWebCtaUrl(params: {
  leadId?: string | null;
  batchDate?: string;
  /** Origin моста (konversus) — клик сначала фиксирует интерес */
  bridgeOrigin?: string;
}): string {
  const batch =
    params.batchDate || new Date().toISOString().slice(0, 10);
  const dest = new URL("https://lead-web.pro/");
  dest.searchParams.set("utm_source", "radar");
  dest.searchParams.set("utm_medium", "email");
  dest.searchParams.set("utm_campaign", `batch_${batch}`);
  if (params.leadId) dest.searchParams.set("lead", params.leadId);

  // Авто-канал этапа 8: клик по CTA → interest на konversus → replied + TG → редирект
  if (params.leadId) {
    const origin = (
      params.bridgeOrigin ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://konversus.ru"
    ).replace(/\/$/, "");
    const bridge = new URL(`${origin}/api/lead-radar/interest`);
    bridge.searchParams.set("lead", params.leadId);
    bridge.searchParams.set("batch", batch);
    return bridge.toString();
  }

  return dest.toString();
}

export function buildKpSubject(companyName: string, domain: string): string {
  const name = companyName?.trim() || domain;
  return `Посмотрел сайт ${name}: пара идей по заявкам`;
}

export function renderLeadWebKpHtml(input: KpHtmlInput): string {
  const origin =
    input.publicOrigin || process.env.NEXT_PUBLIC_BASE_URL || "https://konversus.ru";
  const shot = absoluteUrl(input.screenshotUrl, origin);
  const cta = buildLeadWebCtaUrl({
    leadId: input.leadId,
    batchDate: input.batchDate,
    bridgeOrigin: origin,
  });
  const platform = input.platform?.trim();
  const issues = (input.issues || []).slice(0, 4);
  const bodyHtml = textToHtmlParagraphs(input.bodyText);

  const metaBits = [
    escapeHtml(input.companyName || input.domain),
    input.city ? escapeHtml(input.city) : "",
    platform ? `платформа: <strong style="color:#1c1917;">${escapeHtml(platform)}</strong>` : "",
  ].filter(Boolean);

  const issuesBlock =
    issues.length > 0
      ? `<p style="margin:16px 0 6px;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#78716c;">Что заметили</p>
<ul style="margin:0 0 18px;padding:0 0 0 18px;color:#44403c;font-size:14px;line-height:1.5;">
${issues
  .map(
    (i) =>
      `<li style="margin:0 0 6px;">${escapeHtml(i.replace(/^❌\s*|^⚠️\s*/, ""))}</li>`
  )
  .join("\n")}
</ul>`
      : "";

  const shotHtml = shot
    ? `<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#78716c;">Фрагмент главной ${escapeHtml(input.domain)}</p>
<a href="${escapeHtml(cta)}" style="display:block;border:1px solid #e7e5e4;border-radius:4px;overflow:hidden;text-decoration:none;margin:0 0 20px;">
  <img src="${escapeHtml(shot)}" alt="Скриншот ${escapeHtml(input.domain)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;" />
</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e7e5e4;">
        <tr><td style="padding:22px 28px 12px;border-bottom:3px solid #1c1917;font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#1c1917;">lead-web.pro</div>
          <div style="margin-top:4px;font-size:12px;color:#78716c;">веб-разработка с умом и на результат</div>
        </td></tr>
        <tr><td style="padding:24px 28px 8px;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0 0 16px;font-size:13px;color:#78716c;">${metaBits.join(" · ")}</p>
          ${shotHtml}
          <!--kp-body-->
          ${bodyHtml}
          <!--/kp-body-->
          ${issuesBlock}
          <div style="margin-top:8px;">
            <a href="tel:+79238240461" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;padding:14px 24px;font-size:17px;font-weight:700;border-radius:2px;letter-spacing:0.01em;">
              Позвонить: +7 (923) 824-04-61
            </a>
          </div>
          <p style="margin:12px 0 0;font-size:13px;color:#57534e;line-height:1.45;">
            Игорь · веб-разработчик lead-web.pro<br/>
            <a href="${escapeHtml(cta)}" style="color:#78716c;font-size:12px;text-decoration:underline;">Сайт lead-web.pro — дополнительно</a>
          </p>
          <p style="margin:10px 0 0;font-size:12px;color:#a8a29e;line-height:1.4;">
            Или ответьте на это письмо — подскажем по сайту без обязательства.
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px;background:#fafaf9;border-top:1px solid #e7e5e4;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#57534e;line-height:1.55;">
          <strong style="display:block;font-size:14px;color:#1c1917;margin-bottom:4px;">Игорь</strong>
          веб-разработчик · lead-web.pro<br/>
          <a href="tel:+79238240461" style="display:inline-block;margin-top:6px;font-size:16px;font-weight:700;color:#1c1917;text-decoration:none;">+7 (923) 824-04-61</a><br/>
          <a href="${escapeHtml(cta)}" style="color:#a8a29e;font-size:11px;text-decoration:underline;">lead-web.pro</a>
          · <a href="mailto:leadweb@yandex.ru" style="color:#a8a29e;font-size:11px;">leadweb@yandex.ru</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
