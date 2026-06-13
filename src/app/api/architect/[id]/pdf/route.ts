import { NextRequest, NextResponse } from "next/server";
import { getArchitectProject } from "@/lib/data/architect";

const CORS = {
  "Access-Control-Allow-Origin": "*",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await getArchitectProject(id);
  if (!project || project.status !== "done") {
    return NextResponse.json(
      { error: "Анализ не завершён или не найден" },
      { status: 404, headers: CORS }
    );
  }

  let browser;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Рендерим print-страницу на том же сервере
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    await page.goto(`${baseUrl}/architect/${id}/print`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    const safeUrl = project.url
      .replace(/^https?:\/\//, "")
      .replace(/[^a-z0-9._-]/gi, "_")
      .slice(0, 50);
    const filename = `architect-${safeUrl}.pdf`;

    return new NextResponse(Buffer.from(pdf) as unknown as BodyInit, {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[pdf-route]", err);
    return NextResponse.json(
      { error: "Не удалось сгенерировать PDF. Попробуйте позже." },
      { status: 500, headers: CORS }
    );
  } finally {
    if (browser) await browser.close();
  }
}
