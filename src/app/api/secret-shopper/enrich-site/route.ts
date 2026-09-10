import { NextRequest, NextResponse } from "next/server";
import { checkWebsite, scoreToGrade, scoreToPercent } from "@/lib/website-checker";
import { findDeepEmail } from "@/lib/deep-email";
import { captureSiteScreenshot } from "@/lib/site-screenshot";
import {
  updateSiteScreenshot,
  updateSiteStatus,
} from "@/lib/data/lead-radar";
import { getDbPool } from "@/lib/db";

/**
 * Полный проход этапа 3 по одному сайту:
 * audit (+ privacy) → deep email → screenshot → platform=cms
 *
 * POST { url, name?, siteId?, skipScreenshot? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = String(body.url || "").trim();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    const siteId = body.siteId ? String(body.siteId) : null;
    const skipScreenshot = !!body.skipScreenshot;

    const audit = await checkWebsite(url);
    const platform = audit.cms;
    const grade = scoreToGrade(audit.score);

    const emailInfo = await findDeepEmail(url);

    let screenshot: { ok: boolean; path?: string; url?: string; error?: string } = {
      ok: false,
      error: "skipped",
    };
    if (!skipScreenshot) {
      screenshot = await captureSiteScreenshot({
        pageUrl: url,
        siteId: siteId || undefined,
      });
    }

    // статусы по ТЗ
    let statusHint: string | null = null;
    if (!emailInfo.email) statusHint = "skipped_no_email";
    else if (!skipScreenshot && !screenshot.ok) statusHint = "skipped_no_screenshot";

    if (siteId) {
      const db = getDbPool();
      await db.query(
        `UPDATE lead_radar_sites SET
           platform = ?,
           email = COALESCE(?, email),
           email_source_url = ?,
           problems = ?,
           privacy_issues = ?,
           hot_score = ?,
           score = ?,
           h1_text = ?,
           status = CASE
             WHEN ? IS NOT NULL THEN ?
             ELSE status
           END
         WHERE id = ?`,
        [
          platform,
          emailInfo.email,
          emailInfo.sourceUrl,
          JSON.stringify(audit.issues),
          JSON.stringify(audit.privacyIssues),
          audit.hotScore,
          audit.score,
          audit.h1.texts[0] || null,
          statusHint,
          statusHint,
          siteId,
        ]
      );
      if (screenshot.ok && screenshot.path && screenshot.url) {
        await updateSiteScreenshot({
          siteId,
          path: screenshot.path,
          url: screenshot.url,
        });
      }
      if (statusHint) {
        await updateSiteStatus(siteId, statusHint);
      }
    }

    return NextResponse.json({
      ok: true,
      url,
      platform,
      audit: {
        reachable: audit.reachable,
        ssl: audit.ssl,
        issues: audit.issues,
        privacyIssues: audit.privacyIssues,
        score: audit.score,
        hotScore: audit.hotScore,
        grade: grade.grade,
        gradeLabel: grade.label,
        scorePercent: scoreToPercent(audit.score),
        cms: audit.cms,
        cmsTier: audit.cmsTier,
        h1: audit.h1,
        hasTitle: audit.hasTitle,
        hasDescription: audit.hasDescription,
        contactName: audit.contactName,
      },
      email: emailInfo.email,
      emailSourceUrl: emailInfo.sourceUrl,
      emailCandidates: emailInfo.candidates,
      pagesScanned: emailInfo.pagesScanned,
      screenshot,
      statusHint,
      queueReady: !!(emailInfo.email && (skipScreenshot || screenshot.ok)),
    });
  } catch (err: any) {
    console.error("[enrich-site]", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "enrich-site failed" },
      { status: 500 }
    );
  }
}
