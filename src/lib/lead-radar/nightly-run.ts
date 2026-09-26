/**
 * Пайплайн сбора Лид-радар Auto:
 * волны SERP → фильтр → enrich → KP → queued (до бюджета sent) → Telegram.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import {
  buildCompanySerpQuery,
  extractDomain,
  searchSerperOrganic,
} from "@/lib/serper-client";
import { classifyCompanySite, guessCompanyName } from "@/lib/company-site-filter";
import { checkWebsite } from "@/lib/website-checker";
import { findDeepEmail } from "@/lib/deep-email";
import { captureSiteScreenshot } from "@/lib/site-screenshot";
import { generatePersonalizedKP } from "@/lib/lead-agent/ai-composer";
import {
  buildKpSubject,
  renderLeadWebKpHtml,
} from "@/lib/lead-agent/kp-html-template";
import { getActiveSenderProfile } from "@/lib/lead-radar/sender-profiles";
import {
  countQueuedForDate,
  createRadar,
  listQueuedSites,
  upsertBatchPlan,
} from "@/lib/data/lead-radar";
import { getDbPool } from "@/lib/db";
import { getAllSettings } from "@/lib/data/settings";
import { pickCityAndNiche, rememberCityNiche } from "@/lib/lead-radar/day-picker";
import { sendMorningDigest } from "@/lib/lead-radar/telegram-digest";

import {
  COLLECT_MAX_ROUNDS_DEFAULT,
  countSentForBatchDate,
  getCollectPerTick,
  getDailyQueueLimit,
  getDailySendLimit,
  mskDateISO,
} from "@/lib/lead-radar/config";

export { DAILY_QUEUE_LIMIT } from "@/lib/lead-radar/config";
const CONTACT_COOLDOWN_DAYS = 30;

/** Сколько держать в очереди: не больше лимита очереди и не больше остатка бюджета sent. */
export async function resolveCollectTarget(options?: {
  batchDate?: string;
  limit?: number;
}): Promise<{
  batchDate: string;
  queueLimit: number;
  sendLimit: number;
  sent: number;
  queued: number;
  target: number;
  need: number;
}> {
  const batchDate = options?.batchDate || mskDateISO();
  const queueLimit = await getDailyQueueLimit();
  const sendLimit = await getDailySendLimit();
  const cap =
    typeof options?.limit === "number"
      ? Math.min(queueLimit, Math.max(1, Math.floor(options.limit)))
      : queueLimit;
  const sent = await countSentForBatchDate(batchDate);
  const queued = await countQueuedForDate(batchDate);
  const remainingSend = Math.max(0, sendLimit - sent);
  const target = Math.min(cap, remainingSend);
  const need = Math.max(0, target - queued);
  return { batchDate, queueLimit: cap, sendLimit, sent, queued, target, need };
}

export type NightlyRunResult = {
  ok: boolean;
  batchDate: string;
  city: string;
  niche: string;
  vertical?: string;
  verticalId?: string;
  pickReason: string;
  radarId: string;
  serpRaw: number;
  candidates: number;
  queued: number;
  skipped: Array<{ domain: string; reason: string }>;
  tokensTotal: number;
  telegram: { ok: boolean; error?: string };
  alreadyHad?: number;
  error?: string;
};

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

async function insertQueuedSite(row: {
  radarId: string;
  domain: string;
  name: string;
  url: string;
  platform: string | null;
  email: string;
  emailSourceUrl: string | null;
  problems: string[];
  privacyIssues: string[];
  screenshotPath: string;
  screenshotUrl: string;
  hotScore: number;
  score: number;
  h1: string | null;
  serpQuery: string;
  serpPosition: number;
  kpHtml: string;
  kpSubject: string;
  tokensIn: number;
  tokensOut: number;
  batchDate: string;
}): Promise<string> {
  const db = getDbPool();
  const id = randomUUID();
  await db.query(
    `INSERT INTO lead_radar_sites (
      id, radar_id, domain, name, url, platform, source, serp_query, serp_position,
      email, email_source_url, problems, privacy_issues,
      screenshot_path, screenshot_url, screenshot_at,
      kp_html, kp_subject, kp_tokens_in, kp_tokens_out,
      hot_score, score, h1_text, status, queued_at, batch_date
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),?,?,?,?,?,?,?,'queued',NOW(),?)`,
    [
      id,
      row.radarId,
      row.domain,
      row.name,
      row.url,
      row.platform,
      "serp",
      row.serpQuery,
      row.serpPosition,
      row.email,
      row.emailSourceUrl,
      JSON.stringify(row.problems),
      JSON.stringify(row.privacyIssues),
      row.screenshotPath,
      row.screenshotUrl,
      row.kpHtml,
      row.kpSubject,
      row.tokensIn,
      row.tokensOut,
      row.hotScore,
      row.score,
      row.h1,
      row.batchDate,
    ]
  );
  return id;
}

