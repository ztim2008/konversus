/**
 * Рулетка B: вертикаль (с весом) → подниша → город (cooldown).
 */
import "server-only";
import { getSetting, setManySetting } from "@/lib/data/settings";
import {
  GEO_BOOTSTRAP_CITY_ID,
  GEO_BOOTSTRAP_DAYS,
  GEO_CITIES_V1,
  GEO_COOLDOWN_DAYS,
  VERTICALS_V2,
  buildVerticalSlotRibbon,
  findVerticalByNiche,
  getVertical,
  type GeoCity,
  type VerticalId,
} from "@/lib/lead-radar-geo";
import { getVerticalWeights, mskDateISO } from "@/lib/lead-radar/config";

const KEY_LAST_CITY = "lead_radar_last_city_id";
const KEY_LAST_NICHE = "lead_radar_last_niche";
const KEY_LAST_VERTICAL = "lead_radar_last_vertical";
const KEY_BOOTSTRAP_START = "lead_radar_bootstrap_start";
const KEY_CITY_HISTORY = "lead_radar_city_history"; // JSON: [{id, date}]
const KEY_SLOT_INDEX = "lead_radar_vertical_slot_index";
const KEY_NICHE_CURSOR = "lead_radar_niche_cursor"; // JSON: { [verticalId]: number }

export type DayPick = {
  city: GeoCity;
  niche: string;
  verticalId: VerticalId | "custom";
  verticalLabel: string;
  reason: string;
  slotIndex?: number;
};

function todayISO(): string {
  return mskDateISO();
}

function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return Math.floor(ms / 86400000);
}

async function readNicheCursors(): Promise<Record<string, number>> {
  try {
    return JSON.parse((await getSetting(KEY_NICHE_CURSOR)) || "{}");
  } catch {
    return {};
  }
}

function nextNicheInVertical(
  verticalId: VerticalId,
  cursors: Record<string, number>,
  preferNiche?: string
): { niche: string; cursors: Record<string, number> } {
  const vertical = getVertical(verticalId)!;
  if (preferNiche?.trim()) {
    const found = vertical.niches.find(
      (n) => n.toLowerCase() === preferNiche.trim().toLowerCase()
    );
    if (found) return { niche: found, cursors };
  }
  const idx = ((cursors[verticalId] ?? -1) + 1) % vertical.niches.length;
  return {
    niche: vertical.niches[idx],
    cursors: { ...cursors, [verticalId]: idx },
  };
}

function pickCityFromHistory(
  history: Array<{ id: string; date: string }>,
  lastCity: string
): GeoCity {
  const recent = new Set(
    history
      .filter((h) => daysBetween(h.date, todayISO()) < GEO_COOLDOWN_DAYS)
      .map((h) => h.id)
  );
  const ordered = [
    ...GEO_CITIES_V1.filter((c) => c.id !== lastCity),
    ...GEO_CITIES_V1.filter((c) => c.id === lastCity),
  ];
  return (
    ordered.find((c) => !recent.has(c.id)) ||
    GEO_CITIES_V1.find((c) => c.id === GEO_BOOTSTRAP_CITY_ID)!
  );
}

function resolveCity(cityParam?: string): GeoCity {
  if (!cityParam?.trim()) {
    return GEO_CITIES_V1.find((c) => c.id === GEO_BOOTSTRAP_CITY_ID)!;
  }
  return (
    GEO_CITIES_V1.find(
      (c) =>
        c.name.toLowerCase() === cityParam.trim().toLowerCase() ||
        c.id === cityParam.trim().toLowerCase()
    ) || {
      id: "custom",
      name: cityParam.trim(),
      priority: "high" as const,
      travel: false,
    }
  );
}

/**
 * Выбрать слот дня. Ручной override: city / niche / vertical.
 */
export async function pickCityAndNiche(params?: {
  city?: string;
  niche?: string;
  vertical?: string;
}): Promise<DayPick> {
  let cursors = await readNicheCursors();

  // Явный запрос (админ / curl)
  if (params?.city || params?.niche || params?.vertical) {
    const city = resolveCity(params.city);
    let vertical =
      (params.vertical && getVertical(params.vertical)) ||
      (params.niche ? findVerticalByNiche(params.niche) : undefined) ||
      VERTICALS_V2[0];

    if (params.vertical && !getVertical(params.vertical)) {
      vertical = VERTICALS_V2[0];
    }

    const { niche, cursors: next } = nextNicheInVertical(
      vertical.id,
      cursors,
      params.niche
    );
    // при ручном запросе курсор не двигаем, если ниша задана явно
    if (!params.niche) cursors = next;

    return {
      city,
      niche: params.niche?.trim() || niche,
      verticalId: vertical.id,
      verticalLabel: vertical.labelRu,
      reason: "request",
    };
  }

  let bootstrapStart = await getSetting(KEY_BOOTSTRAP_START);
  if (!bootstrapStart) {
    bootstrapStart = todayISO();
    await setManySetting({ [KEY_BOOTSTRAP_START]: bootstrapStart });
  }

  const ribbon = buildVerticalSlotRibbon(await getVerticalWeights());
  const rawSlot = Number((await getSetting(KEY_SLOT_INDEX)) || "0");
  const slotIndex = Number.isFinite(rawSlot) ? Math.max(0, Math.floor(rawSlot)) : 0;
  const verticalId = ribbon[slotIndex % ribbon.length];
  const vertical = getVertical(verticalId)!;

  const { niche, cursors: nextCursors } = nextNicheInVertical(
    verticalId,
    cursors
  );
  cursors = nextCursors;

  // Bootstrap: только СПб, но ниши/вертикали уже из рулетки B
  if (daysBetween(bootstrapStart, todayISO()) < GEO_BOOTSTRAP_DAYS) {
    const city = GEO_CITIES_V1.find((c) => c.id === GEO_BOOTSTRAP_CITY_ID)!;
    return {
      city,
      niche,
      verticalId: vertical.id,
      verticalLabel: vertical.labelRu,
      reason: "bootstrap_spb",
      slotIndex,
    };
  }

  let history: Array<{ id: string; date: string }> = [];
  try {
    history = JSON.parse((await getSetting(KEY_CITY_HISTORY)) || "[]");
  } catch {
    history = [];
  }
  const lastCity = await getSetting(KEY_LAST_CITY);
  const city = pickCityFromHistory(history, lastCity);

  return {
    city,
    niche,
    verticalId: vertical.id,
    verticalLabel: vertical.labelRu,
    reason: "rotation",
    slotIndex,
  };
}

