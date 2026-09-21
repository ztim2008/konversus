import { NextRequest, NextResponse } from "next/server";
import { runLeadRadarCollect } from "@/lib/lead-radar/nightly-run";

/** Самохост: капля сбора (1 ниша × N КП). Cron бьёт в :3010. */
export const maxDuration = 900;

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
 * POST /api/lead-radar/nightly-run
 * Auth: Bearer LEAD_RADAR_CRON_SECRET | ?secret= | x-cron-secret
 * Body: { city, niche, vertical, limit, maxRounds, skipTelegram, skipScreenshot, dryRun }
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
    const result = await runLeadRadarCollect({
      city: typeof body.city === "string" ? body.city : undefined,
      niche: typeof body.niche === "string" ? body.niche : undefined,
      vertical: typeof body.vertical === "string" ? body.vertical : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
      maxRounds: typeof body.maxRounds === "number" ? body.maxRounds : undefined,
      skipTelegram: !!body.skipTelegram,
      skipScreenshot: !!body.skipScreenshot,
      dryRun: !!body.dryRun,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[nightly-run]", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "nightly-run failed" },
      { status: 500 }
    );
  }
}

/** GET — удобный вызов из cron wget/curl */
export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const city = req.nextUrl.searchParams.get("city") || undefined;
    const niche = req.nextUrl.searchParams.get("niche") || undefined;
    const vertical = req.nextUrl.searchParams.get("vertical") || undefined;
    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
    const skipTelegram = req.nextUrl.searchParams.get("skipTelegram") === "1";
    const maxRoundsRaw = req.nextUrl.searchParams.get("maxRounds");
    const maxRounds = maxRoundsRaw ? Number(maxRoundsRaw) : undefined;
    const result = await runLeadRadarCollect({
      city,
      niche,
      vertical,
      dryRun,
      skipTelegram,
      maxRounds: Number.isFinite(maxRounds) ? maxRounds : undefined,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "nightly-run failed" },
      { status: 500 }
    );
  }
}
