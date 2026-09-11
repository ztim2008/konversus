/**
 * Ручное добавление сайта в очередь «Сегодня»:
 * URL → audit → deep email → screenshot → KP → queued.
 * Лимит 20 для manual не блокирует (гипотезы вручную); авто — отдельно.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { extractDomain } from "@/lib/serper-client";
import { guessCompanyName } from "@/lib/company-site-filter";
import { checkWebsite } from "@/lib/website-checker";
import { findDeepEmail } from "@/lib/deep-email";
import { captureSiteScreenshot } from "@/lib/site-screenshot";
import { generatePersonalizedKP } from "@/lib/lead-agent/ai-composer";
import {
  buildKpSubject,
  renderLeadWebKpHtml,
} from "@/lib/lead-agent/kp-html-template";
import {
  countQueuedForDate,
  createRadar,
  getBatchByDate,
  upsertBatchPlan,
} from "@/lib/data/lead-radar";
import { getDbPool } from "@/lib/db";
import { getAllSettings } from "@/lib/data/settings";
import { sendManualEnqueueNotification } from "@/lib/lead-radar/telegram-digest";
import {
  getDailyQueueLimit,
  getManualRespectsLimit,
} from "@/lib/lead-radar/config";

const CONTACT_COOLDOWN_DAYS = 30;

export type EnqueueUrlResult =
  | {
      ok: true;
      siteId: string;
      domain: string;
      name: string;
      email: string;
      queuedCount: number;
      overLimit: boolean;
      limit: number;
      tokens: number;
      telegram?: { ok: boolean; error?: string };
    }
  | {
      ok: false;
      error: string;
      reason?:
        | "bad_url"
        | "duplicate"
        | "unreachable"
        | "no_email"
        | "no_screenshot"
        | "enrich_error";
      domain?: string;
      queuedCount?: number;
    };

function normalizeUrl(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname || !u.hostname.includes(".")) return null;
    u.hash = "";
    return u.toString().replace(/\/$/, "") === `${u.protocol}//${u.host}`
      ? `${u.protocol}//${u.host}/`
      : u.toString();
  } catch {
    return null;
  }
}

async function domainRecentlyUsed(domain: string): Promise<boolean> {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT id FROM lead_radar_sites
     WHERE domain = ?
       AND (
         status IN ('queued','contacted','replied','won')
         OR contacted_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         OR (batch_date IS NOT NULL AND batch_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY))
       )
     LIMIT 1`,
    [domain, CONTACT_COOLDOWN_DAYS, CONTACT_COOLDOWN_DAYS]
  );
  return (rows as any[]).length > 0;
}

export async function enqueueUrlToQueue(params: {
  url: string;
  city?: string;
  niche?: string;
  name?: string;
  force?: boolean;
  skipTelegram?: boolean;
  skipScreenshot?: boolean;
}): Promise<EnqueueUrlResult> {
  const batchDate = new Date().toISOString().slice(0, 10);
  const limit = await getDailyQueueLimit();
  const manualRespectsLimit = await getManualRespectsLimit();
  const queuedBefore = await countQueuedForDate(batchDate);
  const normalized = normalizeUrl(params.url);
  if (!normalized) {
    return { ok: false, error: "Некорректный URL", reason: "bad_url", queuedCount: queuedBefore };
  }

  if (manualRespectsLimit && queuedBefore >= limit) {
    return {
      ok: false,
      error: `Очередь полная (${queuedBefore}/${limit}). Увеличьте лимит в «Рулетка» или пропустите лиды.`,
      reason: "enrich_error",
      queuedCount: queuedBefore,
    };
  }

  const domain = extractDomain(normalized);
  if (!domain) {
    return { ok: false, error: "Не удалось определить домен", reason: "bad_url", queuedCount: queuedBefore };
  }

  if (!params.force && (await domainRecentlyUsed(domain))) {
    return {
      ok: false,
      error: `Домен ${domain} уже в работе за последние ${CONTACT_COOLDOWN_DAYS} дн. Отметьте «всё равно», чтобы добавить снова.`,
      reason: "duplicate",
      domain,
      queuedCount: queuedBefore,
    };
  }

  const city = (params.city || "Ручной").trim() || "Ручной";
  const niche = (params.niche || "ручной URL").trim() || "ручной URL";
  const publicOrigin =
    process.env.NEXT_PUBLIC_BASE_URL || "https://konversus.ru";

  try {
    const audit = await checkWebsite(normalized);
    if (!audit.reachable) {
      return {
        ok: false,
        error: "Сайт недоступен",
        reason: "unreachable",
        domain,
        queuedCount: queuedBefore,
      };
    }

    const emailInfo = await findDeepEmail(normalized);
    if (!emailInfo.email) {
      return {
        ok: false,
        error: "Email не найден (глубокий поиск). В очередь без почты не кладём.",
        reason: "no_email",
        domain,
        queuedCount: queuedBefore,
      };
    }

    let screenshotPath = "";
    let screenshotUrl = "";
    if (!params.skipScreenshot) {
      const shot = await captureSiteScreenshot({
        pageUrl: normalized,
        siteId: domain.replace(/\W+/g, "_").slice(0, 40),
      });
      if (!shot.ok || !shot.path || !shot.url) {
        return {
          ok: false,
          error: shot.error || "Не удалось сделать скриншот",
          reason: "no_screenshot",
          domain,
          queuedCount: queuedBefore,
        };
      }
      screenshotPath = shot.path;
      screenshotUrl = shot.url;
    }

    const rawName =
      params.name?.trim() ||
      audit.h1.texts[0] ||
      guessCompanyName("", domain) ||
      domain;
    const name = String(rawName).replace(/\s+/g, " ").trim().slice(0, 255);

    const generated = await generatePersonalizedKP({
      domain,
      niche,
      city,
      issues: audit.issues,
      cms: audit.cms || "",
      travel: false,
    });

    const radarId = await createRadar({
      city,
      niche,
      filters: ["manual"],
    });

    const subject = buildKpSubject(name, domain);
    const siteId = randomUUID();

    const htmlFinal = renderLeadWebKpHtml({
      companyName: name,
      domain,
      platform: audit.cms,
      city,
      bodyText: generated.bodyText,
      screenshotUrl: screenshotUrl || null,
      leadId: siteId,
      batchDate,
      issues: audit.issues,
      publicOrigin,
    });

    const db = getDbPool();
    await db.query(
      `INSERT INTO lead_radar_sites (
        id, radar_id, domain, name, url, platform, source, serp_query, serp_position,
        email, email_source_url, problems, privacy_issues,
        screenshot_path, screenshot_url, screenshot_at,
        kp_html, kp_subject, kp_tokens_in, kp_tokens_out,
        hot_score, score, h1_text, status, queued_at, batch_date
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),?,?,?,?,?,?,?,'queued',NOW(),?)`,
      [
        siteId,
        radarId,
        domain,
        name,
        normalized,
        audit.cms,
        "manual",
        null,
        null,
        emailInfo.email,
        emailInfo.sourceUrl,
        JSON.stringify(audit.issues),
        JSON.stringify(audit.privacyIssues),
        screenshotPath,
        screenshotUrl,
        htmlFinal,
        subject,
        generated.tokensIn,
        generated.tokensOut,
        audit.hotScore,
        audit.score,
        audit.h1.texts[0] || null,
        batchDate,
      ]
    );

    const queuedCount = await countQueuedForDate(batchDate);
    const existingBatch = await getBatchByDate(batchDate);
    const prevTokens = Number(existingBatch?.tokens_total || 0);
    const addTokens = generated.tokensIn + generated.tokensOut;
    await upsertBatchPlan({
      batchDate,
      queuedCount,
      tokensTotal: prevTokens + addTokens,
    });

    const overLimit = queuedCount > limit;
    let telegram: { ok: boolean; error?: string } | undefined;

    if (!params.skipTelegram) {
      const settings = await getAllSettings();
      if (settings.telegram_bot_token && settings.telegram_chat_id) {
        telegram = await sendManualEnqueueNotification({
          botToken: settings.telegram_bot_token,
          chatId: settings.telegram_chat_id,
          name,
          domain,
          platform: audit.cms,
          email: emailInfo.email,
          screenshotUrl,
          screenshotPath,
          kpSubject: subject,
          kpHtml: htmlFinal,
          publicOrigin,
          overLimit,
          queuedCount,
          limit,
        });
      }
    }

    return {
      ok: true,
      siteId,
      domain,
      name,
      email: emailInfo.email,
      queuedCount,
      overLimit,
      limit,
      tokens: addTokens,
      telegram,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Ошибка анализа",
      reason: "enrich_error",
      domain,
      queuedCount: queuedBefore,
    };
  }
}
