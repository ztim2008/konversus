/**
 * География v1 + рулетка вертикалей v2 (Лид-радар Auto).
 * План: docs/plans/2026-09-lead-radar-niche-roulette.md
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

/** @deprecated используйте VERTICALS_V2 / allNichesFlat() */
export const NICHES_V1 = [
  "ремонт квартир",
  "строительная компания",
  "стройматериалы",
  "инженерные сети",
] as const;

export type VerticalId =
  | "stroitelstvo"
  | "remont"
  | "uslugi"
  | "proizvodstvo";

export type VerticalDef = {
  id: VerticalId;
  labelRu: string;
  /** Относительный вес в рулетке (стройка выше). */
  weight: number;
  niches: readonly string[];
};

/**
 * Вертикаль → подниши (SERP-запросы без города).
 * Веса: стройка 40 · ремонт 25 · услуги 20 · производство 15.
 */
export const VERTICALS_V2: readonly VerticalDef[] = [
  {
    id: "stroitelstvo",
    labelRu: "Стройка",
    weight: 40,
    niches: [
      "строительная компания",
      "генподрядчик",
      "монолитные работы",
      "фасадные работы",
      "кровельные работы",
      "строительство домов",
      "строительство ангаров",
      "промышленное строительство",
      "демонтаж зданий",
      "земляные работы",
      "благоустройство территории",
      "строительный контроль",
    ],
  },
  {
    id: "remont",
    labelRu: "Ремонт",
    weight: 25,
    niches: [
      "ремонт квартир",
      "ремонт офисов",
      "ремонт помещений под ключ",
      "отделочные работы",
      "дизайн интерьера студия",
      "ремонт ванной под ключ",
      "коммерческий ремонт",
      "ремонт ресторанов",
      "ремонт магазинов",
      "стяжка пола",
      "штукатурные работы",
      "электромонтажные работы",
    ],
  },
  {
    id: "uslugi",
    labelRu: "Услуги",
    weight: 20,
    niches: [
      "клининговая компания",
      "салон красоты",
      "кафе",
      "ресторан",
      "ремонт бытовой техники",
      "автосервис",
      "стоматология",
      "охрана объектов",
      "бухгалтерские услуги для ООО",
      "логистическая компания",
      "рекламное агентство",
      "клининг офисов",
      "монтаж видеонаблюдения",
      "фитнес клуб",
    ],
  },
  {
    id: "proizvodstvo",
    labelRu: "Производство",
    weight: 15,
    niches: [
      "производство металлоконструкций",
      "производство мебели на заказ",
      "производство пластиковых окон",
      "пищевое производство",
      "швейное производство",
      "производство упаковки",
      "металлообработка",
      "производство стройматериалов",
      "производство рекламных конструкций",
      "цех металлоизделий",
      "производство дверей",
      "производство вентиляции",
    ],
  },
] as const;

/**
 * Детерминированная лента слотов (~20 дней), перемешанная по весам
 * (стройка чаще, но не блоками подряд).
 */
export function buildVerticalSlotRibbon(
  weights?: Partial<Record<VerticalId, number>>
): VerticalId[] {
  const totalSlots = 20;
  const state = VERTICALS_V2.map((v) => ({
    id: v.id as VerticalId,
    weight: Math.max(0, Number(weights?.[v.id] ?? v.weight) || 0),
    placed: 0,
  }));
  if (state.every((s) => s.weight <= 0)) {
    for (const s of state) s.weight = 1;
  }
  const ribbon: VerticalId[] = [];
  for (let i = 0; i < totalSlots; i++) {
    state.sort((a, b) => {
      const ra = a.placed / a.weight;
      const rb = b.placed / b.weight;
      if (ra !== rb) return ra - rb;
      return b.weight - a.weight;
    });
    const pick = state[0];
    pick.placed++;
    ribbon.push(pick.id);
  }
  return ribbon;
}

export function getVertical(id: string): VerticalDef | undefined {
  return VERTICALS_V2.find((v) => v.id === id);
}

export function findVerticalByNiche(niche: string): VerticalDef | undefined {
  const n = niche.trim().toLowerCase();
  return VERTICALS_V2.find((v) =>
    v.niches.some((x) => x.toLowerCase() === n)
  );
}

export function allNichesFlat(): string[] {
  return VERTICALS_V2.flatMap((v) => [...v.niches]);
}

export function findCityByName(name: string): GeoCity | undefined {
  const n = name.trim().toLowerCase();
  return GEO_CITIES_V1.find(
    (c) =>
      c.name.toLowerCase() === n ||
      c.id === n ||
      c.name.toLowerCase().includes(n)
  );
}
