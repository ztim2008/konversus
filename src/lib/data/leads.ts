import "server-only";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { randomUUID } from "node:crypto";
import { getDbPool } from "@/lib/db";

export type LeadStatus =
  | "new"
  | "analyzed"
  | "proposal_sent"
  | "negotiating"
  | "client"
  | "archive";

export type LeadPriority = "high" | "medium" | "low";

export interface Lead {
  id: string;
  url: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  status: LeadStatus;
  priority: LeadPriority | null;
  site_score: number | null;
  architect_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

type LeadRow = RowDataPacket & Lead;

export async function createLead(data: {
  url: string;
  company_name?: string;
  phone?: string;
  email?: string;
  source?: string;
}): Promise<string> {
  const db = getDbPool();
  const id = randomUUID();
  await db.query<ResultSetHeader>(
    `INSERT INTO leads (id, url, company_name, phone, email, source)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.url,
      data.company_name ?? null,
      data.phone ?? null,
      data.email ?? null,
      data.source ?? "manual",
    ]
  );
  return id;
}

export async function getLead(id: string): Promise<Lead | null> {
  const db = getDbPool();
  const [rows] = await db.query<LeadRow[]>(
    "SELECT * FROM leads WHERE id = ?",
    [id]
  );
  return rows[0] ?? null;
}

export async function listLeads(opts?: {
  status?: LeadStatus;
  limit?: number;
  offset?: number;
}): Promise<{ leads: Lead[]; total: number }> {
  const db = getDbPool();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts?.status) {
    conditions.push("status = ?");
    params.push(opts.status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [[{ total }]] = await db.query<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) as total FROM leads ${where}`,
    params
  );

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const [leads] = await db.query<LeadRow[]>(
    `SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { leads, total };
}

export async function updateLead(
  id: string,
  data: Partial<{
    status: LeadStatus;
    priority: LeadPriority;
    site_score: number;
    architect_id: string;
    company_name: string;
    notes: string;
  }>
): Promise<void> {
  const db = getDbPool();
  const sets: string[] = [];
  const params: unknown[] = [];

  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      sets.push(`\`${key}\` = ?`);
      params.push(val);
    }
  }
  if (!sets.length) return;
  params.push(id);
  await db.query(
    `UPDATE leads SET ${sets.join(", ")} WHERE id = ?`,
    params
  );
}

export async function deleteLead(id: string): Promise<void> {
  const db = getDbPool();
  await db.query("DELETE FROM leads WHERE id = ?", [id]);
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Новый",
  analyzed: "Изучен",
  proposal_sent: "КП отправлено",
  negotiating: "Переговоры",
  client: "Клиент",
  archive: "Архив",
};

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};
