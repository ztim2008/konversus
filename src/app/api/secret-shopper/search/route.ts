import { NextRequest, NextResponse } from "next/server";
import { searchAllSources } from "@/lib/lead-sources";
import { createProgress, updateProgress, deleteProgress } from "@/lib/scan-progress";

export async function POST(req: NextRequest) {
  const { city, niche, radarId } = await req.json();

  if (!city || !niche) {
    return NextResponse.json({ error: "city and niche required" }, { status: 400 });
  }

  const scanId = radarId || `scan_${Date.now()}`;

  // Создаём прогресс
  createProgress(scanId);

  try {
    // Запускаем поиск с обоих источников
    const { leads, errors } = await searchAllSources(city, niche, scanId);

    // Обновляем прогресс — аудит
    updateProgress(scanId, {
      stage: "audit",
      total: leads.length,
      current: 0,
      message: `Аудит ${leads.length} сайтов...`,
    });

    // Формируем результат для клиента
    const sites = leads.map(l => ({
      domain: l.domain,
      name: l.name,
      url: l.url,
      source: l.source,
      phone: l.phone,
      email: l.email,
      telegram: l.telegram,
      whatsapp: l.whatsapp,
      vk: l.vk,
      address: l.address,
      schedule: l.schedule,
      description: l.description,
    }));

    // Обновляем прогресс — готово
    updateProgress(scanId, {
      stage: "done",
      current: leads.length,
      total: leads.length,
      message: `Найдено ${leads.length} лидов`,
      sites,
    });

    return NextResponse.json({
      sites,
      count: sites.length,
      scanId,
      sources: {
        twogis: leads.filter(l => l.source === "2gis" || l.source === "both" || l.source === "multi").length,
        google: leads.filter(l => l.source === "google" || l.source === "both" || l.source === "multi").length,
        yandex: leads.filter(l => l.source === "yandex" || l.source === "multi").length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    updateProgress(scanId, {
      stage: "error",
      error: err.message,
      message: `Ошибка: ${err.message}`,
    });

    return NextResponse.json({ error: err.message, scanId }, { status: 500 });
  }
}
