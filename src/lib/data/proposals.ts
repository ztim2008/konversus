import "server-only";

import { randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getDbPool } from "@/lib/db";
import { createDefaultProposalStructure } from "@/lib/proposal-builder";
import type { DesignPreset, Proposal } from "@/types/domain";

type ProposalRow = RowDataPacket & {
  id: string;
  company_id: string;
  title: string;
  preset: DesignPreset;
  status: Proposal["status"];
  headline: string | null;
  subheadline: string | null;
  cta_label: string | null;
  structure: string | null;
  settings: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateProposalInput = {
  companyId: string;
  title: string;
  preset: DesignPreset;
  headline?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
};

function parseJson<T>(value: string | T | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapProposal(row: ProposalRow): Proposal {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    preset: row.preset,
    status: row.status,
    headline: row.headline,
    subheadline: row.subheadline,
    ctaLabel: row.cta_label,
    structure: parseJson(row.structure, []),
    settings: parseJson(row.settings, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProposal(proposalId: string) {
  const pool = getDbPool();
  const [rows] = await pool.query<ProposalRow[]>(
    "select id, company_id, title, preset, status, headline, subheadline, cta_label, structure, settings, created_at, updated_at from proposals where id = ? limit 1",
    [proposalId],
  );

  return rows[0] ? mapProposal(rows[0]) : null;
}

export async function listProposals() {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.query("SET sort_buffer_size = 16777216");
    const [rows] = await conn.query<ProposalRow[]>(
      "select id, company_id, title, preset, status, headline, subheadline, cta_label, structure, settings, created_at, updated_at from proposals order by updated_at desc",
    );
    return rows.map(mapProposal);
  } finally {
    conn.release();
  }
}

export async function createProposal(input: CreateProposalInput) {
  const pool = getDbPool();
  const id = randomUUID();
  const structure = createDefaultProposalStructure({
    title: input.title,
    headline: input.headline,
    subheadline: input.subheadline,
    ctaLabel: input.ctaLabel,
  });

  await pool.execute<ResultSetHeader>(
    "insert into proposals (id, company_id, title, preset, status, headline, subheadline, cta_label, structure, settings) values (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)",
    [
      id,
      input.companyId,
      input.title,
      input.preset,
      input.headline ?? null,
      input.subheadline ?? null,
      input.ctaLabel ?? null,
      JSON.stringify(structure),
      JSON.stringify({}),
    ],
  );

  const proposal = await getProposal(id);

  if (!proposal) {
    throw new Error("Не удалось получить созданный концепт.");
  }

  return proposal;
}

type UpdateProposalInput = {
  title?: string;
  preset?: DesignPreset;
  status?: Proposal["status"];
  headline?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
  structure?: Proposal["structure"];
  settings?: Proposal["settings"];
};

export async function updateProposal(proposalId: string, patch: UpdateProposalInput) {
  const pool = getDbPool();
  const current = await getProposal(proposalId);

  if (!current) {
    throw new Error("Концепт не найден.");
  }

  await pool.execute<ResultSetHeader>(
    "update proposals set title = ?, preset = ?, status = ?, headline = ?, subheadline = ?, cta_label = ?, structure = ?, settings = ? where id = ?",
    [
      patch.title ?? current.title,
      patch.preset ?? current.preset,
      patch.status ?? current.status,
      patch.headline ?? current.headline,
      patch.subheadline ?? current.subheadline,
      patch.ctaLabel ?? current.ctaLabel,
      JSON.stringify(patch.structure ?? current.structure),
      JSON.stringify(patch.settings ?? current.settings),
      proposalId,
    ],
  );

  const updated = await getProposal(proposalId);

  if (!updated) {
    throw new Error("Не удалось получить обновленный концепт.");
  }

  return updated;
}

export async function deleteProposal(proposalId: string): Promise<void> {
  const pool = getDbPool();
  // Удаляем feedback вручную (FK не гарантирован), остальное каскадно через БД
  await pool.execute("delete from feedback where proposal_id = ?", [proposalId]);
  await pool.execute("delete from proposals where id = ?", [proposalId]);
}

export async function duplicateProposal(
  sourceProposalId: string,
  input: { companyId: string; title: string },
) {
  const source = await getProposal(sourceProposalId);
  if (!source) throw new Error("Исходный концепт не найден.");

  const pool = getDbPool();
  const id = randomUUID();

  await pool.execute<ResultSetHeader>(
    "insert into proposals (id, company_id, title, preset, status, headline, subheadline, cta_label, structure, settings) values (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)",
    [
      id,
      input.companyId,
      input.title,
      source.preset,
      source.headline ?? null,
      source.subheadline ?? null,
      source.ctaLabel ?? null,
      JSON.stringify(source.structure),
      JSON.stringify(source.settings ?? {}),
    ],
  );

  const proposal = await getProposal(id);
  if (!proposal) throw new Error("Не удалось получить дублированный концепт.");
  return proposal;
}