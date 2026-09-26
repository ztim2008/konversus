import { NextRequest, NextResponse } from "next/server";
import { generatePersonalizedKP } from "@/lib/lead-agent/ai-composer";
import {
  buildKpSubject,
  renderLeadWebKpHtml,
} from "@/lib/lead-agent/kp-html-template";
import { updateSiteKp } from "@/lib/data/lead-radar";
import { findCityByName } from "@/lib/lead-radar-geo";
import {
  buildKpFallbackBody,
  getActiveSenderProfile,
} from "@/lib/lead-radar/sender-profiles";

/**
 * POST — генерация КП (текст AI + HTML со скрином) под активный профиль.
 * { domain, issues?, niche?, city?, contactName?, cms?, platform?,
 *   screenshotUrl?, leadId?, companyName?, siteId?, save? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const domain = String(body.domain || "").trim();
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });

  const platform = body.platform || body.cms || "";
  const city = body.city || "";
  const geo = city ? findCityByName(city) : undefined;
  const companyName = body.companyName || domain;
  const issues: string[] = Array.isArray(body.issues) ? body.issues : [];
  const leadId = body.leadId || body.siteId || null;
  const batchDate = body.batchDate || new Date().toISOString().slice(0, 10);
  const profile = await getActiveSenderProfile();

  try {
    const generated = await generatePersonalizedKP({
      domain,
      niche: body.niche || "бизнес",
      cms: platform,
      city,
      issues,
      contactName: body.contactName || "",
      travel: geo?.travel,
    });

    const subject =
      body.subject ||
      buildKpSubject(companyName, domain) ||
      generated.subject;

    const html = renderLeadWebKpHtml({
      companyName,
      domain,
      platform,
      city,
      bodyText: generated.bodyText,
      screenshotUrl: body.screenshotUrl || null,
      leadId,
      batchDate,
      issues,
      profile,
    });

    if (body.save && body.siteId) {
      await updateSiteKp({
        siteId: String(body.siteId),
        kpHtml: html,
        kpSubject: subject,
        tokensIn: generated.tokensIn,
        tokensOut: generated.tokensOut,
      });
    }

    const ctaUrl = new URL(profile.primarySiteUrl);
    ctaUrl.searchParams.set("utm_source", "radar");
    ctaUrl.searchParams.set("utm_medium", "email");
    ctaUrl.searchParams.set("utm_campaign", `batch_${batchDate}`);
    if (leadId) ctaUrl.searchParams.set("lead", String(leadId));

    return NextResponse.json({
      ok: true,
      source: generated.source,
      subject,
      kp: generated.bodyText,
      html,
      cta: ctaUrl.toString(),
      profileId: profile.id,
      tokensIn: generated.tokensIn,
      tokensOut: generated.tokensOut,
      model: generated.model,
      platform,
    });
  } catch (err: any) {
    console.error("[generate-kp]", err?.message || err);
    const fallbackText = buildKpFallbackBody(profile, {
      domain,
      city,
      cms: platform,
      issues,
    });
    const html = renderLeadWebKpHtml({
      companyName,
      domain,
      platform,
      city,
      bodyText: fallbackText,
      screenshotUrl: body.screenshotUrl || null,
      leadId,
      batchDate,
      issues,
      profile,
    });
    return NextResponse.json({
      ok: true,
      source: "fallback",
      subject: buildKpSubject(companyName, domain),
      kp: fallbackText,
      html,
      profileId: profile.id,
      error: err?.message,
    });
  }
}
