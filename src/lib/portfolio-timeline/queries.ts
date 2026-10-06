import "server-only";

import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getDbPool } from "@/lib/db";
import { deleteUploadedFiles } from "@/lib/storage";

import { sanitizePortfolioHtml } from "./sanitize";
import type { PortfolioEntry, PortfolioMedia, PortfolioPage } from "./types";

const PAGE_SIZE = 12;
const MAX_MEDIA = 12;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ORIGINALS_ROOT = path.join(process.cwd(), "sales-doc", "portfolio-originals");

type EntryRow = RowDataPacket & {
  id: string;
  title: string;
  description: string | null;
  created_at: Date | string;
  published: number;
};

type MediaRow = RowDataPacket & {
  id: string;
  entry_id: string | null;
  url: string;
  lightbox_url: string;
  thumb_url: string | null;
  original_path: string;
  width: number;
  height: number;
  alt: string;
  sort_order: number;
  created_at: Date | string;
};

export class PortfolioInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortfolioInputError";
  }
}

function toIso(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function mapMedia(row: MediaRow): PortfolioMedia {
  return {
    id: row.id,
    url: row.url,
    lightboxUrl: row.lightbox_url,
    thumbUrl: row.thumb_url,
    width: row.width,
    height: row.height,
    alt: row.alt,
    sortOrder: row.sort_order,
  };
}

function assertUuid(id: string) {
  if (!UUID_RE.test(id)) throw new PortfolioInputError("Некорректный идентификатор");
}

export function encodeCursor(createdAt: string, id: string) {
  return Buffer.from(`${createdAt}|${id}`).toString("base64url");
}

export function decodeCursor(cursor: string) {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const sep = raw.lastIndexOf("|");
    if (sep <= 0) return null;
    const iso = raw.slice(0, sep);
    const id = raw.slice(sep + 1);
    if (!UUID_RE.test(id)) return null;
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

function originalAbsolute(relativePath: string) {
  const full = path.resolve(ORIGINALS_ROOT, relativePath);
  const root = path.resolve(ORIGINALS_ROOT);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new PortfolioInputError("Некорректный путь файла");
  }
  return full;
}

async function removeMediaFiles(rows: MediaRow[]) {
  const publicUrls = rows.flatMap((row) => [row.url, row.lightbox_url, row.thumb_url].filter(Boolean) as string[]);
  await deleteUploadedFiles(publicUrls);
  await Promise.allSettled(
    rows.map(async (row) => {
      try {
        await unlink(originalAbsolute(row.original_path));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") console.error("portfolio original unlink", code ?? "error");
      }
    }),
  );
}

async function mediaForEntries(entryIds: string[]) {
  const grouped = new Map<string, PortfolioMedia[]>();
  if (entryIds.length === 0) return grouped;

  const pool = getDbPool();
  const placeholders = entryIds.map(() => "?").join(",");
  const [rows] = await pool.query<MediaRow[]>(
    `select id, entry_id, url, lightbox_url, thumb_url, original_path, width, height, alt, sort_order, created_at
     from portfolio_media
     where entry_id in (${placeholders})
     order by sort_order asc, created_at asc`,
    entryIds,
  );

  for (const row of rows) {
    if (!row.entry_id) continue;
    const list = grouped.get(row.entry_id) ?? [];
    list.push(mapMedia(row));
    grouped.set(row.entry_id, list);
  }

  return grouped;
}

export async function listEntries(options: { includeDrafts: boolean; cursor?: string | null }): Promise<PortfolioPage> {
  const pool = getDbPool();
  const decoded = options.cursor ? decodeCursor(options.cursor) : null;
  if (options.cursor && !decoded) throw new PortfolioInputError("Некорректный курсор");

  const [rows] = await pool.query<EntryRow[]>(
    `select id, title, description, created_at, published
     from portfolio_entries
     where (? = 1 or published = 1)
       and (? is null or created_at < ? or (created_at = ? and id < ?))
     order by created_at desc, id desc
     limit ${PAGE_SIZE + 1}`,
    [
      options.includeDrafts ? 1 : 0,
      decoded?.createdAt ?? null,
      decoded?.createdAt ?? null,
      decoded?.createdAt ?? null,
      decoded?.id ?? null,
    ],
  );

  const pageRows = rows.slice(0, PAGE_SIZE);
  const media = await mediaForEntries(pageRows.map((row) => row.id));
  const entries: PortfolioEntry[] = pageRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ? sanitizePortfolioHtml(row.description) : null,
    createdAt: toIso(row.created_at),
    published: Boolean(row.published),
    media: (media.get(row.id) ?? []).map((item) => ({
      ...item,
      alt: item.alt || row.title,
    })),
  }));

  const last = entries[entries.length - 1];
  const nextCursor = rows.length > PAGE_SIZE && last ? encodeCursor(last.createdAt, last.id) : null;

  return { entries, nextCursor };
}

