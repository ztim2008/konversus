/**
 * География + рулетка вертикалей.
 * Ключи — как сделанные сайты: стройка-услуги и мебель/производство.
 * Города крутятся по России, без упора на лесной пояс.
 */
export type GeoCity = {
  id: string;
  name: string;
  priority: "home" | "high" | "tier2";
  travel: boolean;
  /** Относительный вес в ротации городов (выше = чаще). */
  weight: number;
};

/** Одинаковый вес: город каждый тик другой, без любимчиков. */
export const GEO_CITIES_V1: GeoCity[] = [
  { id: "perm", name: "Пермь", priority: "high", travel: true, weight: 5 },
  { id: "yaroslavl", name: "Ярославль", priority: "high", travel: true, weight: 5 },
  { id: "omsk", name: "Омск", priority: "high", travel: true, weight: 5 },
  { id: "spb", name: "Санкт-Петербург", priority: "home", travel: false, weight: 5 },
  { id: "msk", name: "Москва", priority: "tier2", travel: false, weight: 5 },
  { id: "kaluga", name: "Калуга", priority: "high", travel: true, weight: 5 },
  { id: "chel", name: "Челябинск", priority: "high", travel: true, weight: 5 },
  { id: "volgograd", name: "Волгоград", priority: "high", travel: true, weight: 5 },
  { id: "nsk", name: "Новосибирск", priority: "high", travel: true, weight: 5 },
  { id: "kazan", name: "Казань", priority: "high", travel: true, weight: 5 },
  { id: "krasnoyarsk", name: "Красноярск", priority: "high", travel: true, weight: 5 },
  { id: "ekb", name: "Екатеринбург", priority: "high", travel: true, weight: 5 },
  { id: "nn", name: "Нижний Новгород", priority: "high", travel: true, weight: 5 },
  { id: "samara", name: "Самара", priority: "high", travel: true, weight: 5 },
  { id: "rostov", name: "Ростов-на-Дону", priority: "high", travel: true, weight: 5 },
  { id: "voronezh", name: "Воронеж", priority: "high", travel: true, weight: 5 },
  { id: "krasnodar", name: "Краснодар", priority: "high", travel: true, weight: 5 },
  { id: "ufa", name: "Уфа", priority: "high", travel: true, weight: 5 },
  { id: "tyumen", name: "Тюмень", priority: "high", travel: true, weight: 5 },
  { id: "irkutsk", name: "Иркутск", priority: "high", travel: true, weight: 5 },
  { id: "barnaul", name: "Барнаул", priority: "high", travel: true, weight: 5 },
  { id: "tula", name: "Тула", priority: "high", travel: true, weight: 5 },
  { id: "ryazan", name: "Рязань", priority: "high", travel: true, weight: 5 },
  { id: "tomsk", name: "Томск", priority: "high", travel: true, weight: 5 },
  { id: "kemerovo", name: "Кемерово", priority: "high", travel: true, weight: 5 },
  { id: "saratov", name: "Саратов", priority: "high", travel: true, weight: 5 },
  { id: "izhevsk", name: "Ижевск", priority: "high", travel: true, weight: 5 },
  { id: "tver", name: "Тверь", priority: "high", travel: true, weight: 5 },
  { id: "vologda", name: "Вологда", priority: "high", travel: true, weight: 5 },
  { id: "kostroma", name: "Кострома", priority: "high", travel: true, weight: 5 },
  { id: "kirov", name: "Киров", priority: "high", travel: true, weight: 5 },
];

/** Bootstrap выключен: сразу ротация по списку городов. */
export const GEO_COOLDOWN_DAYS = 3;
export const GEO_BOOTSTRAP_CITY_ID = "perm";
export const GEO_BOOTSTRAP_DAYS = 0;

/** @deprecated используйте VERTICALS_V2 / allNichesFlat() */
export const NICHES_V1 = [
  "дома из бруса",
  "каркасные дома",
  "бани из бруса",
  "бытовки",
] as const;

export type VerticalId = "stroika" | "mebel";

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
 * Активная рулетка по сделанным сайтам.
 * Веса: стройка и услуги 70 · мебель и производство 30.
 */
export const VERTICALS_V2: readonly VerticalDef[] = [
  {
    id: "stroika",
    labelRu: "Стройка и услуги",
    weight: 70,
    niches: [
      "дома из бруса под ключ",
      "строительство домов под ключ",
      "дома из газобетона под ключ",
      "бани из бруса под ключ",
      "каркасные бани под ключ",
      "мобильные бани под ключ",
      "модульные бани под ключ",
      "дома и срубы из кедра",
      "беседки и хозблоки",
      "монтаж кровли",
      "укладка тротуарной плитки",
      "укладка асфальта",
      "строительство бассейнов под ключ",
      "демонтаж зданий",
      "доставка песка щебня бетона",
    ],
  },
  {
    id: "mebel",
    labelRu: "Мебель и производство",
    weight: 30,
    niches: [
      "кухни на заказ",
      "шкафы-купе на заказ",
      "мебель на заказ",
      "производство мебели на заказ",
      "оборудование для мясопереработки",
      "3d печать деталей",
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
