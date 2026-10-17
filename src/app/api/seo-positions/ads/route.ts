import { NextRequest, NextResponse } from "next/server";

import { findAdsToken, ingestAds } from "@/lib/seo-positions/ads";
import { parseAdsPayload } from "@/lib/seo-positions/ads-summary";

const MAX_BODY = 5_000_000;

/**
 * POST /api/seo-positions/ads — статистика Google Ads по дням от скрипта в аккаунте клиента.
 * Auth: Bearer <ключ проекта> со страницы «Реклама» проекта. Тело — см. src/lib/seo-positions/ads-script.ts.
 */
export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const link = await findAdsToken(token);
  if (!link) return NextResponse.json({ ok: false, error: "ключ не подходит — скачайте скрипт заново на странице «Реклама»" }, { status: 401 });
  if (link.source !== "google") return NextResponse.json({ ok: false, error: "ключ не для скрипта Google Ads" }, { status: 400 });

  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ ok: false, error: "слишком большой запрос" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "ожидается JSON" }, { status: 400 });
  }

  // Аккаунт может жить восточнее UTC: «вчера» по его часам бывает «сегодня» по UTC.
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  const payload = parseAdsPayload(body, tomorrow, "google");
  if (typeof payload === "string") return NextResponse.json({ ok: false, error: payload }, { status: 400 });

  try {
    await ingestAds(link.projectId, "google", payload);
  } catch (err) {
    console.error("[seo-positions/ads]", err);
    return NextResponse.json({ ok: false, error: "не удалось сохранить" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, rows: payload.rows.length, from: payload.from, to: payload.to });
}
