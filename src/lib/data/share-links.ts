import "server-only";

import { randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getDbPool } from "@/lib/db";
import type { ShareLink } from "@/types/domain";

type ShareLinkRow = RowDataPacket & {
  id: string;
  proposal_id: string;
  token: string;
  slug: string | null;
  status: ShareLink["status"];
  expires_at: string | null;
  view_count: number;
  unique_view_count: number;
  mobile_view_count: number;
  desktop_view_count: number;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapShareLink(row: ShareLinkRow): ShareLink {
  return {
    id: row.id,
    proposalId: row.proposal_id,
    token: row.token,
    slug: row.slug,
    status: row.status,
    expiresAt: row.expires_at,
    viewCount: row.view_count,
    uniqueViewCount: row.unique_view_count ?? 0,
    mobileViewCount: row.mobile_view_count ?? 0,
    desktopViewCount: row.desktop_view_count ?? 0,
    lastOpenedAt: row.last_opened_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const transliterationMap: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function slugify(value: string) {
  const transliterated = value
    .toLowerCase()
    .split("")
    .map((char) => transliterationMap[char] ?? char)
    .join("");

  const slug = transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "proposal";
}

function createShareSlug(companyName: string, proposalTitle: string) {
  const base = `${slugify(companyName)}-${slugify(proposalTitle)}`;
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);

  return `${base}-${suffix}`;
}

export function getSharePath(shareLink: ShareLink) {
  return `/share/${shareLink.slug ?? shareLink.token}`;
}

export async function getShareLinkForProposal(proposalId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<ShareLinkRow[]>(
    "select id, proposal_id, token, slug, status, expires_at, view_count, unique_view_count, mobile_view_count, desktop_view_count, last_opened_at, created_at, updated_at from share_links where proposal_id = ? order by created_at desc limit 1",
    [proposalId],
  );

  return rows[0] ? mapShareLink(rows[0]) : null;
}

export async function getShareLinkBySlugOrToken(slugOrToken: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<ShareLinkRow[]>(
    "select id, proposal_id, token, slug, status, expires_at, view_count, unique_view_count, mobile_view_count, desktop_view_count, last_opened_at, created_at, updated_at from share_links where slug = ? or token = ? limit 1",
    [slugOrToken, slugOrToken],
  );

  return rows[0] ? mapShareLink(rows[0]) : null;
}

export async function publishShareLink(proposalId: string, companyName: string, proposalTitle: string) {
  const pool = getDbPool();
  const existing = await getShareLinkForProposal(proposalId);

  if (existing) {
    await pool.execute<ResultSetHeader>(
      "update share_links set status = 'active' where id = ?",
      [existing.id],
    );

    const refreshed = await getShareLinkForProposal(proposalId);

    if (!refreshed) {
      throw new Error("Не удалось получить опубликованную ссылку.");
    }

    return refreshed;
  }

  const id = randomUUID();
  const token = randomUUID().replace(/-/g, "");
  const slug = createShareSlug(companyName, proposalTitle);

  await pool.execute<ResultSetHeader>(
    "insert into share_links (id, proposal_id, token, slug, status) values (?, ?, ?, ?, 'active')",
    [id, proposalId, token, slug],
  );

  const created = await getShareLinkForProposal(proposalId);

  if (!created) {
    throw new Error("Не удалось создать share-link.");
  }

  return created;
}

function detectDevice(userAgent: string): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|opera mini|windows phone/.test(ua)) return "mobile";
  if (/mozilla|chrome|safari|firefox|edge|msie|trident/.test(ua)) return "desktop";
  return "unknown";
}

