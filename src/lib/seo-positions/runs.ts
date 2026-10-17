import "server-only";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { after } from "next/server";

import { getDbPool } from "@/lib/db";

export type RunKind = "checklist" | "pages" | "crawl";

export type RunState = {
  status: "running" | "done" | "error";
  month: string;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
};

const STALE_MINUTES = 10;

export class UserFacingError extends Error {}

/** Занимает слот проверки. false — такая проверка по проекту уже идёт. */
async function claimRun(projectId: string, kind: RunKind, month: string): Promise<boolean> {
  const pool = getDbPool();
  const [ins] = await pool.execute<ResultSetHeader>(
    `insert ignore into seo_audit_runs (project_id, kind, month, status, started_at) values (?, ?, ?, 'running', now(3))`,
    [projectId, kind, month]
  );
  if (ins.affectedRows === 1) return true;
  const [upd] = await pool.execute<ResultSetHeader>(
    `update seo_audit_runs set month = ?, status = 'running', started_at = now(3), finished_at = null, error_text = null
     where project_id = ? and kind = ? and (status <> 'running' or started_at < now(3) - interval ${STALE_MINUTES} minute)`,
    [month, projectId, kind]
  );
  return upd.affectedRows === 1;
}

async function finishRun(projectId: string, kind: RunKind, error: string | null) {
  await getDbPool().execute(
    `update seo_audit_runs set status = ?, finished_at = now(3), error_text = ? where project_id = ? and kind = ?`,
    [error ? "error" : "done", error ? error.slice(0, 300) : null, projectId, kind]
  );
}

/** Запускает работу после ответа. Сообщение ошибки показывается пользователю, поэтому задача сама решает, что в нём писать. */
export async function startBackgroundRun(projectId: string, kind: RunKind, month: string, job: () => Promise<void>): Promise<boolean> {
  if (!(await claimRun(projectId, kind, month))) return false;
  after(async () => {
    try {
      await job();
      await finishRun(projectId, kind, null);
    } catch (err) {
      console.error(`[seo-positions] ${kind} run failed`, err);
      await finishRun(projectId, kind, err instanceof UserFacingError ? err.message : "Проверка не удалась").catch(() => undefined);
    }
  });
  return true;
}

type RunRow = RowDataPacket & {
  kind: RunKind;
  month: string;
  status: string;
  started_at: Date;
  finished_at: Date | null;
  error_text: string | null;
};

export async function getRuns(projectId: string): Promise<Partial<Record<RunKind, RunState>>> {
  const [rows] = await getDbPool().query<RunRow[]>(
    `select kind, month, status, started_at, finished_at, error_text,
       (status = 'running' and started_at < now(3) - interval ${STALE_MINUTES} minute) as stale
     from seo_audit_runs where project_id = ?`,
    [projectId]
  );
  const out: Partial<Record<RunKind, RunState>> = {};
  for (const r of rows) {
    const stale = Number((r as RowDataPacket).stale) === 1;
    out[r.kind] = {
      status: stale ? "error" : r.status === "running" ? "running" : r.status === "error" ? "error" : "done",
      month: r.month,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      error: stale ? "Проверка прервалась, запустите ещё раз" : r.error_text,
    };
  }
  return out;
}
