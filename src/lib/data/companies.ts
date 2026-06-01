import "server-only";

import { randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getDbPool } from "@/lib/db";
import type { Company } from "@/types/domain";

type CompanyRow = RowDataPacket & {
  id: string;
  name: string;
  website_url: string | null;
  industry: string | null;
  short_description: string | null;
  contacts: string | null;
  notes: string | null;
  status: Company["status"];
  preview_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateCompanyInput = {
  name: string;
  websiteUrl?: string | null;
  industry?: string | null;
  shortDescription?: string | null;
  contacts?: Company["contacts"];
  notes?: string | null;
  previewImageUrl?: string | null;
};

type UpdateCompanyInput = {
  name?: string;
  websiteUrl?: string | null;
  industry?: string | null;
  shortDescription?: string | null;
  contacts?: Company["contacts"];
  notes?: string | null;
  status?: Company["status"];
  previewImageUrl?: string | null;
};

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    websiteUrl: row.website_url,
    industry: row.industry,
    shortDescription: row.short_description,
    contacts: parseJson(row.contacts, {}),
    notes: row.notes,
    status: row.status,
    previewImageUrl: row.preview_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCompanies() {
  const pool = getDbPool();
  const [rows] = await pool.query<CompanyRow[]>(
    "select id, name, website_url, industry, short_description, contacts, notes, status, preview_image_url, created_at, updated_at from companies order by updated_at desc",
  );

  return rows.map(mapCompany);
}

export async function getCompany(companyId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<CompanyRow[]>(
    "select id, name, website_url, industry, short_description, contacts, notes, status, preview_image_url, created_at, updated_at from companies where id = ? limit 1",
    [companyId],
  );

  return rows[0] ? mapCompany(rows[0]) : null;
}

export async function createCompany(input: CreateCompanyInput) {
  const pool = getDbPool();
  const id = randomUUID();

  await pool.execute<ResultSetHeader>(
    "insert into companies (id, name, website_url, industry, short_description, contacts, notes, status, preview_image_url) values (?, ?, ?, ?, ?, ?, ?, 'draft', ?)",
    [
      id,
      input.name,
      input.websiteUrl ?? null,
      input.industry ?? null,
      input.shortDescription ?? null,
      JSON.stringify(input.contacts ?? {}),
      input.notes ?? null,
      input.previewImageUrl ?? null,
    ],
  );

  const company = await getCompany(id);

  if (!company) {
    throw new Error("Не удалось получить созданную компанию.");
  }

  return company;
}

export async function updateCompany(companyId: string, patch: UpdateCompanyInput) {
  const pool = getDbPool();
  const current = await getCompany(companyId);

  if (!current) {
    throw new Error("Компания не найдена.");
  }

  await pool.execute<ResultSetHeader>(
    "update companies set name = ?, website_url = ?, industry = ?, short_description = ?, contacts = ?, notes = ?, status = ?, preview_image_url = ? where id = ?",
    [
      patch.name ?? current.name,
      patch.websiteUrl ?? current.websiteUrl,
      patch.industry ?? current.industry,
      patch.shortDescription ?? current.shortDescription,
      JSON.stringify(patch.contacts ?? current.contacts),
      patch.notes ?? current.notes,
      patch.status ?? current.status,
      "previewImageUrl" in patch ? (patch.previewImageUrl ?? null) : current.previewImageUrl,
      companyId,
    ],
  );

  const updated = await getCompany(companyId);

  if (!updated) {
    throw new Error("Не удалось получить обновленную компанию.");
  }

  return updated;
}

export async function deleteCompany(companyId: string): Promise<void> {
  const pool = getDbPool();
  // Каскадное удаление через FK: company → proposals → share_links, assets
  // Feedback удаляем вручную через proposals
  const [proposalRows] = await pool.query<import("mysql2").RowDataPacket[]>(
    "select id from proposals where company_id = ?",
    [companyId],
  );
  if (proposalRows.length > 0) {
    const ids = proposalRows.map((r) => r.id as string);
    await pool.query("delete from feedback where proposal_id in (?)", [ids]);
  }
  await pool.execute("delete from companies where id = ?", [companyId]);
}