export async function incrementShareLinkView(shareLinkId: string, ipHash?: string, userAgent?: string) {
  const pool = getDbPool();

  // Всегда увеличиваем общий счётчик + время
  await pool.execute<ResultSetHeader>(
    "update share_links set view_count = view_count + 1, last_opened_at = now() where id = ?",
    [shareLinkId],
  );

  const deviceType = detectDevice(userAgent ?? "");

  // Логируем каждый визит с таймстемпом
  if (ipHash) {
    await pool.execute<ResultSetHeader>(
      "insert into share_link_view_events (share_link_id, ip_hash, device_type, user_agent) values (?, ?, ?, ?)",
      [shareLinkId, ipHash, deviceType, (userAgent ?? "").slice(0, 512)],
    );

    // Уникальный просмотр — только если IP ещё не видел эту ссылку
    const [result] = await pool.execute<ResultSetHeader>(
      "insert ignore into share_link_views (share_link_id, ip_hash, device_type) values (?, ?, ?)",
      [shareLinkId, ipHash, deviceType],
    );
    if (result.affectedRows > 0) {
      const mobileInc = deviceType === "mobile" || deviceType === "tablet" ? 1 : 0;
      const desktopInc = deviceType === "desktop" ? 1 : 0;
      await pool.execute<ResultSetHeader>(
        "update share_links set unique_view_count = unique_view_count + 1, mobile_view_count = mobile_view_count + ?, desktop_view_count = desktop_view_count + ? where id = ?",
        [mobileInc, desktopInc, shareLinkId],
      );
    }
  }
}

export async function getShareLinksForProposals(proposalIds: string[]): Promise<Record<string, ShareLink>> {
  if (proposalIds.length === 0) return {};
  const pool = getDbPool();
  const placeholders = proposalIds.map(() => "?").join(", ");
  const [rows] = await pool.query<ShareLinkRow[]>(
    `SELECT sl.id, sl.proposal_id, sl.token, sl.slug, sl.status, sl.expires_at, sl.view_count, sl.unique_view_count, sl.mobile_view_count, sl.desktop_view_count, sl.last_opened_at, sl.created_at, sl.updated_at
     FROM share_links sl
     INNER JOIN (
       SELECT proposal_id, MAX(created_at) AS max_created_at
       FROM share_links
       WHERE proposal_id IN (${placeholders})
       GROUP BY proposal_id
     ) latest ON sl.proposal_id = latest.proposal_id AND sl.created_at = latest.max_created_at`,
    proposalIds,
  );

  const result: Record<string, ShareLink> = {};
  for (const row of rows) {
    result[row.proposal_id] = mapShareLink(row);
  }
  return result;
}

// ── История визитов по proposal_id ────────────────────────────────────────────

export type ViewEvent = {
  shareLinkId: string;
  proposalId: string;
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  viewedAt: string; // ISO string
};

type ViewEventRow = RowDataPacket & {
  share_link_id: string;
  proposal_id: string;
  device_type: "mobile" | "tablet" | "desktop" | "unknown";
  viewed_at: Date;
};

/** Последние N визитов по набору proposalId, сгруппированных по proposal */
export async function getViewEventsForProposals(
  proposalIds: string[],
  limitPerProposal = 20,
): Promise<Record<string, ViewEvent[]>> {
  if (proposalIds.length === 0) return {};
  const pool = getDbPool();
  const placeholders = proposalIds.map(() => "?").join(", ");
  const [rows] = await pool.query<ViewEventRow[]>(
    `SELECT share_link_id, proposal_id, device_type, viewed_at
     FROM (
       SELECT e.share_link_id, sl.proposal_id, e.device_type, e.viewed_at,
              ROW_NUMBER() OVER (PARTITION BY sl.proposal_id ORDER BY e.viewed_at DESC) AS rn
       FROM share_link_view_events e
       JOIN share_links sl ON sl.id = e.share_link_id
       WHERE sl.proposal_id IN (${placeholders})
     ) ranked
     WHERE rn <= ?`,
    [...proposalIds, limitPerProposal],
  );

  const result: Record<string, ViewEvent[]> = {};
  for (const row of rows) {
    const pid = row.proposal_id;
    if (!result[pid]) result[pid] = [];
    result[pid].push({
      shareLinkId: row.share_link_id,
      proposalId: pid,
      deviceType: row.device_type,
      viewedAt: row.viewed_at instanceof Date ? row.viewed_at.toISOString() : String(row.viewed_at),
    });
  }
  return result;
}