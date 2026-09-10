import { NextRequest, NextResponse } from "next/server";
import { runDailyReport } from "@/lib/lead-radar/daily-report";

export const maxDuration = 60;

function authorize(req: NextRequest): boolean {
  const secret = process.env.LEAD_RADAR_CRON_SECRET || process.env.CRON_SECRET || "";
  if (!secret) {
    const host = req.headers.get("host") || "";
    return host.startsWith("127.0.0.1") || host.startsWith("localhost");
  }
  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const q = req.nextUrl.searchParams.get("secret") || "";
  const bodySecret = req.headers.get("x-cron-secret") || "";
  return bearer === secret || q === secret || bodySecret === secret;
}

/**
 * POST /api/lead-radar/daily-report
 * Auth: Bearer LEAD_RADAR_CRON_SECRET
 * Body optional: { batchDate, skipTelegram, force }
 */
export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const result = await runDailyReport({
      batchDate: typeof body.batchDate === "string" ? body.batchDate : undefined,
      skipTelegram: !!body.skipTelegram,
      force: !!body.force,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[daily-report]", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "daily-report failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const batchDate = req.nextUrl.searchParams.get("batchDate") || undefined;
    const skipTelegram = req.nextUrl.searchParams.get("skipTelegram") === "1";
    const force = req.nextUrl.searchParams.get("force") === "1";
    const result = await runDailyReport({ batchDate, skipTelegram, force });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "daily-report failed" },
      { status: 500 }
    );
  }
}
