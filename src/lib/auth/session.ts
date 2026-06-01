import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminAuthEnv, hasAdminAuthEnv } from "@/lib/env";

const SESSION_COOKIE_NAME = "fpb_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type AdminSessionPayload = {
  email: string;
  exp: number;
};

export type CurrentAdmin = {
  email: string;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function createSignature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeSession(payload: AdminSessionPayload, secret: string) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

function decodeSession(token: string, secret: string): AdminSessionPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createSignature(encodedPayload, secret);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminSessionPayload;

    if (!payload.email || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentAdmin() {
  if (!hasAdminAuthEnv()) {
    return null;
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const { authSecret, email } = getAdminAuthEnv();
  const payload = decodeSession(sessionToken, authSecret);

  if (!payload || payload.email !== email) {
    return null;
  }

  return { email: payload.email } satisfies CurrentAdmin;
}

export async function createAdminSession(email: string) {
  const cookieStore = await cookies();
  const { authSecret } = getAdminAuthEnv();
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = encodeSession({ email, exp }, authSecret);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp * 1000),
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

function buildRedirect(path: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();

  return query ? `${path}?${query}` : path;
}

export async function requireCurrentAdmin() {
  const user = await getCurrentAdmin();

  if (!user) {
    redirect(buildRedirect("/auth", { error: "Сессия не найдена. Войдите, чтобы открыть кабинет." }));
  }

  return user;
}