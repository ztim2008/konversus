/**
 * HTML-шаблон КП под активный профиль отправителя.
 * Инлайн-стили, мобильный, скрин сайта получателя, одно фото у телефона.
 */
import type { SenderProfile } from "@/lib/lead-radar/sender-profiles";
import {
  DEFAULT_SENDER_PROFILE_ID,
  getSenderProfileById,
} from "@/lib/lead-radar/sender-profiles";

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
  /** Если не передан — дефолт активного профиля (без чтения settings). */
  profile?: SenderProfile;
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

/** Абсолютный URL для картинок в письме (относительные в почте → 404). */
export function absoluteUrl(
  url: string | null | undefined,
  origin: string
): string | null {
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
  /** Куда редиректить после interest */
  destUrl?: string;
}): string {
  const batch =
    params.batchDate || new Date().toISOString().slice(0, 10);
  const dest = new URL(params.destUrl || "https://russait.ru/");
  dest.searchParams.set("utm_source", "radar");
  dest.searchParams.set("utm_medium", "email");
  dest.searchParams.set("utm_campaign", `batch_${batch}`);
  if (params.leadId) dest.searchParams.set("lead", params.leadId);

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

/** Мост «Позвонить»: клик → БД/TG → страница с tel: */
export function buildCallBridgeUrl(params: {
  leadId?: string | null;
  batchDate?: string;
  bridgeOrigin?: string;
  /** Fallback если нет leadId — прямой tel: */
  phoneE164: string;
}): string {
  if (!params.leadId) {
    return `tel:${params.phoneE164}`;
  }
  const batch =
    params.batchDate || new Date().toISOString().slice(0, 10);
  const origin = (
    params.bridgeOrigin ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://konversus.ru"
  ).replace(/\/$/, "");
  const bridge = new URL(`${origin}/api/lead-radar/call`);
  bridge.searchParams.set("lead", params.leadId);
  bridge.searchParams.set("batch", batch);
  return bridge.toString();
}

/** @deprecated имя оставлено для совместимости — использует профиль. */
export function buildKpSubject(companyName: string, domain: string): string {
  const name = companyName?.trim() || domain;
  return `Посмотрел сайт ${name}: пара идей по заявкам`;
}

export function renderLeadWebKpHtml(input: KpHtmlInput): string {
  const profile =
    input.profile || getSenderProfileById(DEFAULT_SENDER_PROFILE_ID);
  const origin =
    input.publicOrigin || process.env.NEXT_PUBLIC_BASE_URL || "https://konversus.ru";
  const shot = absoluteUrl(input.screenshotUrl, origin);
  const photo = absoluteUrl(profile.photoUrl, origin);
  const cta = buildLeadWebCtaUrl({
    leadId: input.leadId,
    batchDate: input.batchDate,
    bridgeOrigin: origin,
    destUrl: profile.primarySiteUrl,
  });
  const callHref = buildCallBridgeUrl({
    leadId: input.leadId,
    batchDate: input.batchDate,
    bridgeOrigin: origin,
    phoneE164: profile.phoneE164,
  });
  const secondaryHref = profile.secondarySiteUrl || "";
  const videoHref = profile.videoUrl || "";
  const platform = input.platform?.trim();
  const issues = (input.issues || []).slice(0, 4);
  const bodyHtml = textToHtmlParagraphs(input.bodyText);
  const bullets = (profile.offerBullets || []).slice(0, 6);

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

  const offerBlock =
    bullets.length > 0
      ? `<p style="margin:18px 0 6px;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#78716c;">Чем ещё могу помочь</p>
<ul style="margin:0 0 18px;padding:0 0 0 18px;color:#44403c;font-size:14px;line-height:1.5;">
${bullets.map((b) => `<li style="margin:0 0 6px;">${escapeHtml(b)}</li>`).join("\n")}
</ul>`
      : "";

  const shotHtml = shot
    ? `<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#78716c;">Фрагмент главной ${escapeHtml(input.domain)}</p>
<a href="${escapeHtml(cta)}" style="display:block;border:1px solid #e7e5e4;border-radius:4px;overflow:hidden;text-decoration:none;margin:0 0 20px;">
  <img src="${escapeHtml(shot)}" alt="Скриншот ${escapeHtml(input.domain)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;" />
</a>`
    : "";

  // Одно фото — только у главной кнопки (в подвале без дубля)
  const photoCell = photo
    ? `<td style="vertical-align:middle;padding:0 14px 0 0;width:72px;">
  <img src="${escapeHtml(photo)}" alt="${escapeHtml(profile.fullName)}" width="72" height="72" style="display:block;width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid #e7e5e4;" />
</td>`
    : "";

  const videoLine = videoHref
    ? `<br/><a href="${escapeHtml(videoHref)}" style="color:#78716c;font-size:12px;text-decoration:underline;">${escapeHtml(profile.videoLabel || "Видео")}</a>`
    : "";

  const secondaryLine = secondaryHref
    ? ` · <a href="${escapeHtml(secondaryHref)}" style="color:#a8a29e;font-size:11px;text-decoration:underline;">${escapeHtml(profile.secondarySiteLabel || secondaryHref)}</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e7e5e4;">
        <tr><td style="padding:22px 28px 12px;border-bottom:3px solid #1c1917;font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#1c1917;">${escapeHtml(profile.brand)}</div>
          <div style="margin-top:4px;font-size:12px;color:#78716c;">${escapeHtml(profile.tagline)}</div>
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
                  Позвонить: ${escapeHtml(profile.phoneDisplay)}
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:14px 0 0;font-size:13px;color:#57534e;line-height:1.45;">
            ${escapeHtml(profile.fullName)} · ${escapeHtml(profile.role)}<br/>
            <a href="${escapeHtml(cta)}" style="color:#78716c;font-size:12px;text-decoration:underline;">Сайт ${escapeHtml(profile.primarySiteLabel)} — портфолио</a>${videoLine}
          </p>
          <p style="margin:10px 0 0;font-size:12px;color:#a8a29e;line-height:1.4;">
            Или ответьте на это письмо — подскажу по сайту без обязательства.
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px;background:#fafaf9;border-top:1px solid #e7e5e4;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#57534e;line-height:1.55;">
          <strong style="display:block;font-size:14px;color:#1c1917;margin-bottom:2px;">${escapeHtml(profile.fullName)}</strong>
          ${escapeHtml(profile.role)} · ${escapeHtml(profile.brand)}<br/>
          <a href="${escapeHtml(callHref)}" style="display:inline-block;margin-top:6px;font-size:16px;font-weight:700;color:#1c1917;text-decoration:none;">${escapeHtml(profile.phoneDisplay)}</a><br/>
          <a href="${escapeHtml(cta)}" style="color:#a8a29e;font-size:11px;text-decoration:underline;">${escapeHtml(profile.primarySiteLabel)}</a>${secondaryLine}
          ${videoHref ? `<br/><a href="${escapeHtml(videoHref)}" style="color:#a8a29e;font-size:11px;text-decoration:underline;">${escapeHtml(profile.videoLabel || "Видео")}</a>` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
