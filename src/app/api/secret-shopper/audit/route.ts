import { NextRequest, NextResponse } from "next/server";
import { checkWebsite, scoreToPercent, scoreToGrade } from "@/lib/website-checker";

export async function POST(req: NextRequest) {
  const { sites } = await req.json();
  if (!Array.isArray(sites)) return NextResponse.json({ error: "sites array required" }, { status: 400 });

  const results = [];

  for (const site of sites.slice(0, 15)) {
    try {
      const audit = await checkWebsite(`https://${site.domain}`);
      const grade = scoreToGrade(audit.score);

      results.push({
        domain: site.domain,
        name: site.name,
        url: site.url,
        audit: {
          reachable: audit.reachable,
          ssl: audit.ssl,
          hasViewport: audit.hasViewport,
          copyrightYear: audit.copyrightYear,
          responseTime: audit.responseTime,
          statusCode: audit.statusCode,
          issues: audit.issues,
          score: audit.score,
          grade: grade.grade,
          gradeLabel: grade.label,
          gradeColor: grade.color,
          scorePercent: scoreToPercent(audit.score),
          h1: audit.h1,
          cms: audit.cms,
          hotScore: audit.hotScore,
        },
      });
    } catch {
      results.push({ domain: site.domain, name: site.name, audit: { issues: ["ошибка проверки"], score: 10, scorePercent: 0 } });
    }

    await new Promise(r => setTimeout(r, 300));
  }

  return NextResponse.json({ results });
}
