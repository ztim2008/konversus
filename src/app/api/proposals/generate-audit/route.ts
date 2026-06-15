import { NextResponse } from "next/server";
import { generateAuditBlocks } from "@/lib/ai/audit-generator";
import { requireCurrentAdmin } from "@/lib/auth/session";
import { getAllSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Проверка авторизации
    await requireCurrentAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const s = await getAllSettings();
  const apiKey = s.openrouter_api_key ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY не настроен на сервере" },
      { status: 500 }
    );
  }

  let body: { sourceUrl?: string; extraContext?: string; model?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const { sourceUrl, extraContext, model } = body;

  if (!sourceUrl || typeof sourceUrl !== "string") {
    return NextResponse.json(
      { error: "Поле sourceUrl обязательно" },
      { status: 400 }
    );
  }

  // Простая валидация URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return NextResponse.json({ error: "Некорректный URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json(
      { error: "Допускаются только http/https URL" },
      { status: 400 }
    );
  }

  try {
    const result = await generateAuditBlocks({
      sourceUrl,
      extraContext: extraContext ?? undefined,
      apiKey,
      model: model ?? undefined,
    });

    return NextResponse.json({
      blocks: result.blocks,
      usage: result.usage,
      model: result.model,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
