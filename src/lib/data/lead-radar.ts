import "server-only";
import { randomUUID } from "node:crypto";
import { getDbPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

// ─── Радары ──────────────────────────────────────────────────────────────

export async function listRadars(): Promise<any[]> {
  const db = getDbPool();
  const [rows] = await db.query("SELECT * FROM lead_radars WHERE active = 1 ORDER BY created_at DESC");
  return rows as any[];
}

export async function createRadar(params: { city: string; niche: string; filters: string[] }): Promise<string> {
  const db = getDbPool();
  const id = randomUUID();
  await db.query(
    "INSERT INTO lead_radars (id, city, niche, filters) VALUES (?, ?, ?, ?)",
    [id, params.city, params.niche, JSON.stringify(params.filters)]
  );
  return id;
}

export async function updateRadarLastCheck(id: string, leadCount: number): Promise<void> {
  const db = getDbPool();
  await db.query(
    "UPDATE lead_radars SET last_check_at = NOW(), lead_count = ? WHERE id = ?",
    [leadCount, id]
  );
}

export async function deleteRadar(id: string): Promise<void> {
  const db = getDbPool();
  await db.query("DELETE FROM lead_radars WHERE id = ?", [id]);
}

// ─── Сайты ───────────────────────────────────────────────────────────────

export type LeadSiteInput = {
  domain: string;
  name: string;
  url: string;
  ssl_status?: string;
  ssl_days?: number;
  ssl_grade?: string;
  score?: number;
  phone?: string;
  email?: string;
  problems?: string[];
  h1_text?: string | null;
  platform?: string | null;
  source?: "serp" | "maps" | "manual";
  serp_query?: string | null;
  serp_position?: number | null;
  privacy_issues?: string[];
  screenshot_path?: string | null;
  screenshot_url?: string | null;
  email_source_url?: string | null;
  hot_score?: number;
  status?: string;
  reject_reason?: string | null;
};

export async function saveRadarSites(radarId: string, sites: LeadSiteInput[]): Promise<number> {
  const db = getDbPool();
  let count = 0;

  for (const site of sites) {
    try {
      const id = randomUUID();
      await db.query(
        `INSERT INTO lead_radar_sites (
           id, radar_id, domain, name, url, ssl_status, ssl_days, ssl_grade, score,
           phone, email, platform, source, serp_query, serp_position,
           problems, privacy_issues, screenshot_path, screenshot_url, screenshot_at,
           email_source_url, hot_score, status, reject_reason, h1_text
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, radarId, site.domain, site.name, site.url,
          site.ssl_status || "unknown", site.ssl_days || null, site.ssl_grade || null,
          site.score || 0, site.phone || null, site.email || null,
          site.platform || null, site.source || "maps", site.serp_query || null, site.serp_position ?? null,
          JSON.stringify(site.problems || []),
          site.privacy_issues ? JSON.stringify(site.privacy_issues) : null,
          site.screenshot_path || null, site.screenshot_url || null,
          site.screenshot_url ? new Date() : null,
          site.email_source_url || null, site.hot_score ?? 0,
          site.status || "new", site.reject_reason || null, site.h1_text || null,
        ]
      );
      count++;
    } catch {
      /* duplicate / bad row — skip */
    }
  }

  return count;
}

export async function listRadarSites(radarId: string): Promise<any[]> {
  const db = getDbPool();
  const [rows] = await db.query(
    "SELECT * FROM lead_radar_sites WHERE radar_id = ? ORDER BY score ASC, found_at DESC",
    [radarId]
  );
  return rows as any[];
}

export async function updateSiteStatus(id: string, status: string): Promise<void> {
  const db = getDbPool();
  if (status === "queued") {
    await db.query(
      "UPDATE lead_radar_sites SET status = ?, queued_at = NOW(), batch_date = CURDATE() WHERE id = ?",
      [status, id]
    );
    return;
  }
  await db.query("UPDATE lead_radar_sites SET status = ? WHERE id = ?", [status, id]);
}

export async function getSiteById(id: string): Promise<any | null> {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT s.*, r.city AS radar_city, r.niche AS radar_niche
     FROM lead_radar_sites s
     LEFT JOIN lead_radars r ON r.id = s.radar_id
     WHERE s.id = ?
     LIMIT 1`,
    [id]
  );
  return (rows as any[])[0] || null;
}

function clipRejectReason(reason: string): string {
  return reason.replace(/\s+/g, " ").trim().slice(0, 250);
}

/** Готовые к отправке письма любой даты: новее сверху. */
export async function listSendableQueued(): Promise<any[]> {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT s.*, r.city AS radar_city, r.niche AS radar_niche
     FROM lead_radar_sites s
     LEFT JOIN lead_radars r ON r.id = s.radar_id
     WHERE s.status = 'queued'
       AND s.email IS NOT NULL AND TRIM(s.email) <> ''
       AND s.kp_html IS NOT NULL AND TRIM(s.kp_html) <> ''
       AND s.kp_subject IS NOT NULL AND TRIM(s.kp_subject) <> ''
     ORDER BY s.batch_date DESC, s.hot_score DESC, s.queued_at ASC`
  );
  return rows as any[];
}

export async function countSendableQueued(): Promise<number> {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT COUNT(*) AS c FROM lead_radar_sites
     WHERE status = 'queued'
       AND email IS NOT NULL AND TRIM(email) <> ''
       AND kp_html IS NOT NULL AND TRIM(kp_html) <> ''
       AND kp_subject IS NOT NULL AND TRIM(kp_subject) <> ''`
  );
  return Number((rows as RowDataPacket[])[0]?.c ?? 0);
}

/** Переносит queued-лид в пачку дня, чтобы sent считался в бюджете сегодня. */
export async function moveQueuedToBatch(siteId: string, batchDate: string): Promise<void> {
  const db = getDbPool();
  await db.query(
    `UPDATE lead_radar_sites SET batch_date = ? WHERE id = ? AND status = 'queued'`,
    [batchDate, siteId]
  );
}

export async function skipQueuedIds(ids: string[], reason: string): Promise<void> {
  if (!ids.length) return;
  const db = getDbPool();
  const placeholders = ids.map(() => "?").join(",");
  await db.query(
    `UPDATE lead_radar_sites
     SET status = 'skipped', reject_reason = ?
     WHERE status = 'queued' AND id IN (${placeholders})`,
    [clipRejectReason(reason), ...ids]
  );
}

/** Жёсткий отказ SMTP: этот лид и другие queued на тот же email. */
export async function markLeadBounced(siteId: string, reason: string): Promise<void> {
  const db = getDbPool();
  const site = await getSiteById(siteId);
  const clipped = clipRejectReason(reason);
  await db.query(
    `UPDATE lead_radar_sites SET status = 'bounced', reject_reason = ?, follow_up_at = NULL WHERE id = ?`,
    [clipped, siteId]
  );
  const email = String(site?.email || "").trim();
  if (!email) return;
  await db.query(
    `UPDATE lead_radar_sites
     SET status = 'bounced', reject_reason = ?
     WHERE status = 'queued' AND LOWER(email) = LOWER(?)`,
    [clipped, email]
  );
}

/** Очередь «К отправке» за сегодня (или указанную дату). */
export async function listQueuedSites(batchDate?: string): Promise<any[]> {
  const db = getDbPool();
  const date = batchDate || null;
  const [rows] = await db.query(
    `SELECT s.*, r.city AS radar_city, r.niche AS radar_niche
     FROM lead_radar_sites s
     LEFT JOIN lead_radars r ON r.id = s.radar_id
     WHERE s.status = 'queued'
       AND s.batch_date = COALESCE(?, CURDATE())
     ORDER BY s.hot_score DESC, s.queued_at ASC`,
    [date]
  );
  return rows as any[];
}

/** +1 к счётчику пачки дня. */
export async function bumpBatchCounter(
  batchDate: string,
  field: "sent_count" | "skipped_count" | "replied_count" | "call_click_count"
): Promise<void> {
  const db = getDbPool();
  const existing = await getBatchByDate(batchDate);
  if (!existing) {
    await upsertBatchPlan({ batchDate, queuedCount: 0 });
  }
  const allowed = [
    "sent_count",
    "skipped_count",
    "replied_count",
    "call_click_count",
  ] as const;
  if (!(allowed as readonly string[]).includes(field)) return;
  await db.query(
    `UPDATE lead_radar_batches SET ${field} = ${field} + 1 WHERE batch_date = ?`,
    [batchDate]
  );
}

export async function countQueuedForDate(batchDate?: string): Promise<number> {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT COUNT(*) AS c FROM lead_radar_sites
     WHERE status = 'queued' AND batch_date = COALESCE(?, CURDATE())`,
    [batchDate || null]
  );
  return Number((rows as RowDataPacket[])[0]?.c ?? 0);
}

export async function upsertBatchPlan(params: {
  batchDate: string;
  queuedCount: number;
  tokensTotal?: number;
}): Promise<string> {
  const db = getDbPool();
  const [existing] = await db.query(
    "SELECT id FROM lead_radar_batches WHERE batch_date = ? LIMIT 1",
    [params.batchDate]
  );
  const rows = existing as RowDataPacket[];
  if (rows[0]?.id) {
    await db.query(
      `UPDATE lead_radar_batches
       SET queued_count = ?, tokens_total = GREATEST(tokens_total, ?)
       WHERE id = ?`,
      [params.queuedCount, params.tokensTotal ?? 0, rows[0].id]
    );
    return String(rows[0].id);
  }
  const id = randomUUID();
  await db.query(
    `INSERT INTO lead_radar_batches (id, batch_date, queued_count, tokens_total)
     VALUES (?, ?, ?, ?)`,
    [id, params.batchDate, params.queuedCount, params.tokensTotal ?? 0]
  );
  return id;
}

export async function updateBatchFacts(params: {
  batchDate: string;
  sentCount: number;
  skippedCount: number;
  openedCount: number;
  repliedCount: number;
  bounceCount: number;
  tokensTotal?: number;
  markReportSent?: boolean;
}): Promise<void> {
  const db = getDbPool();
  await db.query(
    `UPDATE lead_radar_batches SET
       sent_count = ?,
       skipped_count = ?,
       opened_count = ?,
       replied_count = ?,
       bounce_count = ?,
       tokens_total = COALESCE(?, tokens_total),
       report_sent_at = IF(?, NOW(), report_sent_at)
     WHERE batch_date = ?`,
    [
      params.sentCount,
      params.skippedCount,
      params.openedCount,
      params.repliedCount,
      params.bounceCount,
      params.tokensTotal ?? null,
      params.markReportSent ? 1 : 0,
      params.batchDate,
    ]
  );
}

export async function getBatchByDate(batchDate: string): Promise<any | null> {
  const db = getDbPool();
  const [rows] = await db.query(
    "SELECT * FROM lead_radar_batches WHERE batch_date = ? LIMIT 1",
    [batchDate]
  );
  return (rows as any[])[0] || null;
}

/** История пачек (новые сверху). */
export async function listBatches(limit = 30): Promise<any[]> {
  const db = getDbPool();
  const safeLimit = Math.min(Math.max(1, limit), 90);
  const [rows] = await db.query(
    `SELECT * FROM lead_radar_batches
     ORDER BY batch_date DESC
     LIMIT ${safeLimit}`
  );
  return rows as any[];
}

/** Сумма токенов по пачкам (для шапки дашборда). */
export async function sumBatchTokens(): Promise<number> {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(tokens_total), 0) AS t FROM lead_radar_batches`
  );
  return Number((rows as RowDataPacket[])[0]?.t ?? 0);
}

export async function updateSiteKp(params: {
  siteId: string;
  kpHtml: string;
  kpSubject: string;
  tokensIn?: number;
  tokensOut?: number;
}): Promise<void> {
  const db = getDbPool();
  await db.query(
    `UPDATE lead_radar_sites
     SET kp_html = ?, kp_subject = ?, kp_tokens_in = ?, kp_tokens_out = ?
     WHERE id = ?`,
    [
      params.kpHtml,
      params.kpSubject,
      params.tokensIn ?? null,
      params.tokensOut ?? null,
      params.siteId,
    ]
  );
}

export async function updateSiteScreenshot(params: {
  siteId: string;
  path: string;
  url: string;
}): Promise<void> {
  const db = getDbPool();
  await db.query(
    `UPDATE lead_radar_sites
     SET screenshot_path = ?, screenshot_url = ?, screenshot_at = NOW()
     WHERE id = ?`,
    [params.path, params.url, params.siteId]
  );
}


// ─── Email log ─────────────────────────────────────────────────────────────

export async function logEmail(params: {
  siteId?: string; radarId?: string; toEmail: string;
  subject: string; messageId?: string; status?: string;
}): Promise<void> {
  const db = getDbPool();
  const id = randomUUID();
  await db.query(
    `INSERT INTO lead_emails (id, site_id, radar_id, to_email, subject, message_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, params.siteId || null, params.radarId || null,
     params.toEmail, params.subject, params.messageId || null,
     params.status || "sent"]
  );
}

export async function listEmails(siteId: string): Promise<any[]> {
  const db = getDbPool();
  const [rows] = await db.query(
    "SELECT * FROM lead_emails WHERE site_id = ? ORDER BY sent_at DESC",
    [siteId]
  );
  return rows as any[];
}


// ─── Follow-ups ────────────────────────────────────────────────────────────

export async function createFollowUp(params: {
  siteId: string;
  type?: string;
  /** 1 — первое письмо, 2 и 3 — повтор в ту же переписку. */
  touchNo?: number;
  messageId?: string | null;
}): Promise<string> {
  const db = getDbPool();
  const id = randomUUID();
  const touchNo = params.touchNo ?? 1;
  await db.query(
    `INSERT INTO lead_follow_ups (id, site_id, type, touch_no, message_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      params.siteId,
      params.type || "email",
      touchNo,
      params.messageId || null,
    ]
  );
  if (touchNo <= 1) {
    // Цепочка только у писем с Message-ID. Старый путь без него не будит старые карточки.
    const followAt = params.messageId
      ? "DATE_ADD(NOW(), INTERVAL 4 DAY)"
      : "DATE_ADD(NOW(), INTERVAL 3 DAY)";
    await db.query(
      `UPDATE lead_radar_sites SET contacted_at = NOW(), follow_up_at = ${followAt} WHERE id = ?`,
      [params.siteId]
    );
  } else if (touchNo === 2) {
    await db.query(
      `UPDATE lead_radar_sites
       SET follow_up_at = GREATEST(
         DATE_ADD(COALESCE((
           SELECT sent_at FROM (
             SELECT sent_at FROM lead_follow_ups
             WHERE site_id = ? AND touch_no = 1
             ORDER BY sent_at ASC LIMIT 1
           ) AS first_touch
         ), NOW()), INTERVAL 10 DAY),
         DATE_ADD(NOW(), INTERVAL 4 DAY)
       )
       WHERE id = ?`,
      [params.siteId, params.siteId]
    );
  } else {
    await db.query(
      "UPDATE lead_radar_sites SET follow_up_at = NULL WHERE id = ?",
      [params.siteId]
    );
  }
  return id;
}

/** Занять карточку, чтобы два тика не отправили одно и то же касание. */
export async function claimDueFollowUp(siteId: string): Promise<boolean> {
  const db = getDbPool();
  const [result] = await db.query(
    `UPDATE lead_radar_sites
     SET follow_up_at = DATE_ADD(NOW(), INTERVAL 2 HOUR)
     WHERE id = ?
       AND status = 'contacted'
       AND follow_up_at IS NOT NULL
       AND follow_up_at <= NOW()`,
    [siteId]
  );
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) === 1;
}

