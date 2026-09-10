/**
 * Выбор города/ниши дня + ротация (география v1).
 */
import "server-only";
import { getSetting, setManySetting } from "@/lib/data/settings";
import {
  GEO_BOOTSTRAP_CITY_ID,
  GEO_BOOTSTRAP_DAYS,
  GEO_CITIES_V1,
  GEO_COOLDOWN_DAYS,
  NICHES_V1,
  type GeoCity,
} from "@/lib/lead-radar-geo";

const KEY_LAST_CITY = "lead_radar_last_city_id";
const KEY_LAST_NICHE = "lead_radar_last_niche";
const KEY_BOOTSTRAP_START = "lead_radar_bootstrap_start";
const KEY_CITY_HISTORY = "lead_radar_city_history"; // JSON: [{id, date}]

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return Math.floor(ms / 86400000);
}

export async function pickCityAndNiche(params?: {
  city?: string;
  niche?: string;
}): Promise<{ city: GeoCity; niche: string; reason: string }> {
  if (params?.city) {
    const found = GEO_CITIES_V1.find(
      (c) =>
        c.name.toLowerCase() === params.city!.trim().toLowerCase() ||
        c.id === params.city!.trim().toLowerCase()
    ) || {
      id: "custom",
      name: params.city.trim(),
      priority: "high" as const,
      travel: false,
    };
    const niche = params.niche?.trim() || NICHES_V1[0];
    return { city: found, niche, reason: "request" };
  }

  let bootstrapStart = await getSetting(KEY_BOOTSTRAP_START);
  if (!bootstrapStart) {
    bootstrapStart = todayISO();
    await setManySetting({ [KEY_BOOTSTRAP_START]: bootstrapStart });
  }

  if (daysBetween(bootstrapStart, todayISO()) < GEO_BOOTSTRAP_DAYS) {
    const city = GEO_CITIES_V1.find((c) => c.id === GEO_BOOTSTRAP_CITY_ID)!;
    const lastNiche = await getSetting(KEY_LAST_NICHE);
    const nicheIdx = Math.max(0, NICHES_V1.indexOf(lastNiche as any));
    const niche = params?.niche?.trim() || NICHES_V1[(nicheIdx + 1) % NICHES_V1.length];
    return { city, niche, reason: "bootstrap_spb" };
  }

  let history: Array<{ id: string; date: string }> = [];
  try {
    history = JSON.parse((await getSetting(KEY_CITY_HISTORY)) || "[]");
  } catch {
    history = [];
  }

  const recent = new Set(
    history
      .filter((h) => daysBetween(h.date, todayISO()) < GEO_COOLDOWN_DAYS)
      .map((h) => h.id)
  );

  const lastCity = await getSetting(KEY_LAST_CITY);
  const ordered = [
    ...GEO_CITIES_V1.filter((c) => c.id !== lastCity),
    ...GEO_CITIES_V1.filter((c) => c.id === lastCity),
  ];
  const city =
    ordered.find((c) => !recent.has(c.id)) ||
    GEO_CITIES_V1.find((c) => c.id === GEO_BOOTSTRAP_CITY_ID)!;

  const lastNiche = await getSetting(KEY_LAST_NICHE);
  const nicheIdx = Math.max(0, NICHES_V1.indexOf(lastNiche as any));
  const niche = params?.niche?.trim() || NICHES_V1[(nicheIdx + 1) % NICHES_V1.length];

  return { city, niche, reason: "rotation" };
}

export async function rememberCityNiche(cityId: string, niche: string): Promise<void> {
  let history: Array<{ id: string; date: string }> = [];
  try {
    history = JSON.parse((await getSetting(KEY_CITY_HISTORY)) || "[]");
  } catch {
    history = [];
  }
  history.push({ id: cityId, date: todayISO() });
  history = history.slice(-30);
  await setManySetting({
    [KEY_LAST_CITY]: cityId,
    [KEY_LAST_NICHE]: niche,
    [KEY_CITY_HISTORY]: JSON.stringify(history),
  });
}
