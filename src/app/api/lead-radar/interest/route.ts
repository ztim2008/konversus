import { NextRequest, NextResponse } from "next/server";
import { markLeadReplied } from "@/lib/lead-radar/mark-replied";
import { getActiveSenderProfile } from "@/lib/lead-radar/sender-profiles";

export const maxDuration = 30;

/**
 * Публичный CTA-мост из письма:
 * клик → replied + TG → редирект на сайт активного профиля.
 *
 * GET /api/lead-radar/interest?lead={uuid}
 */
export async function GET(req: NextRequest) {
  const lead = (req.nextUrl.searchParams.get("lead") || "").trim();
  const batchDate = req.nextUrl.searchParams.get("batch") || "";

  const profile = await getActiveSenderProfile();
  const dest = new URL(profile.primarySiteUrl);
  dest.searchParams.set("utm_source", "radar");
  dest.searchParams.set("utm_medium", "email");
  dest.searchParams.set(
    "utm_campaign",
    `batch_${batchDate || new Date().toISOString().slice(0, 10)}`
  );
  if (lead) dest.searchParams.set("lead", lead);

  if (lead) {
    try {
      await markLeadReplied({ siteId: lead, source: "cta" });
    } catch (err) {
      console.error("[interest]", err);
    }
  }

  return NextResponse.redirect(dest.toString(), 302);
}