/** Вернуть карточку в очередь касаний после сбоя отправки. */
export async function releaseFollowUpClaim(siteId: string): Promise<void> {
  const db = getDbPool();
  await db.query(
    `UPDATE lead_radar_sites
     SET follow_up_at = NOW()
     WHERE id = ? AND status = 'contacted'`,
    [siteId]
  );
}

export async function getFollowUpStats(): Promise<{
  sent: number; opened: number; replied: number; won: number;
}> {
  const db = getDbPool();
  const [[{sent}]] = await db.query("SELECT COUNT(*) as sent FROM lead_follow_ups") as any;
  const [[{opened}]] = await db.query("SELECT COUNT(*) as opened FROM lead_follow_ups WHERE opened_at IS NOT NULL") as any;
  const [[{replied}]] = await db.query("SELECT COUNT(*) as replied FROM lead_follow_ups WHERE replied_at IS NOT NULL") as any;
  const [[{won}]] = await db.query("SELECT COUNT(*) as won FROM lead_radar_sites WHERE status = 'won'") as any;
  return { sent, opened, replied, won };
}

export async function getOverdueFollowUps(): Promise<any[]> {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT s.*, f.sent_at as follow_sent, f.id as follow_id
     FROM lead_radar_sites s
     JOIN lead_follow_ups f ON f.site_id = s.id
     WHERE s.follow_up_at IS NOT NULL
       AND s.follow_up_at <= NOW()
       AND s.status != 'won'
       AND s.status != 'lost'
     ORDER BY s.follow_up_at ASC`
  );
  return rows as any[];
}

export async function markReplied(siteId: string): Promise<void> {
  const db = getDbPool();
  await db.query(
    "UPDATE lead_radar_sites SET status = 'replied', replied_at = NOW(), follow_up_at = NULL WHERE id = ?",
    [siteId]
  );
  await db.query("UPDATE lead_follow_ups SET replied_at = NOW() WHERE site_id = ? ORDER BY sent_at DESC LIMIT 1", [siteId]);
}

/** Первый клик «Позвонить» из письма. Возвращает true, если клик новый. */
export async function markCallClicked(siteId: string): Promise<boolean> {
  const db = getDbPool();
  const [result] = await db.query(
    `UPDATE lead_radar_sites
     SET call_clicked_at = NOW()
     WHERE id = ? AND call_clicked_at IS NULL`,
    [siteId]
  );
  const affected = Number((result as { affectedRows?: number }).affectedRows ?? 0);
  return affected > 0;
}

export async function listAllSites(): Promise<any[]> { const db = getDbPool(); const [rows] = await db.query('SELECT s.*, f.opened_at FROM lead_radar_sites s LEFT JOIN lead_follow_ups f ON f.site_id = s.id AND f.opened_at IS NOT NULL WHERE (s.status != ? OR s.contacted_at IS NOT NULL) ORDER BY s.contacted_at DESC, s.found_at DESC LIMIT 100', ['new']); return rows as any[]; }

export async function deleteSite(id: string): Promise<void> {
  const db = getDbPool();
  await db.query("DELETE FROM lead_radar_sites WHERE id = ?", [id]);
}

export async function deleteRadarSites(radarId: string): Promise<void> {
  const db = getDbPool();
  await db.query("DELETE FROM lead_radar_sites WHERE radar_id = ?", [radarId]);
}
