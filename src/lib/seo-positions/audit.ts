import "server-only";

import type { RowDataPacket } from "mysql2";

import { getDbPool } from "@/lib/db";
import { AUDIT_ITEMS, isAuditValue, type AuditEntry } from "@/lib/seo-positions/audit-items";

type AuditRow = RowDataPacket & {
  month: string;
  item_no: number;
  value: string | null;
  comment: string | null;
  source: string;
  updated_at: Date;
};

export type MonthAudit = { month: string; entries: Map<number, AuditEntry>; autoCheckedAt: Date | null };

function toAudit(month: string, rows: AuditRow[]): MonthAudit {
  const entries = new Map<number, AuditEntry>();
  let autoCheckedAt: Date | null = null;
  for (const r of rows) {
    entries.set(r.item_no, {
      value: isAuditValue(r.value) ? r.value : null,
      comment: r.comment ?? "",
      source: r.source === "auto" ? "auto" : "manual",
    });
    if (r.source === "auto" && (!autoCheckedAt || r.updated_at > autoCheckedAt)) autoCheckedAt = r.updated_at;
  }
  return { month, entries, autoCheckedAt };
}

/** Проверка за месяц и ближайшая более ранняя — для «было / стало». */
export async function loadAudits(projectId: string, month: string): Promise<{ current: MonthAudit | null; previous: MonthAudit | null }> {
  const [rows] = await getDbPool().query<AuditRow[]>(
    `select month, item_no, value, comment, source, updated_at from seo_audits
     where project_id = ? and month <= ? order by month desc`,
    [projectId, month]
  );
  const months = [...new Set(rows.map((r) => r.month))];
  const pick = (m: string | undefined) => (m ? toAudit(m, rows.filter((r) => r.month === m)) : null);
  if (months[0] === month) return { current: pick(months[0]), previous: pick(months[1]) };
  return { current: null, previous: pick(months[0]) };
}

export type AuditInput = { itemNo: number; value: AuditEntry["value"]; comment: string };

/** Ручное сохранение пишет только изменённые пункты; автопроверка с keepManual не трогает оценённое вручную. */
export async function saveAudit(projectId: string, month: string, inputs: AuditInput[], source: "auto" | "manual", opts: { keepManual?: boolean } = {}) {
  const { current, previous } = await loadAudits(projectId, month);
  const valid = new Set(AUDIT_ITEMS.map((i) => i.no));
  const conn = await getDbPool().getConnection();
  try {
    await conn.beginTransaction();
    if (!current && previous) {
      await conn.execute(
        `insert ignore into seo_audits (project_id, month, item_no, value, comment, source, updated_at)
         select project_id, ?, item_no, value, comment, source, updated_at from seo_audits where project_id = ? and month = ?`,
        [month, projectId, previous.month]
      );
    }
    for (const input of inputs) {
      if (!valid.has(input.itemNo)) continue;
      const prev = (current ?? previous)?.entries.get(input.itemNo);
      if (opts.keepManual && prev?.source === "manual" && (prev.value !== null || prev.comment)) continue;
      const comment = input.comment.replace(/\s+/g, " ").trim().slice(0, 300);
      if (source === "manual" && prev && prev.value === input.value && prev.comment === comment) continue;
      await conn.execute(
        `insert into seo_audits (project_id, month, item_no, value, comment, source, updated_at)
         values (?, ?, ?, ?, ?, ?, now(3))
         on duplicate key update value = values(value), comment = values(comment), source = values(source), updated_at = now(3)`,
        [projectId, month, input.itemNo, input.value, comment || null, source]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