export type CollectRunResult = NightlyRunResult & {
  rounds: number;
  target: number;
  sentToday: number;
  roundResults: Array<{
    niche: string;
    city: string;
    queuedDelta: number;
    serpRaw: number;
    candidates: number;
  }>;
};

export async function runNightlyLeadRadar(options?: {
  city?: string;
  niche?: string;
  vertical?: string;
  limit?: number;
  skipTelegram?: boolean;
  skipScreenshot?: boolean;
  dryRun?: boolean;
  /** Не слать TG (для внутренних раундов мульти-сбора). */
  suppressTelegram?: boolean;
  /** Жёсткий потолок новых КП за этот раунд (DeepSeek). */
  maxEnqueuePerRound?: number;
}): Promise<NightlyRunResult> {
  const budget = await resolveCollectTarget({ limit: options?.limit });
  const batchDate = budget.batchDate;
  const limit = budget.target;
  const perTickCap =
    typeof options?.maxEnqueuePerRound === "number"
      ? Math.max(1, Math.floor(options.maxEnqueuePerRound))
      : await getCollectPerTick();
  const skipped: Array<{ domain: string; reason: string }> = [];
  const samples: Array<{
    name: string;
    domain: string;
    platform?: string | null;
    email?: string | null;
    hotScore?: number;
    screenshotUrl?: string | null;
    screenshotPath?: string | null;
    kpSubject?: string | null;
    kpHtml?: string | null;
  }> = [];

  const already = budget.queued;
  if (budget.need <= 0) {
    return {
      ok: true,
      batchDate,
      city: options?.city || "",
      niche: options?.niche || "",
      pickReason: budget.sent >= budget.sendLimit ? "send_budget_done" : "idempotent",
      radarId: "",
      serpRaw: 0,
      candidates: 0,
      queued: already,
      skipped: [],
      tokensTotal: 0,
      telegram: { ok: true },
      alreadyHad: already,
    };
  }

  const need = Math.min(budget.need, perTickCap);
  const { city, niche, reason, verticalId, verticalLabel } =
    await pickCityAndNiche({
      city: options?.city,
      niche: options?.niche,
      vertical: options?.vertical,
    });

  const radarId = await createRadar({
    city: city.name,
    niche,
    filters: ["serp", "auto", verticalId],
  });

  const query = buildCompanySerpQuery(niche, city.name);
  const serp = await searchSerperOrganic({ query, num: 30 });

  type Cand = {
    domain: string;
    name: string;
    url: string;
    position: number;
    title: string;
  };
  const candidates: Cand[] = [];
  const seen = new Set<string>();

  for (const item of serp.organic) {
    const domain = extractDomain(item.link);
    const verdict = classifyCompanySite({
      url: item.link,
      title: item.title,
      snippet: item.snippet,
      domain,
    });
    if (!verdict.ok) {
      skipped.push({ domain: domain || item.link, reason: verdict.reason });
      continue;
    }
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    if (await domainRecentlyUsed(domain)) {
      skipped.push({ domain, reason: "recently_used" });
      continue;
    }
    candidates.push({
      domain,
      name: guessCompanyName(item.title, domain),
      url: item.link.startsWith("http") ? item.link : `https://${item.link}`,
      position: item.position,
      title: item.title,
    });
  }

  let queued = already;
  let tokensTotal = 0;

  const publicOrigin = process.env.NEXT_PUBLIC_BASE_URL || "https://konversus.ru";
  const profile = await getActiveSenderProfile();

  for (const cand of candidates) {
    if (queued >= limit) break;
    if (queued - already >= need) break;
    if (samples.length >= need) break;

    try {
      if (options?.dryRun) {
        skipped.push({ domain: cand.domain, reason: "dry_run" });
        continue;
      }

      const audit = await checkWebsite(cand.url);
      if (!audit.reachable) {
        skipped.push({ domain: cand.domain, reason: "unreachable" });
        continue;
      }

      const emailInfo = await findDeepEmail(cand.url);
      if (!emailInfo.email) {
        skipped.push({ domain: cand.domain, reason: "no_email" });
        continue;
      }

      let screenshotPath = "";
      let screenshotUrl = "";
      if (!options?.skipScreenshot) {
        const shot = await captureSiteScreenshot({
          pageUrl: cand.url,
          siteId: cand.domain.replace(/\W+/g, "_").slice(0, 40),
        });
        if (!shot.ok || !shot.path || !shot.url) {
          skipped.push({ domain: cand.domain, reason: "no_screenshot" });
          continue;
        }
        screenshotPath = shot.path;
        screenshotUrl = shot.url;
      } else {
        screenshotUrl = "";
        screenshotPath = "";
      }

      const generated = await generatePersonalizedKP({
        domain: cand.domain,
        niche,
        city: city.name,
        issues: audit.issues,
        cms: audit.cms || "",
        travel: city.travel,
      });
      tokensTotal += generated.tokensIn + generated.tokensOut;

      const subject = buildKpSubject(cand.name, cand.domain);
      const html = renderLeadWebKpHtml({
        companyName: cand.name,
        domain: cand.domain,
        platform: audit.cms,
        city: city.name,
        bodyText: generated.bodyText,
        screenshotUrl: screenshotUrl || null,
        leadId: null,
        batchDate,
        issues: audit.issues,
        publicOrigin,
        profile,
      });

      // insert without leadId in CTA first, then we could update — for MVP embed after insert
      const siteId = await insertQueuedSite({
        radarId,
        domain: cand.domain,
        name: cand.name,
        url: cand.url,
        platform: audit.cms,
        email: emailInfo.email,
        emailSourceUrl: emailInfo.sourceUrl,
        problems: audit.issues,
        privacyIssues: audit.privacyIssues,
        screenshotPath,
        screenshotUrl,
        hotScore: audit.hotScore,
        score: audit.score,
        h1: audit.h1.texts[0] || null,
        serpQuery: query,
        serpPosition: cand.position,
        kpHtml: "", // fill below with lead id
        kpSubject: subject,
        tokensIn: generated.tokensIn,
        tokensOut: generated.tokensOut,
        batchDate,
      });

      const htmlFinal = renderLeadWebKpHtml({
        companyName: cand.name,
        domain: cand.domain,
        platform: audit.cms,
        city: city.name,
        bodyText: generated.bodyText,
        screenshotUrl: screenshotUrl || null,
        leadId: siteId,
        batchDate,
        issues: audit.issues,
        publicOrigin,
        profile,
      });

      const db = getDbPool();
      await db.query(
        `UPDATE lead_radar_sites SET kp_html = ? WHERE id = ?`,
        [htmlFinal, siteId]
      );

      queued++;
      samples.push({
        name: cand.name,
        domain: cand.domain,
        platform: audit.cms,
        email: emailInfo.email,
        hotScore: audit.hotScore,
        screenshotUrl: screenshotUrl || null,
        screenshotPath: screenshotPath || null,
        kpSubject: subject || null,
        kpHtml: htmlFinal || null,
      });
    } catch (err: any) {
      skipped.push({
        domain: cand.domain,
        reason: err?.message || "enrich_error",
      });
    }
  }

  const finalCount = await countQueuedForDate(batchDate);
  await upsertBatchPlan({
    batchDate,
    queuedCount: finalCount,
    tokensTotal,
  });
  await rememberCityNiche(city.id, niche, verticalId);

  let telegram: { ok: boolean; error?: string; photosSent?: number } = { ok: true };
  if (!options?.skipTelegram && !options?.suppressTelegram) {
    const settings = await getAllSettings();
    const queuedRows = await listQueuedSites(batchDate);
    const digestSamples =
      queuedRows.length > 0
        ? queuedRows.map((s: any) => ({
            name: s.name,
            domain: s.domain,
            platform: s.platform,
            email: s.email,
            hotScore: s.hot_score ?? 0,
            screenshotUrl: s.screenshot_url || null,
            screenshotPath: s.screenshot_path || null,
            kpSubject: s.kp_subject || null,
            kpHtml: s.kp_html || null,
          }))
        : samples;
    telegram = await sendMorningDigest({
      botToken: settings.telegram_bot_token,
      chatId: settings.telegram_chat_id,
      batchDate,
      city: city.name,
      niche,
      vertical: verticalLabel,
      queuedCount: finalCount,
      limit,
      tokensTotal,
      samples: digestSamples,
      adminUrl: `${publicOrigin}/dashboard/secret-shopper`,
      publicOrigin,
    });
  }

  return {
    ok: true,
    batchDate,
    city: city.name,
    niche,
    vertical: verticalLabel,
    verticalId,
    pickReason: reason,
    radarId,
    serpRaw: serp.organic.length,
    candidates: candidates.length,
    queued: finalCount,
    skipped: skipped.slice(0, 50),
    tokensTotal,
    telegram,
    alreadyHad: already,
  };
}

