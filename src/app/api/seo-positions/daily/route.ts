import { NextRequest, NextResponse } from "next/server";

import { runDailyChecks } from "@/lib/seo-positions/check";

export const maxDuration = 900;

function authorize(req: NextRequest): boolean {
  const secret = process.env.LEAD_RADAR_CRON_SECRET || process.env.CRON_SECRET || "";
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

/**
 * POST /api/seo-positions/daily — суточная проверка позиций всех активных проектов.
 * Auth: Bearer LEAD_RADAR_CRON_SECRET. Потолок кредитов: SEO_POSITIONS_DAILY_CREDIT_CAP.
 */
export async function POST(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await runDailyChecks()) });
  } catch (err) {
    console.error("[seo-positions/daily]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
