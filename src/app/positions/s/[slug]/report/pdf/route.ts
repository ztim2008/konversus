import { NextRequest } from "next/server";
import { chromium } from "playwright";

import { getProjectBySlug } from "@/lib/seo-positions/data";
import { currentMonth, isMonth } from "@/lib/seo-positions/tz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return new Response("Not found", { status: 404 });

  const monthParam = request.nextUrl.searchParams.get("month") ?? undefined;
  const month = isMonth(monthParam) ? monthParam : currentMonth(project.gl);

  // Страница открывается только с локального сервера: адрес не зависит от заголовков запроса.
  const pageUrl = new URL(`http://127.0.0.1:${process.env.PORT || 3010}/positions/s/${slug}/report`);
  pageUrl.searchParams.set("month", month);
  pageUrl.searchParams.set("pdf", "1");

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 1 });
    await page.goto(pageUrl.toString(), { waitUntil: "networkidle", timeout: 45000 });
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "0", bottom: "12mm", left: "0" },
    });
    const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    const fileName = `positions-${project.domain.replace(/[^a-z0-9.-]/g, "")}-${month}.pdf`;
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await browser.close();
  }
}
