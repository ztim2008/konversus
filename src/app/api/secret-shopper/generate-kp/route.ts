import { NextRequest, NextResponse } from "next/server";
import { generatePersonalizedKP } from "@/lib/lead-agent/ai-composer";
import {
  buildKpSubject,
  renderLeadWebKpHtml,
} from "@/lib/lead-agent/kp-html-template";
import { updateSiteKp } from "@/lib/data/lead-radar";
import { findCityByName } from "@/lib/lead-radar-geo";

/**
 * POST — генерация КП lead-web.pro (текст AI + HTML со скрином).
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

    return NextResponse.json({
      ok: true,
      source: generated.source,
      subject,
      kp: generated.bodyText,
      html,
      cta: `https://lead-web.pro/?utm_source=radar&utm_medium=email&utm_campaign=batch_${batchDate}${leadId ? `&lead=${leadId}` : ""}`,
      tokensIn: generated.tokensIn,
      tokensOut: generated.tokensOut,
      model: generated.model,
      platform,
    });
  } catch (err: any) {
    console.error("[generate-kp]", err?.message || err);
    const fallbackText = `Здравствуйте!\n\nПосмотрели сайт ${domain}. Готовы коротко разобрать точки роста и заявки.\n\nКоманда lead-web.pro`;
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
    });
    return NextResponse.json({
      ok: true,
      source: "fallback",
      subject: buildKpSubject(companyName, domain),
      kp: fallbackText,
      html,
      error: err?.message,
    });
  }
}
