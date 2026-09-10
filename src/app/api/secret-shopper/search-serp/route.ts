import { NextRequest, NextResponse } from "next/server";
import {
  buildCompanySerpQuery,
  extractDomain,
  searchSerperOrganic,
} from "@/lib/serper-client";
import {
  classifyCompanySite,
  guessCompanyName,
} from "@/lib/company-site-filter";
import { findCityByName } from "@/lib/lead-radar-geo";

export type SerpLead = {
  domain: string;
  name: string;
  url: string;
  source: "serp";
  serp_query: string;
  serp_position: number;
  title: string;
  snippet?: string;
};

/**
 * POST { city, niche, num? }
 * Органика Serper → фильтр компаний → дедуп по domain.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const city = String(body.city || "").trim();
    const niche = String(body.niche || "").trim();
    const num = Number(body.num) || 20;

    if (!city || !niche) {
      return NextResponse.json({ error: "city and niche required" }, { status: 400 });
    }

    const geo = findCityByName(city);
    const query = buildCompanySerpQuery(niche, city);
    const raw = await searchSerperOrganic({ query, num: Math.min(num, 30) });

    const rejected: Array<{ url: string; reason: string; title: string }> = [];
    const byDomain = new Map<string, SerpLead>();

    for (const item of raw.organic) {
      const domain = extractDomain(item.link);
      const verdict = classifyCompanySite({
        url: item.link,
        title: item.title,
        snippet: item.snippet,
        domain,
      });

      if (!verdict.ok) {
        rejected.push({
          url: item.link,
          title: item.title,
          reason: verdict.reason,
        });
        continue;
      }

      if (!domain || byDomain.has(domain)) continue;

      byDomain.set(domain, {
        domain,
        name: guessCompanyName(item.title, domain),
        url: item.link.startsWith("http") ? item.link : `https://${item.link}`,
        source: "serp",
        serp_query: query,
        serp_position: item.position,
        title: item.title,
        snippet: item.snippet,
      });
    }

    const sites = Array.from(byDomain.values());

    return NextResponse.json({
      ok: true,
      provider: "serper",
      query,
      city,
      niche,
      geoCityId: geo?.id ?? null,
      travel: geo?.travel ?? false,
      count: sites.length,
      sites,
      rejectedCount: rejected.length,
      rejected: rejected.slice(0, 30),
      credits: raw.credits,
    });
  } catch (err: any) {
    console.error("[search-serp]", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "search-serp failed" },
      { status: 500 }
    );
  }
}
