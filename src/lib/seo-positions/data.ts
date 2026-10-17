import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getDbPool } from "@/lib/db";

export type SnapshotStatus = "found" | "not_found" | "error";

export type SeoProject = {
  id: string;
  name: string;
  domain: string;
  gl: string;
  hl: string;
  location: string;
  maxPages: number;
  shareSlug: string;
  isActive: boolean;
  createdAt: string;
};

export type TopItem = { position: number; host: string; url: string; title: string };

export type SeoSnapshot = {
  id: string;
  keywordId: string;
  checkedAt: string;
  status: SnapshotStatus;
  position: number | null;
  page: number | null;
  matchedUrl: string | null;
  depth: number;
  credits: number;
  top: TopItem[];
  errorText: string | null;
};

export type SeoKeyword = {
  id: string;
  projectId: string;
  keyword: string;
  isActive: boolean;
  checkingSince: string | null;
};

export const MAX_KEYWORDS_PER_PROJECT = 50;

type ProjectRow = RowDataPacket & {
  id: string;
  name: string;
  domain: string;
  gl: string;
  hl: string;
  location: string;
  max_pages: number;
  share_slug: string;
  is_active: number;
  created_at: Date;
};

type KeywordRow = RowDataPacket & {
  id: string;
  project_id: string;
  keyword: string;
  is_active: number;
  checking_since: Date | null;
};

type SnapshotRow = RowDataPacket & {
  id: string;
  keyword_id: string;
  checked_at: Date;
  status: SnapshotStatus;
  position: number | null;
  page: number | null;
  matched_url: string | null;
  depth: number;
  credits: number;
  top_json: unknown;
  error_text: string | null;
};

