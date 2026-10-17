import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { RowDataPacket } from "mysql2";

import { getDbPool } from "@/lib/db";
import { dayList, type AdsDay, type AdsPayload, type AdsSource } from "@/lib/seo-positions/ads-summary";

export const ADS_FLASH_COOKIE = "seo_ads_flash";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Новый ключ скрипта. Старый перестаёт работать. В базе только хеш — показать ключ ещё раз нельзя. */
export async function createAdsToken(projectId: string, source: AdsSource): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await getDbPool().execute(
    `insert into seo_ads_links (project_id, source, token_hash, created_at) values (?, ?, ?, now(3))
     on duplicate key update token_hash = values(token_hash), created_at = now(3)`,
    [projectId, source, sha256(token)]
  );
  return token;
}

export async function findAdsToken(token: string): Promise<{ projectId: string; source: AdsSource } | null> {
  if (!token || token.length > 100) return null;
  const [rows] = await getDbPool().query<RowDataPacket[]>("select project_id, source from seo_ads_links where token_hash = ?", [sha256(token)]);
  const r = rows[0];
  return r ? { projectId: r.project_id as string, source: r.source as AdsSource } : null;
}

/** Выгрузка заменяет данные источника за свой период целиком: удалённые кампании и исправленные конверсии не задваиваются. */
export async function ingestAds(projectId: string, source: AdsSource, p: AdsPayload) {
  const conn = await getDbPool().getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("delete from seo_ads_daily where project_id = ? and source = ? and day between ? and ?", [projectId, source, p.from, p.to]);
    for (let i = 0; i < p.rows.length; i += 500) {
      const chunk = p.rows.slice(i, i + 500);
      await conn.query(
        `insert into seo_ads_daily (project_id, source, day, campaign_id, campaign_name, impressions, clicks, cost, conversions, hours) values ?
         on duplicate key update impressions = impressions + values(impressions), clicks = clicks + values(clicks),
           cost = cost + values(cost), conversions = conversions + values(conversions)`,
        [chunk.map((r) => [projectId, source, r.day, r.campaignId, r.campaignName, r.impressions, r.clicks, r.cost, r.conversions, r.hours.join(",") || null])]
      );
    }
    await conn.query("insert ignore into seo_ads_coverage (project_id, source, day) values ?", [
      dayList(p.from, p.to).map((d) => [projectId, source, d]),
    ]);
    await conn.execute("update seo_ads_links set synced_at = now(3), account_name = ?, currency = ? where project_id = ? and source = ?", [
      p.accountName,
      p.currency,
      projectId,
      source,
    ]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export type AdsLink = { source: AdsSource; createdAt: Date; syncedAt: Date | null; accountName: string | null; currency: string | null };

export async function listAdsLinks(projectId: string): Promise<AdsLink[]> {
  const [rows] = await getDbPool().query<RowDataPacket[]>(
    "select source, created_at, synced_at, account_name, currency from seo_ads_links where project_id = ? order by source",
    [projectId]
  );
  return rows.map((r) => ({
    source: r.source as AdsSource,
    createdAt: r.created_at as Date,
    syncedAt: (r.synced_at as Date | null) ?? null,
    accountName: (r.account_name as string | null) ?? null,
    currency: (r.currency as string | null) ?? null,
  }));
}

export type AdsData = { links: AdsLink[]; covered: Set<string>; rows: AdsDay[] };

const ymd = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));

/** Данные за период. covered — дни, за которые выгрузку прислали все источники, уже приславшие хоть что-то. */
export async function loadAdsData(projectId: string, from: string, to: string): Promise<AdsData> {
  const pool = getDbPool();
  const [links, [cov], [rows]] = await Promise.all([
    listAdsLinks(projectId),
    pool.query<RowDataPacket[]>(
      "select source, date_format(day, '%Y-%m-%d') as day from seo_ads_coverage where project_id = ? and day between ? and ?",
      [projectId, from, to]
    ),
    pool.query<RowDataPacket[]>(
      `select source, date_format(day, '%Y-%m-%d') as day, campaign_id, campaign_name, impressions, clicks, cost, conversions, hours
       from seo_ads_daily where project_id = ? and day between ? and ?`,
      [projectId, from, to]
    ),
  ]);
  const synced = links.filter((l) => l.syncedAt).map((l) => l.source);
  const bySource = new Map<string, Set<string>>();
  for (const r of cov) bySource.set(r.source, (bySource.get(r.source) ?? new Set()).add(ymd(r.day)));
  const covered = new Set(
    [...(bySource.get(synced[0]) ?? [])].filter((d) => synced.every((s) => bySource.get(s)?.has(d)))
  );
  return {
    links,
    covered,
    rows: rows.map((r) => ({
      source: r.source as AdsSource,
      day: ymd(r.day),
      campaignId: r.campaign_id as string,
      campaignName: r.campaign_name as string,
      impressions: Number(r.impressions),
      clicks: Number(r.clicks),
      cost: Number(r.cost),
      conversions: Number(r.conversions),
      hours: r.hours ? String(r.hours).split(",").map(Number) : [],
    })),
  };
}
