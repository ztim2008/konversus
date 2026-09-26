/**
 * География + рулетка вертикалей.
 * Гипотеза B (дерево): ядро = лесной пояс (заводы), СПб/Мск — тонкий слой сбыта.
 */
export type GeoCity = {
  id: string;
  name: string;
  priority: "home" | "high" | "tier2";
  travel: boolean;
  /** Относительный вес в ротации городов (выше = чаще). */
  weight: number;
};

/**
 * Веса гео ≈: лесной пояс ~65 · Новгород/Тверь/Псков ~20 · СПб+ЛО ~15 · Мск ~5.
 */
export const GEO_CITIES_V1: GeoCity[] = [
  // Лесной пояс — производство / домокомплекты
  { id: "ptz", name: "Петрозаводск", priority: "high", travel: true, weight: 15 },
  { id: "vologda", name: "Вологда", priority: "high", travel: true, weight: 12 },
  { id: "kostroma", name: "Кострома", priority: "high", travel: true, weight: 12 },
  { id: "cherepovets", name: "Череповец", priority: "high", travel: true, weight: 10 },
  { id: "kirov", name: "Киров", priority: "high", travel: true, weight: 10 },
  // Ближний лес / СЗ
  { id: "vnovgorod", name: "Великий Новгород", priority: "high", travel: true, weight: 10 },
  { id: "tver", name: "Тверь", priority: "high", travel: true, weight: 8 },
  { id: "pskov", name: "Псков", priority: "tier2", travel: true, weight: 5 },
  // Сбыт / монтаж (не выжигать)
  { id: "spb", name: "Санкт-Петербург", priority: "home", travel: false, weight: 8 },
  { id: "lo", name: "Ленинградская область", priority: "high", travel: true, weight: 5 },
  { id: "vyborg", name: "Выборг", priority: "tier2", travel: true, weight: 3 },
  { id: "msk", name: "Москва", priority: "tier2", travel: false, weight: 4 },
];

/** Bootstrap СПб выключен (0): сразу крутим лесной пояс. */
export const GEO_COOLDOWN_DAYS = 3;
export const GEO_BOOTSTRAP_CITY_ID = "ptz";
export const GEO_BOOTSTRAP_DAYS = 0;

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
 * Активная рулетка: дома/каркас/бани жирнее; бытовки почти выкл.
 * Веса: дома 45 · каркас 35 · бани 15 · бытовки/веранды 5.
 * Запросы с уклоном в завод / производство / домокомплект.
 */
export const VERTICALS_V2: readonly VerticalDef[] = [
  {
    id: "doma_derevo",
    labelRu: "Дома из дерева",
    weight: 45,
    niches: [
      "завод домов из бруса",
      "производство домов из бруса",
      "домокомплекты из бруса",
      "дома из бруса под ключ",
      "дома из клееного бруса завод",
      "дома из оцилиндрованного бревна производство",
      "строительство домов из бруса",
      "деревянные дома производство",
    ],
  },
  {
    id: "karkas",
    labelRu: "Каркасники",
    weight: 35,
    niches: [
      "завод каркасных домов",
      "производство каркасных домов",
      "домокомплекты каркасные",
      "каркасные дома под ключ",
      "каркасное домостроение завод",
      "модульные каркасные дома производство",
      "строительство каркасных домов",
    ],
  },
  {
    id: "bani",
    labelRu: "Бани",
    weight: 15,
    niches: [
      "завод бань из бруса",
      "производство бань из бруса",
      "бани из бруса под ключ",
      "бани из бревна производство",
      "каркасные бани завод",
      "строительство бань из бруса",
    ],
  },
  {
    id: "bytovki_verandy",
    labelRu: "Бытовки и веранды",
    weight: 5,
    niches: [
      "производство бытовок деревянных",
      "бытовки дачные под ключ",
      "веранды и террасы под ключ",
      "пристройка веранды к дому",
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
