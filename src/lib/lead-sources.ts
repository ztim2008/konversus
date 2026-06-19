import "server-only";
import { searchTwogis, extractLeadsFromItems, TWOGIS_CITY_IDS, type ExtractedLead } from "./twogis-client";
import { searchGoogle, type GoogleLead } from "./google-maps-client";
import { updateProgress, type ScanProgress } from "./scan-progress";

export interface CombinedLead {
  domain: string;
  name: string;
  url: string;
  source: "2gis" | "google" | "both";
  phone?: string;
  email?: string;
  website?: string;
  telegram?: string;
  whatsapp?: string;
  vk?: string;
  address?: string;
}

function normalizeDomain(domain: string): string {
  return domain.replace(/^www\./, "").toLowerCase().trim();
}

function deduplicateLeads(twogisLeads: ExtractedLead[], googleLeads: GoogleLead[]): CombinedLead[] {
  const map = new Map<string, CombinedLead>();

  // 2GIS — приоритет (больше данных)
  for (const lead of twogisLeads) {
    const domain = normalizeDomain(lead.domain);
    if (!map.has(domain)) {
      map.set(domain, {
        domain,
        name: lead.name,
        url: lead.url,
        source: "2gis",
        phone: lead.phone,
        email: lead.email,
        website: lead.website,
        telegram: lead.telegram,
        whatsapp: lead.whatsapp,
        vk: lead.vk,
        address: lead.address,
      });
    }
  }

  // Google — дополнение
  for (const lead of googleLeads) {
    const domain = normalizeDomain(lead.domain);
    const existing = map.get(domain);
    if (!existing) {
      map.set(domain, {
        domain,
        name: lead.name,
        url: lead.url,
        source: "google",
      });
    } else {
      // Помечаем что нашли в обоих источниках
      existing.source = "both";
      // Дополняем данные из Google если чего-то нет
      if (!existing.phone) existing.phone = lead.phone;
      if (!existing.email) existing.email = lead.email;
    }
  }

  return Array.from(map.values());
}

export async function searchAllSources(
  city: string,
  niche: string,
  radarId: string
): Promise<{ leads: CombinedLead[]; errors: string[] }> {
  const errors: string[] = [];
  const cityId = TWOGIS_CITY_IDS[city];

  // Обновляем прогресс — начинаем поиск
  updateProgress(radarId, {
    stage: "search",
    message: "Поиск лидов...",
    sources: {
      twogis: { status: "running", count: 0 },
      google: { status: "running", count: 0 },
    },
  });

  // Параллельный запуск обоих источников
  const [twogisResult, googleResult] = await Promise.allSettled([
    // 2GIS — быстрый API
    (async () => {
      if (!cityId) {
        throw new Error(`Город "${city}" не найден в 2GIS`);
      }
      const { items } = await searchTwogis(niche, cityId);
      const leads = extractLeadsFromItems(items);
      updateProgress(radarId, {
        sources: { twogis: { status: "done", count: leads.length }, google: { status: "running", count: 0 } },
      });
      return leads;
    })(),

    // Google — медленный Playwright, с таймаутом 30 сек
    (async () => {
      const leads = await searchGoogle(niche, city, (source, count) => {
        updateProgress(radarId, {
          sources: { twogis: { status: "done", count: 0 }, google: { status: "running", count } },
        });
      });
      updateProgress(radarId, {
        sources: { twogis: { status: "done", count: 0 }, google: { status: "done", count: leads.length } },
      });
      return leads;
    })(),
  ]);

  // Обрабатываем результаты
  let twogisLeads: ExtractedLead[] = [];
  let googleLeads: GoogleLead[] = [];

  if (twogisResult.status === "fulfilled") {
    twogisLeads = twogisResult.value;
  } else {
    errors.push(`2GIS: ${twogisResult.reason?.message || "неизвестная ошибка"}`);
    updateProgress(radarId, {
      sources: { twogis: { status: "error", count: 0, error: twogisResult.reason?.message }, google: { status: "running", count: 0 } },
    });
  }

  if (googleResult.status === "fulfilled") {
    googleLeads = googleResult.value;
  } else {
    errors.push(`Google Maps: ${googleResult.reason?.message || "неизвестная ошибка"}`);
    updateProgress(radarId, {
      sources: { twogis: { status: "done", count: 0 }, google: { status: "error", count: 0, error: googleResult.reason?.message } },
    });
  }

  // Если оба источника упали
  if (twogisLeads.length === 0 && googleLeads.length === 0) {
    throw new Error(`Не удалось найти лиды. Ошибки: ${errors.join("; ")}`);
  }

  // Объединяем и дедуплицируем
  const combined = deduplicateLeads(twogisLeads, googleLeads);

  return { leads: combined, errors };
}
