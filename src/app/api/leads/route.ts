import { NextRequest, NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth/session";
import { createLead, updateLead } from "@/lib/data/leads";
import { getAllSettings } from "@/lib/data/settings";
import { detectSourceType, validateUrl } from "@/lib/architect/url-detector";
import { createArchitectProject } from "@/lib/data/architect";
import { runArchitectPipeline } from "@/lib/architect/pipeline";
import { sendLeadToTelegram } from "@/lib/lead-hunter/telegram";

export async function POST(req: NextRequest) {
  try {
    await requireCurrentAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string; company_name?: string; phone?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawUrl = body.url?.trim() ?? "";
  if (!rawUrl || !validateUrl(rawUrl)) {
    return NextResponse.json({ error: "Укажите корректный URL" }, { status: 400 });
  }

  const s = await getAllSettings();
  const apiKey = s.openrouter_api_key;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenRouter API key не настроен" }, { status: 500 });
  }

  try {
    // 1. Создаём лид
    const leadId = await createLead({
      url: rawUrl,
      company_name: body.company_name?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      email: body.email?.trim() || undefined,
      source: "manual",
    });

    // 2. Запускаем Architect анализ
    const source_type = detectSourceType(rawUrl);
    const architectId = await createArchitectProject({
      url: rawUrl,
      source_type,
      ip_hash: "lead_hunter",
    });

    await updateLead(leadId, { architect_id: architectId });

    // 3. Pipeline без await — сразу возвращаем ответ
    void runLeadPipeline({
      leadId,
      architectId,
      url: rawUrl,
      source_type,
      s,
      apiKey,
    });

    return NextResponse.json({ id: leadId, architect_id: architectId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[api/leads] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function runLeadPipeline(params: {
  leadId: string;
  architectId: string;
  url: string;
  source_type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s: Record<string, string>;
  apiKey: string;
}) {
  const { leadId, architectId, url, source_type, s, apiKey } = params;

  try {
    await runArchitectPipeline({
      id: architectId,
      url,
      source_type: source_type as Parameters<typeof runArchitectPipeline>[0]["source_type"],
      fastModel: s.architect_fast_model || "google/gemini-2.5-flash-lite",
      strongModel: s.architect_strong_model || "google/gemini-2.5-flash",
      apiKey,
      avitoClientId: s.avito_client_id || undefined,
      avitoClientSecret: s.avito_client_secret || undefined,
      skipNotify: true, // Lead Hunter сам отправит уведомление после обогащения данных
    });

    // Читаем результат из БД для обогащения лида
    const { getArchitectProject } = await import("@/lib/data/architect");
    const project = await getArchitectProject(architectId);
    const report = project?.result_json;
    const snapshot = project?.snapshot_json;

    const siteScore = report
      ? Math.round(
          ((report.growth_potential_pct ?? 50) <= 25
            ? 8
            : report.growth_potential_pct <= 40
            ? 6
            : report.growth_potential_pct <= 60
            ? 4
            : 2)
        )
      : null;

    const priority =
      (report?.growth_potential_pct ?? 0) >= 55
        ? "high"
        : (report?.growth_potential_pct ?? 0) >= 35
        ? "medium"
        : "low";

    // Обновляем лид
    await updateLead(leadId, {
      status: "analyzed",
      priority: priority as "high" | "medium" | "low",
      site_score: siteScore ?? undefined,
      company_name: report?.niche
        ? `[${report.niche}] ${new URL(url).hostname}`
        : new URL(url).hostname,
    });

    // Telegram уведомление
    const botToken = s.telegram_bot_token;
    const chatId = s.telegram_chat_id;
    if (botToken && chatId) {
      const problems = [
        ...(report?.revenue_leaks
          ?.filter((l) => l.status !== "present")
          .slice(0, 3)
          .map((l) => l.channel) ?? []),
        ...(snapshot?.seo_metrics?.checks
          ?.filter((c) => c.status === "fail")
          .slice(0, 2)
          .map((c) => c.label) ?? []),
      ];

      await sendLeadToTelegram({
        botToken,
        chatId,
        leadId,
        url,
        companyName: report?.niche
          ? `${report.niche} · ${new URL(url).hostname}`
          : new URL(url).hostname,
        siteScore,
        priority,
        problems,
        architectId,
      }).catch((e) => console.warn("[lead-hunter] telegram error:", e));
    }
  } catch (err) {
    console.error("[lead-hunter] pipeline error:", err);
  }
}