export async function rememberCityNiche(
  cityId: string,
  niche: string,
  verticalId?: string
): Promise<void> {
  let history: Array<{ id: string; date: string }> = [];
  try {
    history = JSON.parse((await getSetting(KEY_CITY_HISTORY)) || "[]");
  } catch {
    history = [];
  }
  history.push({ id: cityId, date: todayISO() });
  history = history.slice(-30);

  const rawSlot = Number((await getSetting(KEY_SLOT_INDEX)) || "0");
  const nextSlot = (Number.isFinite(rawSlot) ? Math.floor(rawSlot) : 0) + 1;

  const cursors = await readNicheCursors();
  const vid =
    verticalId && getVertical(verticalId)
      ? verticalId
      : findVerticalByNiche(niche)?.id;
  if (vid) {
    const v = getVertical(vid)!;
    const idx = v.niches.findIndex(
      (n) => n.toLowerCase() === niche.trim().toLowerCase()
    );
    if (idx >= 0) cursors[vid] = idx;
  }

  await setManySetting({
    [KEY_LAST_CITY]: cityId,
    [KEY_LAST_NICHE]: niche,
    [KEY_LAST_VERTICAL]: vid || "",
    [KEY_CITY_HISTORY]: JSON.stringify(history),
    [KEY_SLOT_INDEX]: String(nextSlot),
    [KEY_NICHE_CURSOR]: JSON.stringify(cursors),
  });
}

/** Превью ближайших N слотов (для админки). */
export function previewRoulette(
  fromSlot = 0,
  days = 14,
  weights?: Partial<Record<VerticalId, number>>
): Array<{
  dayOffset: number;
  vertical: string;
  verticalId: VerticalId;
  nicheHint: string;
}> {
  const ribbon = buildVerticalSlotRibbon(weights);
  const out: Array<{
    dayOffset: number;
    vertical: string;
    verticalId: VerticalId;
    nicheHint: string;
  }> = [];
  const cursors: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const slot = fromSlot + i;
    const verticalId = ribbon[slot % ribbon.length];
    const v = getVertical(verticalId)!;
    const idx = ((cursors[verticalId] ?? -1) + 1) % v.niches.length;
    cursors[verticalId] = idx;
    out.push({
      dayOffset: i,
      vertical: v.labelRu,
      verticalId,
      nicheHint: v.niches[idx],
    });
  }
  return out;
}

export async function getRouletteAdminState(): Promise<{
  slotIndex: number;
  lastCity: string;
  lastNiche: string;
  lastVertical: string;
  bootstrapStart: string;
  preview: ReturnType<typeof previewRoulette>;
  ribbon: Array<{ id: VerticalId; labelRu: string }>;
  verticals: Array<{
    id: VerticalId;
    labelRu: string;
    weight: number;
    niches: readonly string[];
  }>;
}> {
  const weights = await getVerticalWeights();
  const rawSlot = Number((await getSetting(KEY_SLOT_INDEX)) || "0");
  const slotIndex = Number.isFinite(rawSlot) ? Math.max(0, Math.floor(rawSlot)) : 0;
  const ribbonIds = buildVerticalSlotRibbon(weights);
  return {
    slotIndex,
    lastCity: (await getSetting(KEY_LAST_CITY)) || "",
    lastNiche: (await getSetting(KEY_LAST_NICHE)) || "",
    lastVertical: (await getSetting(KEY_LAST_VERTICAL)) || "",
    bootstrapStart: (await getSetting(KEY_BOOTSTRAP_START)) || "",
    preview: previewRoulette(slotIndex, 14, weights),
    ribbon: ribbonIds.map((id) => ({
      id,
      labelRu: getVertical(id)!.labelRu,
    })),
    verticals: VERTICALS_V2.map((v) => ({
      id: v.id,
      labelRu: v.labelRu,
      weight: weights[v.id] ?? v.weight,
      niches: v.niches,
    })),
  };
}
