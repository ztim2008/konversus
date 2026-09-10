import { NextRequest, NextResponse } from "next/server";
import { markLeadReplied } from "@/lib/lead-radar/mark-replied";

export const maxDuration = 30;

/**
 * Публичный CTA-мост из письма:
 * клик → replied + TG → редирект на lead-web.pro?lead=…
 *
 * GET /api/lead-radar/interest?lead={uuid}
 */
export async function GET(req: NextRequest) {
  const lead = (req.nextUrl.searchParams.get("lead") || "").trim();
  const batchDate = req.nextUrl.searchParams.get("batch") || "";

  const dest = new URL("https://lead-web.pro/");
  dest.searchParams.set("utm_source", "radar");
  dest.searchParams.set("utm_medium", "email");
  dest.searchParams.set(
    "utm_campaign",
    `batch_${batchDate || new Date().toISOString().slice(0, 10)}`
  );
  if (lead) dest.searchParams.set("lead", lead);

  if (lead) {
    // fire-and-forget стиль: всё равно редиректим, даже если TG упал
    try {
      await markLeadReplied({ siteId: lead, source: "cta" });
    } catch (err) {
      console.error("[interest]", err);
    }
  }

  return NextResponse.redirect(dest.toString(), 302);
}
