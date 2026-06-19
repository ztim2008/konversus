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

export async function saveRadarSites(radarId: string, sites: Array<{
  domain: string; name: string; url: string;
  ssl_status?: string; ssl_days?: number; ssl_grade?: string;
  score?: number; phone?: string; email?: string; problems?: string[]; h1_text?: string | null;
}>): Promise<number> {
  const db = getDbPool();
  let count = 0;

  for (const site of sites) {
    try {
      const id = randomUUID();
      await db.query(
        `INSERT INTO lead_radar_sites (id, radar_id, domain, name, url, ssl_status, ssl_days, ssl_grade, score, phone, email, problems, h1_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, radarId, site.domain, site.name, site.url,
         site.ssl_status || "unknown", site.ssl_days || null, site.ssl_grade || null,
         site.score || 0, site.phone || null, site.email || null,
         JSON.stringify(site.problems || []), site.h1_text || null]
      );
      count++;
    } catch {}
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
  await db.query("UPDATE lead_radar_sites SET status = ? WHERE id = ?", [status, id]);
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
  siteId: string; type?: string;
}): Promise<string> {
  const db = getDbPool();
  const id = randomUUID();
  await db.query(
    "INSERT INTO lead_follow_ups (id, site_id, type) VALUES (?, ?, ?)",
    [id, params.siteId, params.type || "email"]
  );
  await db.query(
    "UPDATE lead_radar_sites SET contacted_at = NOW(), follow_up_at = DATE_ADD(NOW(), INTERVAL 3 DAY) WHERE id = ?",
    [params.siteId]
  );
  return id;
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
  await db.query("UPDATE lead_radar_sites SET status = 'replied', replied_at = NOW() WHERE id = ?", [siteId]);
  await db.query("UPDATE lead_follow_ups SET replied_at = NOW() WHERE site_id = ? ORDER BY sent_at DESC LIMIT 1", [siteId]);
}

export async function listAllSites(): Promise<any[]> { const db = getDbPool(); const [rows] = await db.query('SELECT s.*, f.opened_at FROM lead_radar_sites s LEFT JOIN lead_follow_ups f ON f.site_id = s.id AND f.opened_at IS NOT NULL WHERE s.status != ? ORDER BY s.contacted_at DESC LIMIT 100', ['new']); return rows as any[]; }

export async function deleteSite(id: string): Promise<void> {
  const db = getDbPool();
  await db.query("DELETE FROM lead_radar_sites WHERE id = ?", [id]);
}

export async function deleteRadarSites(radarId: string): Promise<void> {
  const db = getDbPool();
  await db.query("DELETE FROM lead_radar_sites WHERE radar_id = ?", [radarId]);
}
