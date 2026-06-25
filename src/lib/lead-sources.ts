import "server-only";
import { searchTwogis, extractLeadsFromItems, TWOGIS_CITY_IDS, type ExtractedLead } from "./twogis-client";
import { searchGoogle, type GoogleLead } from "./google-maps-client";
import { searchYandex, type YandexLead } from "./yandex-maps-client";
import { updateProgress } from "./scan-progress";

export interface CombinedLead {
  domain: string;
  name: string;
  url: string;
  source: "2gis" | "google" | "yandex" | "both" | "multi";
  phone?: string;
  email?: string;
  website?: string;
  telegram?: string;
  whatsapp?: string;
  vk?: string;
  address?: string;
  schedule?: string;
  description?: string;
}

function normalizeDomain(domain: string): string {
  return domain.replace(/^www\./, "").toLowerCase().trim();
}

function deduplicateLeads(
  twogisLeads: ExtractedLead[],
  googleLeads: GoogleLead[],
  yandexLeads: YandexLead[]
): CombinedLead[] {
  const map = new Map<string, CombinedLead>();

  // 2GIS — приоритет (больше данных)
  for (const lead of twogisLeads) {
    const domain = normalizeDomain(lead.domain);
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
      schedule: (lead as any).schedule,
      description: (lead as any).description,
    });
  }

  // Google + Yandex — дополнение
  const addFromWeb = (lead: GoogleLead | YandexLead, src: string) => {
    const domain = normalizeDomain(lead.domain);
    const existing = map.get(domain);
    if (!existing) {
      map.set(domain, {
        domain, name: lead.name, url: lead.url,
        source: src as any,
        phone: (lead as any).phone,
        email: (lead as any).email,
      });
    } else {
      existing.source = existing.source === "2gis" ? "both" : "multi";
      if (!existing.phone) existing.phone = (lead as any).phone;
      if (!existing.email) existing.email = (lead as any).email;
    }
  };

  for (const lead of googleLeads) addFromWeb(lead, "google");
  for (const lead of yandexLeads) addFromWeb(lead, "yandex");

  return Array.from(map.values());
}

export async function searchAllSources(
  city: string,
  niche: string,
  radarId: string
): Promise<{ leads: CombinedLead[]; errors: string[] }> {
  const errors: string[] = [];
  const cityId = TWOGIS_CITY_IDS[city];

  updateProgress(radarId, {
    stage: "search",
    message: "Поиск лидов (2GIS + Google + Яндекс)...",
    sources: {
      twogis: { status: "running", count: 0 },
      google: { status: "running", count: 0 },
      yandex: { status: "running", count: 0 },
    },
  });

  // Параллельный запуск всех трёх источников
  const [twogisResult, googleResult, yandexResult] = await Promise.allSettled([
    (async () => {
      if (!cityId) throw new Error(`Город "${city}" не найден в 2GIS`);
      const { items } = await searchTwogis(niche, cityId);
      const leads = extractLeadsFromItems(items);
      updateProgress(radarId, {
        sources: { twogis: { status: "done", count: leads.length }, google: { status: "running", count: 0 }, yandex: { status: "running", count: 0 } },
      });
      return leads;
    })(),

    (async () => {
      const leads = await searchGoogle(niche, city, (source, count) => {
        updateProgress(radarId, {
          sources: { twogis: { status: "done", count: 0 }, google: { status: "running", count }, yandex: { status: "running", count: 0 } },
        });
      });
      updateProgress(radarId, {
        sources: { twogis: { status: "done", count: 0 }, google: { status: "done", count: leads.length }, yandex: { status: "running", count: 0 } },
      });
      return leads;
    })(),

    (async () => {
      const leads = await searchYandex(niche, city, (source, count) => {
        updateProgress(radarId, {
          sources: { twogis: { status: "done", count: 0 }, google: { status: "done", count: 0 }, yandex: { status: "running", count } },
        });
      });
      updateProgress(radarId, {
        sources: { twogis: { status: "done", count: 0 }, google: { status: "done", count: 0 }, yandex: { status: "done", count: leads.length } },
      });
      return leads;
    })(),
  ]);

  let twogisLeads: ExtractedLead[] = [];
  let googleLeads: GoogleLead[] = [];
  let yandexLeads: YandexLead[] = [];

  if (twogisResult.status === "fulfilled") {
    twogisLeads = twogisResult.value;
  } else {
    errors.push(`2GIS: ${twogisResult.reason?.message || "ошибка"}`);
  }

  if (googleResult.status === "fulfilled") {
    googleLeads = googleResult.value;
  } else {
    errors.push(`Google Maps: ${googleResult.reason?.message || "ошибка"}`);
  }

  if (yandexResult.status === "fulfilled") {
    yandexLeads = yandexResult.value;
  } else {
    errors.push(`Яндекс.Карты: ${yandexResult.reason?.message || "ошибка"}`);
  }

  const totalFound = twogisLeads.length + googleLeads.length + yandexLeads.length;
  if (totalFound === 0) {
    throw new Error(`Не удалось найти лиды. Ошибки: ${errors.join("; ")}`);
  }

  const combined = deduplicateLeads(twogisLeads, googleLeads, yandexLeads);
  return { leads: combined, errors };
}
