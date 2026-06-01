"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { clearAdminSession, createAdminSession } from "@/lib/auth/session";
import { getAdminAuthEnv, hasAdminAuthEnv } from "@/lib/env";

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

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

// ── Простой rate limiter (в памяти) ──────────────────────────────────────────
// До 5 попыток с одного IP за 15 минут. Сброс после успешного входа.
const WINDOW_MS = 15 * 60 * 1000; // 15 минут
const MAX_ATTEMPTS = 5;

const failedAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(headersList: Awaited<ReturnType<typeof headers>>): string {
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): { blocked: boolean; remaining: number } {
  const now = Date.now();
  const record = failedAttempts.get(ip);

  if (!record || now > record.resetAt) {
    return { blocked: false, remaining: MAX_ATTEMPTS };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const mins = Math.ceil((record.resetAt - now) / 60_000);
    return { blocked: true, remaining: 0 };
  }

  return { blocked: false, remaining: MAX_ATTEMPTS - record.count };
}

function recordFailure(ip: string) {
  const now = Date.now();
  const record = failedAttempts.get(ip);

  if (!record || now > record.resetAt) {
    failedAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    record.count += 1;
  }
}

function clearFailures(ip: string) {
  failedAttempts.delete(ip);
}
// ─────────────────────────────────────────────────────────────────────────────

export async function signInAction(formData: FormData) {
  const headersList = await headers();
  const ip = getClientIp(headersList);

  const { blocked } = checkRateLimit(ip);
  if (blocked) {
    redirect(buildRedirect("/auth", { error: "Слишком много попыток. Попробуйте через 15 минут." }));
  }

  if (!hasAdminAuthEnv()) {
    redirect(buildRedirect("/auth", { error: "Конфигурация сервера не завершена." }));
  }

  const email = getStringValue(formData, "email");
  const password = getStringValue(formData, "password");

  if (!email || !password) {
    redirect(buildRedirect("/auth", { error: "Введите email и пароль." }));
  }

  const admin = getAdminAuthEnv();

  if (email !== admin.email || password !== admin.password) {
    recordFailure(ip);
    const { remaining } = checkRateLimit(ip);
    const hint = remaining > 0 ? ` Осталось попыток: ${remaining}.` : " Доступ временно заблокирован.";
    redirect(buildRedirect("/auth", { error: `Неверный email или пароль.${hint}` }));
  }

  clearFailures(ip);
  await createAdminSession(email);

  redirect("/dashboard");
}

export async function signOutAction() {
  await clearAdminSession();

  redirect(buildRedirect("/auth", { message: "Вы вышли из кабинета." }));
}