export async function getEntry(id: string, options: { includeDrafts: boolean }) {
  assertUuid(id);
  const pool = getDbPool();
  const [rows] = await pool.query<EntryRow[]>(
    `select id, title, description, created_at, published
     from portfolio_entries
     where id = ? and (? = 1 or published = 1)
     limit 1`,
    [id, options.includeDrafts ? 1 : 0],
  );
  const row = rows[0];
  if (!row) return null;
  const media = await mediaForEntries([row.id]);
  return {
    id: row.id,
    title: row.title,
    description: row.description ? sanitizePortfolioHtml(row.description) : null,
    createdAt: toIso(row.created_at),
    published: Boolean(row.published),
    media: (media.get(row.id) ?? []).map((item) => ({ ...item, alt: item.alt || row.title })),
  } satisfies PortfolioEntry;
}

function readTitle(value: unknown) {
  if (typeof value !== "string") throw new PortfolioInputError("Нужен заголовок");
  const title = value.replace(/\s+/g, " ").trim();
  if (!title) throw new PortfolioInputError("Нужен заголовок");
  if (title.length > 200) throw new PortfolioInputError("Заголовок длиннее 200 символов");
  return title;
}

function readMediaIds(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new PortfolioInputError("Добавьте хотя бы одно изображение");
  }
  if (value.length > MAX_MEDIA) throw new PortfolioInputError("Не больше 12 изображений");
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !UUID_RE.test(item)) {
      throw new PortfolioInputError("Некорректное изображение");
    }
    if (!ids.includes(item)) ids.push(item);
  }
  return ids;
}

async function loadMediaByIds(ids: string[]) {
  const pool = getDbPool();
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await pool.query<MediaRow[]>(
    `select id, entry_id, url, lightbox_url, thumb_url, original_path, width, height, alt, sort_order, created_at
     from portfolio_media
     where id in (${placeholders})`,
    ids,
  );
  return rows;
}

export async function createEntry(input: { title?: unknown; description?: unknown; published?: unknown; mediaIds?: unknown }) {
  const title = readTitle(input.title);
  const description = typeof input.description === "string" ? sanitizePortfolioHtml(input.description) : null;
  const published = Boolean(input.published);
  const mediaIds = readMediaIds(input.mediaIds);
  const rows = await loadMediaByIds(mediaIds);

  if (rows.length !== mediaIds.length || rows.some((row) => row.entry_id)) {
    throw new PortfolioInputError("Изображение уже привязано или не найдено");
  }

  const pool = getDbPool();
  const id = randomUUID();
  const now = new Date();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `insert into portfolio_entries (id, title, description, created_at, updated_at, published)
       values (?, ?, ?, ?, ?, ?)`,
      [id, title, description, now, now, published ? 1 : 0],
    );
    for (let index = 0; index < mediaIds.length; index += 1) {
      const [result] = await connection.execute<ResultSetHeader>(
        `update portfolio_media
         set entry_id = ?, sort_order = ?, alt = ?
         where id = ? and entry_id is null`,
        [id, index, title, mediaIds[index]],
      );
      if (result.affectedRows !== 1) throw new PortfolioInputError("Не удалось прикрепить изображение");
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const entry = await getEntry(id, { includeDrafts: true });
  if (!entry) throw new Error("Запись не сохранилась");
  return entry;
}

