import "server-only";

import type { RowDataPacket } from "mysql2";

import { getDbPool } from "@/lib/db";
import { AUDIT_ITEMS, isAuditValue, PAGE_ITEMS, type AuditEntry } from "@/lib/seo-positions/audit-items";

type AuditRow = RowDataPacket & {
  month: string;
  page_url: string;
  item_no: number;
  value: string | null;
  comment: string | null;
  source: string;
  updated_at: Date;
};

export type AuditEntries = Map<number, AuditEntry>;

/** entries — главная и пункты сайта (page_url ''); pages — пункты страницы по адресу. */
export type MonthAudit = { month: string; entries: AuditEntries; pages: Map<string, AuditEntries>; autoCheckedAt: Date | null };

function toAudit(month: string, rows: AuditRow[]): MonthAudit {
  const entries: AuditEntries = new Map();
  const pages = new Map<string, AuditEntries>();
  let autoCheckedAt: Date | null = null;
  for (const r of rows) {
    const target = r.page_url ? (pages.get(r.page_url) ?? pages.set(r.page_url, new Map()).get(r.page_url)!) : entries;
    target.set(r.item_no, {
      value: isAuditValue(r.value) ? r.value : null,
      comment: r.comment ?? "",
      source: r.source === "auto" ? "auto" : "manual",
    });
    if (r.source === "auto" && (!autoCheckedAt || r.updated_at > autoCheckedAt)) autoCheckedAt = r.updated_at;
  }
  return { month, entries, pages, autoCheckedAt };
}

export function pageEntries(audit: MonthAudit | null | undefined, pageUrl: string): AuditEntries | undefined {
  return pageUrl ? audit?.pages.get(pageUrl) : audit?.entries;
}

/** Проверка за месяц и ближайшая более ранняя — для «было / стало». */
export async function loadAudits(projectId: string, month: string): Promise<{ current: MonthAudit | null; previous: MonthAudit | null }> {
  const [rows] = await getDbPool().query<AuditRow[]>(
    `select month, page_url, item_no, value, comment, source, updated_at from seo_audits
     where project_id = ? and month <= ? order by month desc`,
    [projectId, month]
  );
  const months = [...new Set(rows.map((r) => r.month))];
  const pick = (m: string | undefined) => (m ? toAudit(m, rows.filter((r) => r.month === m)) : null);
  if (months[0] === month) return { current: pick(months[0]), previous: pick(months[1]) };
  return { current: null, previous: pick(months[0]) };
}

/** pageUrl '' или не задан — главная и пункты сайта. */
export type AuditInput = { itemNo: number; value: AuditEntry["value"]; comment: string; pageUrl?: string };

const ALL_NOS = new Set(AUDIT_ITEMS.map((i) => i.no));
const PAGE_NOS = new Set(PAGE_ITEMS.map((i) => i.no));

/** Ручное сохранение пишет только изменённые пункты; автопроверка с keepManual не трогает оценённое вручную. */
export async function saveAudit(projectId: string, month: string, inputs: AuditInput[], source: "auto" | "manual", opts: { keepManual?: boolean } = {}) {
  const { current, previous } = await loadAudits(projectId, month);
  const conn = await getDbPool().getConnection();
  try {
    await conn.beginTransaction();
    if (!current && previous) {
      await conn.execute(
        `insert ignore into seo_audits (project_id, month, page_url, item_no, value, comment, source, updated_at)
         select project_id, ?, page_url, item_no, value, comment, source, updated_at from seo_audits where project_id = ? and month = ?`,
        [month, projectId, previous.month]
      );
    }
    for (const input of inputs) {
      const pageUrl = (input.pageUrl ?? "").slice(0, 500);
      if (!(pageUrl ? PAGE_NOS : ALL_NOS).has(input.itemNo)) continue;
      const prev = pageEntries(current ?? previous, pageUrl)?.get(input.itemNo);
      if (opts.keepManual && prev?.source === "manual" && (prev.value !== null || prev.comment)) continue;
      const comment = input.comment.replace(/\s+/g, " ").trim().slice(0, 300);
      if (source === "manual" && (prev ? prev.value === input.value && prev.comment === comment : !input.value && !comment)) continue;
      await conn.execute(
        `insert into seo_audits (project_id, month, page_url, item_no, value, comment, source, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, now(3))
         on duplicate key update value = values(value), comment = values(comment), source = values(source), updated_at = now(3)`,
        [projectId, month, pageUrl, input.itemNo, input.value, comment || null, source]
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
