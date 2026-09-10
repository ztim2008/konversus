import { NextRequest, NextResponse } from "next/server";
import { markLeadReplied } from "@/lib/lead-radar/mark-replied";

export const maxDuration = 30;

function authorizeWebhook(req: NextRequest): boolean {
  const secret =
    process.env.LEAD_RADAR_WEBHOOK_SECRET ||
    process.env.LEAD_RADAR_CRON_SECRET ||
    process.env.CRON_SECRET ||
    "";
  if (!secret) {
    // без секрета — только localhost (ручной тест)
    const host = req.headers.get("host") || "";
    return host.startsWith("127.0.0.1") || host.startsWith("localhost");
  }
  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const q = req.nextUrl.searchParams.get("secret") || "";
  const x = req.headers.get("x-cron-secret") || req.headers.get("x-webhook-secret") || "";
  return bearer === secret || q === secret || x === secret;
}

/**
 * Webhook интереса с lead-web.pro / n8n / формы.
 * POST JSON: { lead|leadId|siteId, source?, message? }
 * Auth: Bearer LEAD_RADAR_WEBHOOK_SECRET | ?secret=
 */
export async function POST(req: NextRequest) {
  if (!authorizeWebhook(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const siteId = String(
    body.lead || body.leadId || body.siteId || ""
  ).trim();
  if (!siteId) {
    return NextResponse.json({ error: "lead required" }, { status: 400 });
  }

  const sourceRaw = String(body.source || "webhook");
  const source =
    sourceRaw === "form" ||
    sourceRaw === "cta" ||
    sourceRaw === "email" ||
    sourceRaw === "manual"
      ? sourceRaw
      : "webhook";

  const result = await markLeadReplied({ siteId, source });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 500 }
    );
  }
  return NextResponse.json(result);
}

/** GET — удобный вызов из форм / n8n */
export async function GET(req: NextRequest) {
  if (!authorizeWebhook(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const siteId = (
    req.nextUrl.searchParams.get("lead") ||
    req.nextUrl.searchParams.get("leadId") ||
    req.nextUrl.searchParams.get("siteId") ||
    ""
  ).trim();
  if (!siteId) {
    return NextResponse.json({ error: "lead required" }, { status: 400 });
  }
  const sourceRaw = req.nextUrl.searchParams.get("source") || "webhook";
  const source =
    sourceRaw === "form" ||
    sourceRaw === "cta" ||
    sourceRaw === "email" ||
    sourceRaw === "manual"
      ? sourceRaw
      : "webhook";

  const result = await markLeadReplied({ siteId, source });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 500 }
    );
  }
  return NextResponse.json(result);
}
