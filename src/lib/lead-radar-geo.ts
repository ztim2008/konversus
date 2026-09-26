/**
 * География + рулетка вертикалей.
 * V2 (Игорь / широкая стройка) — снимок VERTICALS_V2_ARCHIVE.
 * Активно: VERTICALS_V2 = дерево-дома / бани / каркас / бытовки·веранды.
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
  { id: "lo", name: "Ленинградская область", priority: "high", travel: true },
  { id: "vnovgorod", name: "Великий Новгород", priority: "high", travel: true },
  { id: "tver", name: "Тверь", priority: "tier2", travel: true },
  { id: "pskov", name: "Псков", priority: "tier2", travel: true },
  { id: "omsk", name: "Омск", priority: "tier2", travel: true },
];

export const GEO_COOLDOWN_DAYS = 3;
export const GEO_BOOTSTRAP_CITY_ID = "spb";
export const GEO_BOOTSTRAP_DAYS = 14;

/** @deprecated используйте VERTICALS_V2 / allNichesFlat() */
export const NICHES_V1 = [
  "дома из бруса",
  "каркасные дома",
  "бани из бруса",
  "бытовки",
] as const;

export type VerticalId =
  | "doma_derevo"
  | "karkas"
  | "bani"
  | "bytovki_verandy";

/** Снимок прежних id (гипотеза Игорь) — только для документации/отката. */
export type VerticalIdArchive =
  | "stroitelstvo"
  | "remont"
  | "uslugi"
  | "proizvodstvo";

export type VerticalDef = {
  id: VerticalId;
  labelRu: string;
  /** Относительный вес в рулетке. */
  weight: number;
  niches: readonly string[];
};

/**
 * Снимок рулетки гипотезы A (Игорь / lead-web.pro) — не использовать в runtime.
 * Откат: вернуть как VERTICALS_V2 + VerticalId.
 */
export const VERTICALS_V2_ARCHIVE: readonly {
  id: VerticalIdArchive;
  labelRu: string;
  weight: number;
  niches: readonly string[];
}[] = [
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
 * Активная рулетка: деревянные дома / бани / каркас / бытовки·веранды.
 * Веса: дома 35 · каркас 30 · бани 25 · бытовки/веранды 10.
 * Запросы — коммерческие, как ищут заказчики (без города).
 */
export const VERTICALS_V2: readonly VerticalDef[] = [
  {
    id: "doma_derevo",
    labelRu: "Дома из дерева",
    weight: 35,
    niches: [
      "дома из бруса под ключ",
      "строительство домов из бруса",
      "дома из клееного бруса",
      "дома из оцилиндрованного бревна",
      "деревянные дома под ключ",
      "дачные дома из бруса",
      "строительство деревянных домов",
      "дома из профилированного бруса",
    ],
  },
  {
    id: "karkas",
    labelRu: "Каркасники",
    weight: 30,
    niches: [
      "каркасные дома под ключ",
      "строительство каркасных домов",
      "каркасное домостроение",
      "каркасно-щитовые дома",
      "модульные каркасные дома",
      "дачные каркасные дома",
      "каркасный дом цена",
    ],
  },
  {
    id: "bani",
    labelRu: "Бани",
    weight: 25,
    niches: [
      "бани из бруса под ключ",
      "строительство бань из бруса",
      "бани под ключ",
      "каркасные бани",
      "бани из бревна",
      "проекты бань с комнатой отдыха",
      "строительство бань",
    ],
  },
  {
    id: "bytovki_verandy",
    labelRu: "Бытовки и веранды",
    weight: 10,
    niches: [
      "бытовки дачные",
      "бытовки для дачи под ключ",
      "хозблоки и бытовки",
      "веранды и террасы под ключ",
      "пристройка веранды к дому",
      "террасы из дерева",
      "строительство веранд",
      "бытовки деревянные",
    ],
  },
] as const;

/**
 * Детерминированная лента слотов (~20 дней), перемешанная по весам.
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