/**
 * Мульти-раундовый сбор: крутит рулетку ниш, пока очередь не дойдёт до
 * min(queueLimit, remainingSendBudget) или пока раунды не исчерпаны.
 */
export async function runLeadRadarCollect(options?: {
  city?: string;
  niche?: string;
  vertical?: string;
  limit?: number;
  skipTelegram?: boolean;
  skipScreenshot?: boolean;
  dryRun?: boolean;
  maxRounds?: number;
  maxEnqueuePerRound?: number;
}): Promise<CollectRunResult> {
  const maxRounds = Math.min(
    12,
    Math.max(1, options?.maxRounds ?? COLLECT_MAX_ROUNDS_DEFAULT)
  );
  const perRound =
    typeof options?.maxEnqueuePerRound === "number"
      ? options.maxEnqueuePerRound
      : await getCollectPerTick();
  const roundResults: CollectRunResult["roundResults"] = [];
  let last: NightlyRunResult | null = null;
  let tokensTotal = 0;
  let emptyStreak = 0;
  let rounds = 0;

  for (let i = 0; i < maxRounds; i++) {
    const before = await resolveCollectTarget({ limit: options?.limit });
    if (before.need <= 0) break;

    rounds++;
    const roundOpts =
      i === 0
        ? options
        : {
            skipScreenshot: options?.skipScreenshot,
            dryRun: options?.dryRun,
            limit: options?.limit,
          };

    const result = await runNightlyLeadRadar({
      ...roundOpts,
      maxEnqueuePerRound: perRound,
      suppressTelegram: true,
      skipTelegram: true,
    });
    last = result;
    tokensTotal += result.tokensTotal || 0;

    const afterQueued = result.queued;
    const queuedDelta = Math.max(0, afterQueued - before.queued);
    roundResults.push({
      niche: result.niche,
      city: result.city,
      queuedDelta,
      serpRaw: result.serpRaw,
      candidates: result.candidates,
    });

    if (queuedDelta <= 0) {
      emptyStreak++;
      if (emptyStreak >= 2) break;
    } else {
      emptyStreak = 0;
    }
  }

  const finalBudget = await resolveCollectTarget({ limit: options?.limit });
  const batchDate = finalBudget.batchDate;
  const publicOrigin = process.env.NEXT_PUBLIC_BASE_URL || "https://konversus.ru";

  let telegram: { ok: boolean; error?: string; photosSent?: number } = { ok: true };
  if (!options?.skipTelegram) {
    const settings = await getAllSettings();
    const queuedRows = await listQueuedSites(batchDate);
    const digestSamples = queuedRows.map((s: any) => ({
      name: s.name,
      domain: s.domain,
      platform: s.platform,
      email: s.email,
      hotScore: s.hot_score ?? 0,
      screenshotUrl: s.screenshot_url || null,
      screenshotPath: s.screenshot_path || null,
      kpSubject: s.kp_subject || null,
      kpHtml: s.kp_html || null,
    }));
    const niches = [...new Set(roundResults.map((r) => r.niche).filter(Boolean))];
    telegram = await sendMorningDigest({
      botToken: settings.telegram_bot_token,
      chatId: settings.telegram_chat_id,
      batchDate,
      city: last?.city || niches[0] || "—",
      niche: niches.length ? niches.join(" · ") : last?.niche || "—",
      vertical: last?.vertical,
      queuedCount: finalBudget.queued,
      limit: finalBudget.target || finalBudget.queueLimit,
      tokensTotal,
      samples: digestSamples,
      adminUrl: `${publicOrigin}/dashboard/secret-shopper`,
      publicOrigin,
    });
  }

  return {
    ok: true,
    batchDate,
    city: last?.city || "",
    niche: last?.niche || "",
    vertical: last?.vertical,
    verticalId: last?.verticalId,
    pickReason: last?.pickReason || (rounds === 0 ? "idempotent" : "multi_round"),
    radarId: last?.radarId || "",
    serpRaw: roundResults.reduce((a, r) => a + r.serpRaw, 0),
    candidates: roundResults.reduce((a, r) => a + r.candidates, 0),
    queued: finalBudget.queued,
    skipped: last?.skipped || [],
    tokensTotal,
    telegram,
    alreadyHad: roundResults[0] ? undefined : finalBudget.queued,
    rounds,
    target: finalBudget.target,
    sentToday: finalBudget.sent,
    roundResults,
  };
}
