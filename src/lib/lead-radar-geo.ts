/**
 * География v1 + ниши для Лид-радар Auto.
 * Источник правды продуктово: docs/LEAD-RADAR-AUTO-TZ.md
 */
export type GeoCity = {
  id: string;
  name: string;
  priority: "home" | "high" | "tier2";
  travel: boolean;
};

export const GEO_CITIES_V1: GeoCity[] = [
  { id: "spb", name: "Санкт-Петербург", priority: "home", travel: false },
  { id: "msk", name: "Москва", priority: "high", travel: false },
  { id: "omsk", name: "Омск", priority: "high", travel: true },
  { id: "vnovgorod", name: "Великий Новгород", priority: "high", travel: true },
];

export const GEO_COOLDOWN_DAYS = 3;
export const GEO_BOOTSTRAP_CITY_ID = "spb";
export const GEO_BOOTSTRAP_DAYS = 14;

export const NICHES_V1 = [
  "ремонт квартир",
  "строительная компания",
  "стройматериалы",
  "инженерные сети",
] as const;

export function findCityByName(name: string): GeoCity | undefined {
  const n = name.trim().toLowerCase();
  return GEO_CITIES_V1.find(
    (c) => c.name.toLowerCase() === n || c.id === n || c.name.toLowerCase().includes(n)
  );
}
