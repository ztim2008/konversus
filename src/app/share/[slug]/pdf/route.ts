import { NextRequest } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createFileName(slug: string) {
  const safeSlug = slug.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "concept";
  return `konversus-${safeSlug}.pdf`;
}

function getInternalOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "127.0.0.1:3010";
  const isLocalHost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = isLocalHost ? "http" : forwardedProto || "https";

  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const origin = getInternalOrigin(request);
  const pageUrl = new URL(`/share/${slug}`, origin);
  pageUrl.searchParams.set("pdf", "1");

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1 });
    await page.goto(pageUrl.toString(), { waitUntil: "networkidle", timeout: 45000 });
    await page.emulateMedia({ media: "print" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;

    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${createFileName(slug)}"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await browser.close();
  }
}
