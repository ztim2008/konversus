import { NextRequest, NextResponse } from "next/server";
import { markLeadCallClick } from "@/lib/lead-radar/mark-call-click";
import {
  DEFAULT_SENDER_PROFILE_ID,
  getActiveSenderProfile,
  getSenderProfileById,
} from "@/lib/lead-radar/sender-profiles";

export const maxDuration = 30;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Мост «Позвонить» из письма:
 * клик → call_clicked_at + TG → страница с доменом и tel:
 *
 * GET /api/lead-radar/call?lead={uuid}
 */
export async function GET(req: NextRequest) {
  const lead = (req.nextUrl.searchParams.get("lead") || "").trim();

  let profile;
  try {
    profile = await getActiveSenderProfile();
  } catch {
    profile = getSenderProfileById(DEFAULT_SENDER_PROFILE_ID);
  }

  let domain = "";
  let company = "";
  if (lead) {
    try {
      const result = await markLeadCallClick({ siteId: lead });
      if (result.ok) {
        domain = result.domain || "";
        company = result.name || result.domain || "";
      }
    } catch (err) {
      console.error("[call]", err);
    }
  }

  const telHref = `tel:${profile.phoneE164}`;
  const title = company || domain || "Звонок";
  const hintDomain = domain || "вашему сайту";

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Позвонить · ${escapeHtml(title)}</title>
  <style>
    body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f5f5f4;color:#1c1917;}
    .wrap{max-width:420px;margin:0 auto;padding:32px 20px;}
    .card{background:#fff;border:1px solid #e7e5e4;border-radius:8px;padding:28px 24px;}
    .label{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#78716c;margin:0 0 8px;}
    .domain{font-size:22px;font-weight:700;margin:0 0 6px;word-break:break-word;}
    .name{font-size:14px;color:#57534e;margin:0 0 20px;}
    .btn{display:block;text-align:center;background:#1c1917;color:#fafaf9;text-decoration:none;
      padding:16px 20px;font-size:18px;font-weight:700;border-radius:4px;}
    .hint{margin:18px 0 0;font-size:13px;line-height:1.5;color:#57534e;}
    .phone{margin-top:12px;font-size:15px;font-weight:700;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <p class="label">Звонок по письму</p>
      <p class="domain">${escapeHtml(domain ? domain : "—")}</p>
      ${company && company !== domain ? `<p class="name">${escapeHtml(company)}</p>` : ""}
      <a class="btn" href="${escapeHtml(telHref)}">Набрать ${escapeHtml(profile.phoneDisplay)}</a>
      <p class="phone">${escapeHtml(profile.fullName)}</p>
      <p class="hint">Можете сказать: «Звоню по сайту ${escapeHtml(hintDomain)}» — так быстрее поймём, о ком речь.</p>
    </div>
  </div>
  <script>
    (function(){
      var a=document.querySelector('.btn');
      if(a && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)){
        setTimeout(function(){ window.location.href=a.href; }, 400);
      }
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