function mapProject(r: ProjectRow): SeoProject {
  return {
    id: r.id,
    name: r.name,
    domain: r.domain,
    gl: r.gl,
    hl: r.hl,
    location: r.location,
    maxPages: r.max_pages,
    shareSlug: r.share_slug,
    isActive: !!r.is_active,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function mapKeyword(r: KeywordRow): SeoKeyword {
  return {
    id: r.id,
    projectId: r.project_id,
    keyword: r.keyword,
    isActive: !!r.is_active,
    checkingSince: r.checking_since ? new Date(r.checking_since).toISOString() : null,
  };
}

function parseTop(value: unknown): TopItem[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? (parsed as TopItem[]) : [];
}

function mapSnapshot(r: SnapshotRow): SeoSnapshot {
  return {
    id: r.id,
    keywordId: r.keyword_id,
    checkedAt: new Date(r.checked_at).toISOString(),
    status: r.status,
    position: r.position,
    page: r.page,
    matchedUrl: r.matched_url,
    depth: r.depth,
    credits: r.credits,
    top: parseTop(r.top_json),
    errorText: r.error_text,
  };
}

export async function listProjects(): Promise<SeoProject[]> {
  const [rows] = await getDbPool().query<ProjectRow[]>(
    "select * from seo_projects order by created_at desc"
  );
  return rows.map(mapProject);
}

export async function getProject(id: string): Promise<SeoProject | null> {
  const [rows] = await getDbPool().query<ProjectRow[]>("select * from seo_projects where id = ?", [id]);
  return rows[0] ? mapProject(rows[0]) : null;
}

export async function getProjectBySlug(slug: string): Promise<SeoProject | null> {
  if (!/^[a-z0-9]{24}$/.test(slug)) return null;
  const [rows] = await getDbPool().query<ProjectRow[]>(
    "select * from seo_projects where share_slug = ?",
    [slug]
  );
  return rows[0] ? mapProject(rows[0]) : null;
}

export async function createProject(input: {
  name: string;
  domain: string;
  gl: string;
  hl: string;
  location: string;
  maxPages: number;
}): Promise<string> {
  const id = randomUUID();
  const slug = randomBytes(12).toString("hex");
  await getDbPool().execute(
    `insert into seo_projects (id, name, domain, gl, hl, location, max_pages, share_slug, is_active, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, 1, now(3))`,
    [id, input.name, input.domain, input.gl, input.hl, input.location, input.maxPages, slug]
  );
  return id;
}

export async function setProjectActive(id: string, active: boolean) {
  await getDbPool().execute("update seo_projects set is_active = ? where id = ?", [active ? 1 : 0, id]);
}

export async function deleteProject(id: string) {
  await getDbPool().execute("delete from seo_projects where id = ?", [id]);
}

export async function listKeywords(projectId: string): Promise<SeoKeyword[]> {
  const [rows] = await getDbPool().query<KeywordRow[]>(
    "select * from seo_keywords where project_id = ? order by created_at, keyword",
    [projectId]
  );
  return rows.map(mapKeyword);
}

export async function addKeywords(projectId: string, keywords: string[]): Promise<number> {
  const [countRows] = await getDbPool().query<(RowDataPacket & { c: number })[]>(
    "select count(*) as c from seo_keywords where project_id = ?",
    [projectId]
  );
  const room = Math.max(0, MAX_KEYWORDS_PER_PROJECT - Number(countRows[0]?.c ?? 0));
  const batch = keywords.slice(0, room);
  let added = 0;
  for (const keyword of batch) {
    const [res] = await getDbPool().execute<ResultSetHeader>(
      `insert ignore into seo_keywords (id, project_id, keyword, is_active, created_at)
       values (?, ?, ?, 1, now(3))`,
      [randomUUID(), projectId, keyword]
    );
    added += res.affectedRows;
  }
  return added;
}

export async function deleteKeyword(projectId: string, keywordId: string) {
  await getDbPool().execute("delete from seo_keywords where id = ? and project_id = ?", [keywordId, projectId]);
}

/** Захват ключа на проверку: второй параллельный запуск получит false. Зависший захват снимается через 10 минут. */
export async function claimKeyword(keywordId: string): Promise<boolean> {
  const [res] = await getDbPool().execute<ResultSetHeader>(
    `update seo_keywords set checking_since = now(3)
     where id = ? and (checking_since is null or checking_since < now(3) - interval 10 minute)`,
    [keywordId]
  );
  return res.affectedRows === 1;
}

export async function releaseKeyword(keywordId: string) {
  await getDbPool().execute("update seo_keywords set checking_since = null where id = ?", [keywordId]);
}

export async function insertSnapshot(s: Omit<SeoSnapshot, "id" | "checkedAt">) {
  await getDbPool().execute(
    `insert into seo_snapshots (id, keyword_id, checked_at, status, position, page, matched_url, depth, credits, top_json, error_text)
     values (?, ?, now(3), ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      s.keywordId,
      s.status,
      s.position,
      s.page,
      s.matchedUrl ? s.matchedUrl.slice(0, 1000) : null,
      s.depth,
      s.credits,
      JSON.stringify(s.top),
      s.errorText ? s.errorText.slice(0, 500) : null,
    ]
  );
}

export async function lastOkStatus(keywordId: string): Promise<SnapshotStatus | null> {
  const [rows] = await getDbPool().query<(RowDataPacket & { status: SnapshotStatus })[]>(
    `select status from seo_snapshots where keyword_id = ? and status <> 'error'
     order by checked_at desc limit 1`,
    [keywordId]
  );
  return rows[0]?.status ?? null;
}

export async function listSnapshots(projectId: string, sinceDays: number): Promise<SeoSnapshot[]> {
  const [rows] = await getDbPool().query<SnapshotRow[]>(
    `select s.* from seo_snapshots s
     join seo_keywords k on k.id = s.keyword_id
     where k.project_id = ? and s.checked_at >= now(3) - interval ? day
     order by s.checked_at`,
    [projectId, sinceDays]
  );
  return rows.map(mapSnapshot);
}

export async function creditsUsedSince(hours: number): Promise<number> {
  const [rows] = await getDbPool().query<(RowDataPacket & { c: number | null })[]>(
    "select sum(credits) as c from seo_snapshots where checked_at >= now(3) - interval ? hour",
    [hours]
  );
  return Number(rows[0]?.c ?? 0);
}

export type SeoNote = { id: string; keywordId: string | null; date: string; text: string };

type NoteRow = RowDataPacket & { id: string; keyword_id: string | null; note_date: string; text: string };

export async function listNotes(projectId: string, sinceDays: number): Promise<SeoNote[]> {
  const [rows] = await getDbPool().query<NoteRow[]>(
    `select id, keyword_id, date_format(note_date, '%Y-%m-%d') as note_date, text from seo_notes
     where project_id = ? and note_date >= curdate() - interval ? day
     order by note_date, created_at`,
    [projectId, sinceDays]
  );
  return rows.map((r) => ({ id: r.id, keywordId: r.keyword_id, date: r.note_date, text: r.text }));
}

export async function addNote(projectId: string, input: { keywordId: string | null; date: string; text: string }) {
  if (input.keywordId) {
    const [rows] = await getDbPool().query<RowDataPacket[]>(
      "select 1 from seo_keywords where id = ? and project_id = ?",
      [input.keywordId, projectId]
    );
    if (!rows.length) return;
  }
  await getDbPool().execute(
    "insert into seo_notes (id, project_id, keyword_id, note_date, text, created_at) values (?, ?, ?, ?, ?, now(3))",
    [randomUUID(), projectId, input.keywordId, input.date, input.text]
  );
}

export async function deleteNote(projectId: string, noteId: string) {
  await getDbPool().execute("delete from seo_notes where id = ? and project_id = ?", [noteId, projectId]);
}

/** Активные ключи активных проектов без успешного снимка за последние 20 часов. */
export async function listDueKeywords(limit: number): Promise<{ project: SeoProject; keyword: SeoKeyword }[]> {
  const [rows] = await getDbPool().query<KeywordRow[]>(
    `select k.* from seo_keywords k
     join seo_projects p on p.id = k.project_id
     where p.is_active = 1 and k.is_active = 1
       and not exists (
         select 1 from seo_snapshots s
         where s.keyword_id = k.id and s.status <> 'error' and s.checked_at >= now(3) - interval 20 hour
       )
     order by k.created_at
     limit ?`,
    [limit]
  );
  const projects = new Map<string, SeoProject>();
  const out: { project: SeoProject; keyword: SeoKeyword }[] = [];
  for (const row of rows) {
    let project = projects.get(row.project_id);
    if (!project) {
      project = (await getProject(row.project_id)) ?? undefined;
      if (!project) continue;
      projects.set(project.id, project);
    }
    out.push({ project, keyword: mapKeyword(row) });
  }
  return out;
}
