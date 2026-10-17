import "server-only";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { after } from "next/server";

import { getDbPool } from "@/lib/db";

export type RunKind = "checklist" | "pages" | "crawl" | "positions";

export type RunState = {
  status: "running" | "done" | "error";
  month: string;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
  done: number;
  total: number;
  step: string | null;
  result: string | null;
  /** Сколько идёт проверка на момент чтения, мс. */
  elapsedMs: number;
};

/** Сообщает, сколько шагов сделано из скольких и что делается сейчас. */
export type RunProgress = (done: number, total: number, step?: string) => Promise<void>;

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
    `update seo_audit_runs set month = ?, status = 'running', started_at = now(3), finished_at = null, error_text = null,
       progress_done = 0, progress_total = 0, progress_step = null, result_text = null
     where project_id = ? and kind = ? and (status <> 'running' or started_at < now(3) - interval ${STALE_MINUTES} minute)`,
    [month, projectId, kind]
  );
  return upd.affectedRows === 1;
}

async function finishRun(projectId: string, kind: RunKind, error: string | null, result: string | null) {
  await getDbPool().execute(
    `update seo_audit_runs set status = ?, finished_at = now(3), error_text = ?, result_text = ? where project_id = ? and kind = ?`,
    [error ? "error" : "done", error ? error.slice(0, 300) : null, result ? result.slice(0, 300) : null, projectId, kind]
  );
}

/** Запускает работу после ответа. Сообщение ошибки показывается пользователю, поэтому задача сама решает, что в нём писать. */
export async function startBackgroundRun(
  projectId: string,
  kind: RunKind,
  month: string,
  job: (progress: RunProgress) => Promise<string | void>
): Promise<boolean> {
  if (!(await claimRun(projectId, kind, month))) return false;
  const progress: RunProgress = async (done, total, step) => {
    await getDbPool()
      .execute(
        `update seo_audit_runs set progress_done = ?, progress_total = ?, progress_step = ? where project_id = ? and kind = ? and status = 'running'`,
        [done, total, step ? step.slice(0, 300) : null, projectId, kind]
      )
      .catch(() => undefined);
  };
  after(async () => {
    try {
      const result = await job(progress);
      await finishRun(projectId, kind, null, result || null);
    } catch (err) {
      console.error(`[seo-positions] ${kind} run failed`, err);
      await finishRun(projectId, kind, err instanceof UserFacingError ? err.message : "Проверка не удалась", null).catch(() => undefined);
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
  progress_done: number;
  progress_total: number;
  progress_step: string | null;
  result_text: string | null;
  stale: number;
  elapsed_ms: number;
};

export async function getRuns(projectId: string): Promise<Partial<Record<RunKind, RunState>>> {
  const [rows] = await getDbPool().query<RunRow[]>(
    `select kind, month, status, started_at, finished_at, error_text, progress_done, progress_total, progress_step, result_text,
       (status = 'running' and started_at < now(3) - interval ${STALE_MINUTES} minute) as stale,
       timestampdiff(microsecond, started_at, now(3)) div 1000 as elapsed_ms
     from seo_audit_runs where project_id = ?`,
    [projectId]
  );
  const out: Partial<Record<RunKind, RunState>> = {};
  for (const r of rows) {
    const stale = Number(r.stale) === 1;
    out[r.kind] = {
      status: stale ? "error" : r.status === "running" ? "running" : r.status === "error" ? "error" : "done",
      month: r.month,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      error: stale ? "Проверка прервалась, запустите ещё раз" : r.error_text,
      done: Number(r.progress_done) || 0,
      total: Number(r.progress_total) || 0,
      step: r.progress_step,
      result: r.result_text,
      elapsedMs: Number(r.elapsed_ms) || 0,
    };
  }
  return out;
}
