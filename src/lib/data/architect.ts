import "server-only";

import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2";

import { getDbPool } from "@/lib/db";
import type {
  ArchitectProject,
  ArchitectReport,
  ArchitectSnapshot,
  ProjectStatus,
  SourceType,
} from "@/lib/architect/types";

type Row = RowDataPacket & {
  id: string;
  url: string;
  source_type: SourceType;
  ip_hash: string;
  status: ProjectStatus;
  snapshot_json: string | null;
  result_json: string | null;
  model_used: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

function toProject(row: Row): ArchitectProject {
  return {
    ...row,
    snapshot_json: row.snapshot_json
      ? (JSON.parse(row.snapshot_json) as ArchitectSnapshot)
      : null,
    result_json: row.result_json
      ? (JSON.parse(row.result_json) as ArchitectReport)
      : null,
  };
}

export async function createArchitectProject(params: {
  url: string;
  source_type: SourceType;
  ip_hash: string;
}): Promise<string> {
  const db = getDbPool();
  const id = randomUUID();
  await db.query(
    "INSERT INTO architect_projects (id, url, source_type, ip_hash) VALUES (?, ?, ?, ?)",
    [id, params.url, params.source_type, params.ip_hash]
  );
  return id;
}

export async function getArchitectProject(
  id: string
): Promise<ArchitectProject | null> {
  const db = getDbPool();
  const [rows] = await db.query<Row[]>(
    "SELECT * FROM architect_projects WHERE id = ?",
    [id]
  );
  if (!rows.length) return null;
  return toProject(rows[0]);
}

export async function updateArchitectStatus(
  id: string,
  status: ProjectStatus
): Promise<void> {
  const db = getDbPool();
  await db.query(
    "UPDATE architect_projects SET status = ? WHERE id = ?",
    [status, id]
  );
}

export async function updateArchitectSnapshot(
  id: string,
  snapshot: ArchitectSnapshot
): Promise<void> {
  const db = getDbPool();
  await db.query(
    "UPDATE architect_projects SET snapshot_json = ?, status = 'analyzing' WHERE id = ?",
    [JSON.stringify(snapshot), id]
  );
}

export async function updateArchitectResult(
  id: string,
  result: ArchitectReport,
  model_used: string
): Promise<void> {
  const db = getDbPool();
  await db.query(
    "UPDATE architect_projects SET result_json = ?, model_used = ?, status = 'done' WHERE id = ?",
    [JSON.stringify(result), model_used, id]
  );
}

export async function markArchitectFailed(
  id: string,
  error: string
): Promise<void> {
  const db = getDbPool();
  await db.query(
    "UPDATE architect_projects SET status = 'failed', error_message = ? WHERE id = ?",
    [error.slice(0, 490), id]
  );
}

export async function countTodayProjectsByIp(
  ip_hash: string
): Promise<number> {
  const db = getDbPool();
  const [rows] = await db.query<(RowDataPacket & { cnt: number })[]>(
    "SELECT COUNT(*) AS cnt FROM architect_projects WHERE ip_hash = ? AND created_at >= NOW() - INTERVAL 24 HOUR",
    [ip_hash]
  );
  return rows[0]?.cnt ?? 0;
}

export async function listArchitectProjects(params?: {
  limit?: number;
  offset?: number;
}): Promise<ArchitectProject[]> {
  const db = getDbPool();
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  const [rows] = await db.query<Row[]>(
    "SELECT * FROM architect_projects ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [limit, offset]
  );
  return rows.map(toProject);
}

export async function countArchitectProjects(): Promise<number> {
  const db = getDbPool();
  const [rows] = await db.query<(RowDataPacket & { cnt: number })[]>(
    "SELECT COUNT(*) AS cnt FROM architect_projects"
  );
  return rows[0]?.cnt ?? 0;
}

export async function getArchitectStats(): Promise<{
  total: number;
  done: number;
  failed: number;
  today: number;
}> {
  const db = getDbPool();
  const [rows] = await db.query<(RowDataPacket & {
    total: number;
    done: number;
    failed: number;
    today: number;
  })[]>(
    `SELECT
      COUNT(*) AS total,
      SUM(status = 'done') AS done,
      SUM(status = 'failed') AS failed,
      SUM(DATE(created_at) = CURDATE()) AS today
    FROM architect_projects`
  );
  return {
    total: rows[0]?.total ?? 0,
    done: rows[0]?.done ?? 0,
    failed: rows[0]?.failed ?? 0,
    today: rows[0]?.today ?? 0,
  };
}

export async function deleteArchitectProject(id: string): Promise<void> {
  const db = getDbPool();
  await db.query("DELETE FROM architect_projects WHERE id = ?", [id]);
}

/**
 * Ищет последний завершённый анализ для данного URL за последние N часов.
 * Используется для дедупликации повторных запросов.
 */
export async function findRecentProjectByUrl(
  url: string,
  hoursBack = 24
): Promise<ArchitectProject | null> {
  const db = getDbPool();
  const [rows] = await db.query<Row[]>(
    `SELECT * FROM architect_projects
     WHERE url = ? AND status = 'done'
     AND created_at >= NOW() - INTERVAL ? HOUR
     ORDER BY created_at DESC LIMIT 1`,
    [url, hoursBack]
  );
  if (!rows.length) return null;
  return toProject(rows[0]);
}

/**
 * Считает количество анализов запущенных за последние N минут (со всех IP).
 * Используется как глобальный rate limit.
 */
export async function countGlobalRecentProjects(minutes = 1): Promise<number> {
  const db = getDbPool();
  const [rows] = await db.query<(RowDataPacket & { cnt: number })[]>(
    "SELECT COUNT(*) AS cnt FROM architect_projects WHERE created_at >= NOW() - INTERVAL ? MINUTE",
    [minutes]
  );
  return rows[0]?.cnt ?? 0;
}
