import { NextRequest, NextResponse } from "next/server";
import { runAutoSendDrip } from "@/lib/lead-radar/auto-send";

export const maxDuration = 120;

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
 * POST /api/lead-radar/auto-send
 * Капля автоотправки (1 письмо по умолчанию).
 * Auth: Bearer LEAD_RADAR_CRON_SECRET
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
    const result = await runAutoSendDrip({
      perRun: typeof body.perRun === "number" ? body.perRun : 1,
      force: !!body.force,
      skipTelegram: !!body.skipTelegram,
      ignoreWindow: !!body.ignoreWindow,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[auto-send]", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "auto-send failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const perRun = Number(req.nextUrl.searchParams.get("perRun") || "1");
  const force = req.nextUrl.searchParams.get("force") === "1";
  const ignoreWindow = req.nextUrl.searchParams.get("ignoreWindow") === "1";
  const skipTelegram = req.nextUrl.searchParams.get("skipTelegram") === "1";
  try {
    const result = await runAutoSendDrip({
      perRun: Number.isFinite(perRun) ? perRun : 1,
      force,
      ignoreWindow,
      skipTelegram,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "auto-send failed" },
      { status: 500 }
    );
  }
}
