import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

import { getAllSettings } from "@/lib/data/settings";
import {
  countTodayProjectsByIp,
  countGlobalRecentProjects,
  createArchitectProject,
  findRecentProjectByUrl,
} from "@/lib/data/architect";
import { detectSourceType, validateUrl } from "@/lib/architect/url-detector";
import { runArchitectPipeline } from "@/lib/architect/pipeline";

// Открытый CORS — виджет работает с любого домена
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: unknown; force?: boolean };
    const rawUrl =
      typeof body.url === "string" ? body.url.trim() : "";

    if (!rawUrl || !validateUrl(rawUrl)) {
      return NextResponse.json(
        { error: "Укажите корректный URL (https://...)" },
        { status: 400, headers: CORS }
      );
    }

    const s = await getAllSettings();

    // Проверяем API ключ
    const apiKey = s.openrouter_api_key;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI Architect временно недоступен" },
        { status: 503, headers: CORS }
      );
    }

    // Глобальный rate limit — защита от перегрузки
    const globalPerMin = parseInt(s.architect_global_per_minute || "20", 10);
    const globalCount = await countGlobalRecentProjects(1);
    if (globalCount >= globalPerMin) {
      return NextResponse.json(
        { error: "Сервис перегружен. Попробуйте через минуту." },
        { status: 429, headers: CORS }
      );
    }

    // Rate limit по IP
    const ip =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const ipHash = createHash("sha256").update(ip).digest("hex");
    const dailyLimit = parseInt(s.architect_daily_limit || "10", 10);
    const todayCount = await countTodayProjectsByIp(ipHash);

    if (todayCount >= dailyLimit) {
      return NextResponse.json(
        {
          error: `Лимит анализов на сегодня исчерпан (${dailyLimit}/день). Попробуйте завтра.`,
        },
        { status: 429, headers: CORS }
      );
    }

    const source_type = detectSourceType(rawUrl);

    if (source_type === "ozon" || source_type === "wb") {
      return NextResponse.json(
        {
          error: `Анализ ${source_type === "ozon" ? "Ozon" : "Wildberries"} временно недоступен — эти площадки блокируют автоматические запросы. Попробуйте указать ссылку на ваш собственный сайт или профиль на Авито.`,
        },
        { status: 422, headers: CORS }
      );
    }

    // Дедупликация: если за последние 12 часов уже есть готовый анализ для этого URL — отдаём его
    // (можно обойти передав force=true)
    if (!body.force) {
      const recent = await findRecentProjectByUrl(rawUrl, 12);
      if (recent) {
        return NextResponse.json(
          {
            id: recent.id,
            redirect_url: `https://konversus.ru/architect/${recent.id}`,
            cached: true,
          },
          { status: 200, headers: CORS }
        );
      }
    }

    const id = await createArchitectProject({
      url: rawUrl,
      source_type,
      ip_hash: ipHash,
    });

    // Запускаем pipeline без await — пользователь сразу получает id
    void runArchitectPipeline({
      id,
      url: rawUrl,
      source_type,
      fastModel: s.architect_fast_model || "google/gemini-flash-1.5",
      strongModel: s.architect_strong_model || "anthropic/claude-3.5-sonnet",
      apiKey,
      avitoClientId: s.avito_client_id || undefined,
      avitoClientSecret: s.avito_client_secret || undefined,
      pagespeedApiKey: s.pagespeed_api_key || undefined,
    });

    return NextResponse.json(
      {
        id,
        redirect_url: `https://konversus.ru/architect/${id}`,
      },
      { status: 201, headers: CORS }
    );
  } catch (err) {
    console.error("[architect/analyze]", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500, headers: CORS }
    );
  }
}