export async function updateEntry(
  id: string,
  input: { title?: unknown; description?: unknown; published?: unknown; mediaIds?: unknown },
) {
  assertUuid(id);
  const title = readTitle(input.title);
  const description = typeof input.description === "string" ? sanitizePortfolioHtml(input.description) : null;
  const published = Boolean(input.published);
  const mediaIds = readMediaIds(input.mediaIds);
  const existing = await getEntry(id, { includeDrafts: true });
  if (!existing) return null;

  const rows = await loadMediaByIds(mediaIds);
  if (rows.length !== mediaIds.length) throw new PortfolioInputError("Изображение не найдено");
  if (rows.some((row) => row.entry_id && row.entry_id !== id)) {
    throw new PortfolioInputError("Изображение принадлежит другой работе");
  }

  const pool = getDbPool();
  const [currentRows] = await pool.query<MediaRow[]>(
    `select id, entry_id, url, lightbox_url, thumb_url, original_path, width, height, alt, sort_order, created_at
     from portfolio_media where entry_id = ?`,
    [id],
  );
  const keep = new Set(mediaIds);
  const removed = currentRows.filter((row) => !keep.has(row.id));
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `update portfolio_entries
       set title = ?, description = ?, published = ?, updated_at = ?,
           telegram_announced_at = if(? = 1, telegram_announced_at, null)
       where id = ?`,
      [title, description, published ? 1 : 0, new Date(), published ? 1 : 0, id],
    );
    if (removed.length > 0) {
      const placeholders = removed.map(() => "?").join(",");
      await connection.query(`delete from portfolio_media where entry_id = ? and id in (${placeholders})`, [
        id,
        ...removed.map((row) => row.id),
      ]);
    }
    for (let index = 0; index < mediaIds.length; index += 1) {
      const [result] = await connection.execute<ResultSetHeader>(
        `update portfolio_media
         set entry_id = ?, sort_order = ?, alt = ?
         where id = ? and (entry_id = ? or entry_id is null)`,
        [id, index, title, mediaIds[index], id],
      );
      if (result.affectedRows !== 1) throw new PortfolioInputError("Не удалось сохранить порядок изображений");
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await removeMediaFiles(removed);
  return getEntry(id, { includeDrafts: true });
}

export async function claimTelegramAnnounce(id: string) {
  assertUuid(id);
  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `update portfolio_entries
     set telegram_announced_at = ?
     where id = ? and published = 1 and telegram_announced_at is null`,
    [new Date(), id],
  );
  return result.affectedRows === 1;
}

export async function releaseTelegramAnnounce(id: string) {
  assertUuid(id);
  const pool = getDbPool();
  await pool.execute(
    `update portfolio_entries set telegram_announced_at = null where id = ? and published = 1`,
    [id],
  );
}

export async function deleteEntry(id: string) {
  assertUuid(id);
  const pool = getDbPool();
  const [rows] = await pool.query<MediaRow[]>(
    `select id, entry_id, url, lightbox_url, thumb_url, original_path, width, height, alt, sort_order, created_at
     from portfolio_media where entry_id = ?`,
    [id],
  );
  const [result] = await pool.execute<ResultSetHeader>("delete from portfolio_entries where id = ?", [id]);
  if (result.affectedRows !== 1) return false;
  await removeMediaFiles(rows);
  return true;
}

export async function insertUploadedMedia(input: {
  url: string;
  lightboxUrl: string;
  thumbUrl: string;
  originalPath: string;
  width: number;
  height: number;
}) {
  const pool = getDbPool();
  const id = randomUUID();
  await pool.execute(
    `insert into portfolio_media
      (id, entry_id, url, lightbox_url, thumb_url, original_path, width, height, alt, sort_order, created_at)
     values (?, null, ?, ?, ?, ?, ?, ?, '', 0, ?)`,
    [id, input.url, input.lightboxUrl, input.thumbUrl, input.originalPath, input.width, input.height, new Date()],
  );

  const [rows] = await pool.query<MediaRow[]>(
    `select id, entry_id, url, lightbox_url, thumb_url, original_path, width, height, alt, sort_order, created_at
     from portfolio_media where id = ? limit 1`,
    [id],
  );
  const row = rows[0];
  if (!row) throw new Error("Файл не записался");
  return mapMedia(row);
}

export async function discardUnattachedMedia(ids: string[]) {
  const unique = [...new Set(ids)].filter((id) => UUID_RE.test(id)).slice(0, MAX_MEDIA);
  if (unique.length === 0) return;

  const pool = getDbPool();
  const placeholders = unique.map(() => "?").join(",");
  const [rows] = await pool.query<MediaRow[]>(
    `select id, entry_id, url, lightbox_url, thumb_url, original_path, width, height, alt, sort_order, created_at
     from portfolio_media
     where entry_id is null and id in (${placeholders})`,
    unique,
  );
  if (rows.length === 0) return;

  await pool.query(
    `delete from portfolio_media where entry_id is null and id in (${rows.map(() => "?").join(",")})`,
    rows.map((row) => row.id),
  );
  await removeMediaFiles(rows);
}

export async function cleanupOrphanMedia() {
  const pool = getDbPool();
  const [rows] = await pool.query<MediaRow[]>(
    `select id, entry_id, url, lightbox_url, thumb_url, original_path, width, height, alt, sort_order, created_at
     from portfolio_media
     where entry_id is null and created_at < (now(3) - interval 1 day)
     limit 40`,
  );
  if (rows.length === 0) return;
  await pool.query(
    `delete from portfolio_media where entry_id is null and id in (${rows.map(() => "?").join(",")})`,
    rows.map((row) => row.id),
  );
  await removeMediaFiles(rows);
}
