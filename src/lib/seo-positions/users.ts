import "server-only";

import { createHmac, randomBytes, randomInt, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/lib/auth/session";
import { getDbPool } from "@/lib/db";
import { getAdminAuthEnv } from "@/lib/env";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const COOKIE = "seo_session";
export const PASSWORD_FLASH_COOKIE = "seo_pw_flash";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export type SeoUser = {
  id: string;
  login: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  projectIds: string[];
};

export type Viewer =
  | { role: "admin"; label: string }
  | { role: "marketer"; label: string; userId: string; projectIds: string[] };

type UserRow = RowDataPacket & {
  id: string;
  login: string;
  name: string;
  password_hash: string;
  session_version: number;
  is_active: number;
  created_at: Date;
  last_login_at: Date | null;
};

// ---------- пароли ----------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, saltB64, hashB64] = stored.split("$");
  if (kind !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  return out;
}

export function normalizeLogin(value: string): string | null {
  const login = value.trim().toLowerCase();
  return /^[a-z0-9._-]{3,64}$/.test(login) ? login : null;
}

// ---------- сессия маркетолога ----------

function sign(value: string) {
  return createHmac("sha256", `seo-users:${getAdminAuthEnv().authSecret}`).update(value).digest("base64url");
}

function encode(payload: { uid: string; v: number; exp: number }) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string): { uid: string; v: number; exp: number } | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload.uid !== "string" || typeof payload.v !== "number" || payload.exp <= Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

async function getMarketer(): Promise<Viewer | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const payload = decode(token);
  if (!payload) return null;
  const [rows] = await getDbPool().query<UserRow[]>("select * from seo_users where id = ?", [payload.uid]);
  const user = rows[0];
  if (!user || !user.is_active || user.session_version !== payload.v) return null;
  return {
    role: "marketer",
    label: user.name || user.login,
    userId: user.id,
    projectIds: await listUserProjectIds(user.id),
  };
}

export async function getViewer(): Promise<Viewer | null> {
  const admin = await getCurrentAdmin();
  if (admin) return { role: "admin", label: admin.email };
  return getMarketer();
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/positions/login");
  return viewer;
}

export function canAccessProject(viewer: Viewer, projectId: string) {
  return viewer.role === "admin" || viewer.projectIds.includes(projectId);
}

// Подбор пароля: не больше 5 неудачных попыток на логин за 15 минут. Память процесса — достаточно для одного pm2.
const failures = new Map<string, { count: number; until: number }>();

export function isLoginLocked(login: string) {
  const f = failures.get(login);
  return !!f && f.count >= 5 && f.until > Date.now();
}

function registerFailure(login: string) {
  const now = Date.now();
  const f = failures.get(login);
  const fresh = !f || f.until < now;
  failures.set(login, { count: fresh ? 1 : f.count + 1, until: now + 15 * 60_000 });
}

export async function loginMarketer(loginInput: string, password: string): Promise<"ok" | "invalid" | "locked"> {
  const login = normalizeLogin(loginInput);
  if (!login) return "invalid";
  if (isLoginLocked(login)) return "locked";

  const [rows] = await getDbPool().query<UserRow[]>("select * from seo_users where login = ?", [login]);
  const user = rows[0];
  const ok = user ? await verifyPassword(password, user.password_hash) : await verifyPassword(password, await hashPassword("x"));
  if (!user || !ok || !user.is_active) {
    registerFailure(login);
    return "invalid";
  }
  failures.delete(login);

  await getDbPool().execute("update seo_users set last_login_at = now(3) where id = ?", [user.id]);
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  (await cookies()).set(COOKIE, encode({ uid: user.id, v: user.session_version, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp * 1000),
  });
  return "ok";
}

export async function logoutMarketer() {
  (await cookies()).delete(COOKIE);
}

// ---------- управление (только админ) ----------

async function listUserProjectIds(userId: string): Promise<string[]> {
  const [rows] = await getDbPool().query<(RowDataPacket & { project_id: string })[]>(
    "select project_id from seo_user_projects where user_id = ?",
    [userId]
  );
  return rows.map((r) => r.project_id);
}

export async function listUsers(): Promise<SeoUser[]> {
  const [rows] = await getDbPool().query<UserRow[]>("select * from seo_users order by created_at");
  const [links] = await getDbPool().query<(RowDataPacket & { user_id: string; project_id: string })[]>(
    "select user_id, project_id from seo_user_projects"
  );
  return rows.map((r) => ({
    id: r.id,
    login: r.login,
    name: r.name,
    isActive: !!r.is_active,
    createdAt: new Date(r.created_at).toISOString(),
    lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
    projectIds: links.filter((l) => l.user_id === r.id).map((l) => l.project_id),
  }));
}

export async function createUser(login: string, name: string, password: string): Promise<string | null> {
  const id = randomUUID();
  const [res] = await getDbPool().execute<ResultSetHeader>(
    `insert ignore into seo_users (id, login, name, password_hash, session_version, is_active, created_at)
     values (?, ?, ?, ?, 1, 1, now(3))`,
    [id, login, name, await hashPassword(password)]
  );
  return res.affectedRows === 1 ? id : null;
}

export async function setUserProjects(userId: string, projectIds: string[]) {
  const conn = await getDbPool().getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("delete from seo_user_projects where user_id = ?", [userId]);
    for (const projectId of new Set(projectIds)) {
      await conn.execute(
        "insert into seo_user_projects (user_id, project_id) select ?, id from seo_projects where id = ?",
        [userId, projectId]
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

export async function resetUserPassword(userId: string, password: string) {
  await getDbPool().execute(
    "update seo_users set password_hash = ?, session_version = session_version + 1 where id = ?",
    [await hashPassword(password), userId]
  );
}

export async function setUserActive(userId: string, active: boolean) {
  await getDbPool().execute(
    "update seo_users set is_active = ?, session_version = session_version + 1 where id = ?",
    [active ? 1 : 0, userId]
  );
}

export async function deleteUser(userId: string) {
  await getDbPool().execute("delete from seo_users where id = ?", [userId]);
}
