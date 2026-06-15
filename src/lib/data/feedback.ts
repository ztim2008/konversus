import "server-only";

import { randomUUID } from "node:crypto";

import type { RowDataPacket } from "mysql2";

import { getDbPool } from "@/lib/db";
import type { ProposalFeedback, ProposalFeedbackSummary } from "@/types/domain";

type FeedbackRow = RowDataPacket & {
  id: string;
  proposal_id: string;
  share_link_id: string | null;
  author_name: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string;
};

type FeedbackWithContextRow = FeedbackRow & {
  proposal_title: string;
  company_name: string;
};

export type FeedbackWithContext = ProposalFeedback & {
  proposalTitle: string;
  companyName: string;
};

type SummaryRow = RowDataPacket & {
  total_count: number;
  avg_rating: number | null;
  latest_comment: string | null;
  latest_author: string | null;
  latest_at: string | null;
};

function mapFeedback(row: FeedbackRow): ProposalFeedback {
  return {
    id: row.id,
    proposalId: row.proposal_id,
    shareLinkId: row.share_link_id,
    authorName: row.author_name,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export async function createFeedback(data: {
  proposalId: string;
  shareLinkId?: string;
  authorName?: string;
  rating?: number;
  comment?: string;
}): Promise<ProposalFeedback> {
  const pool = getDbPool();
  const id = randomUUID();

  await pool.execute(
    `INSERT INTO proposal_feedback (id, proposal_id, share_link_id, author_name, rating, comment)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.proposalId,
      data.shareLinkId ?? null,
      data.authorName?.trim() || null,
      data.rating ?? null,
      data.comment?.trim() || null,
    ],
  );

  return {
    id,
    proposalId: data.proposalId,
    shareLinkId: data.shareLinkId ?? null,
    authorName: data.authorName?.trim() || null,
    rating: data.rating ?? null,
    comment: data.comment?.trim() || null,
    createdAt: new Date().toISOString(),
  };
}

export async function getFeedbackByProposal(proposalId: string): Promise<ProposalFeedback[]> {
  const pool = getDbPool();
  const [rows] = await pool.execute<FeedbackRow[]>(
    `SELECT * FROM proposal_feedback WHERE proposal_id = ? ORDER BY created_at DESC`,
    [proposalId],
  );
  return rows.map(mapFeedback);
}

export async function getFeedbackSummary(proposalId: string): Promise<ProposalFeedbackSummary> {
  const pool = getDbPool();
  const [rows] = await pool.execute<SummaryRow[]>(
    `SELECT
       COUNT(*) AS total_count,
       AVG(rating) AS avg_rating,
       (SELECT comment FROM proposal_feedback WHERE proposal_id = ? AND comment IS NOT NULL ORDER BY created_at DESC LIMIT 1) AS latest_comment,
       (SELECT author_name FROM proposal_feedback WHERE proposal_id = ? AND comment IS NOT NULL ORDER BY created_at DESC LIMIT 1) AS latest_author,
       (SELECT created_at FROM proposal_feedback WHERE proposal_id = ? ORDER BY created_at DESC LIMIT 1) AS latest_at
     FROM proposal_feedback
     WHERE proposal_id = ?`,
    [proposalId, proposalId, proposalId, proposalId],
  );
  const row = rows[0];
  return {
    totalCount: Number(row?.total_count ?? 0),
    avgRating: row?.avg_rating != null ? Math.round(Number(row.avg_rating) * 10) / 10 : null,
    latestComment: row?.latest_comment ?? null,
    latestAuthor: row?.latest_author ?? null,
    latestAt: row?.latest_at ?? null,
  };
}

export async function getFeedbackSummariesForProposals(
  proposalIds: string[],
): Promise<Record<string, ProposalFeedbackSummary>> {
  if (proposalIds.length === 0) return {};
  const pool = getDbPool();
  const placeholders = proposalIds.map(() => "?").join(", ");
  const [rows] = await pool.execute<(RowDataPacket & { proposal_id: string; total_count: number; avg_rating: number | null })[]>(
    `SELECT proposal_id, COUNT(*) AS total_count, AVG(rating) AS avg_rating
     FROM proposal_feedback
     WHERE proposal_id IN (${placeholders})
     GROUP BY proposal_id`,
    proposalIds,
  );

  const result: Record<string, ProposalFeedbackSummary> = {};
  for (const row of rows) {
    result[row.proposal_id] = {
      totalCount: Number(row.total_count),
      avgRating: row.avg_rating != null ? Math.round(Number(row.avg_rating) * 10) / 10 : null,
      latestComment: null,
      latestAuthor: null,
      latestAt: null,
    };
  }
  return result;
}

export async function getAllFeedback(limit = 200): Promise<FeedbackWithContext[]> {
  const pool = getDbPool();
  const [rows] = await pool.execute<FeedbackWithContextRow[]>(
    `SELECT pf.id, pf.proposal_id, pf.share_link_id, pf.author_name, pf.rating, pf.comment, pf.created_at,
            p.title AS proposal_title,
            c.name AS company_name
     FROM proposal_feedback pf
     JOIN proposals p ON p.id = pf.proposal_id
     JOIN companies c ON c.id = p.company_id
     ORDER BY pf.created_at DESC
     LIMIT ?`,
    [Number(limit)],
  );
  return rows.map((row) => ({
    id: row.id,
    proposalId: row.proposal_id,
    shareLinkId: row.share_link_id,
    authorName: row.author_name,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    proposalTitle: row.proposal_title,
    companyName: row.company_name,
  }));
}

export async function deleteFeedback(id: string): Promise<void> {
  const pool = getDbPool();
  await pool.execute(`DELETE FROM proposal_feedback WHERE id = ?`, [id]);
}
