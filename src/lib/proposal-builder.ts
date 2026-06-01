import type {
  CommercialCard,
  ContactItem,
  FaqItem,
  GalleryPhoto,
  HeroCardItem,
  PitchItem,
  PitchStat,
  ProposalBlock,
  ProposalBlockPayload,
  ProposalBlockType,
  ProposalMetric,
  TimelineStep,
} from "@/types/domain";

export type ProposalBlockTemplate = {
  type: ProposalBlockType;
  category: string;
  label: string;
  description: string;
  defaultTitle: string;
  createPayload: () => ProposalBlockPayload;
};

export type ProposalBlockCategoryId =
  | "hero-blocks"
  | "audit-blocks"
  | "problem-blocks"
  | "seo-blocks"
  | "trust-blocks"
  | "product-blocks"
  | "media-blocks"
  | "ai-enhanced-blocks"
  | "strategy-blocks"
  | "cta-blocks"
  | "process-blocks"
  | "industrial-blocks"
  | "analytics-blocks"
  | "contact-blocks"
  | "custom-blocks";

export type ProposalBlockMode = "visual" | "compact" | "pdf";

export type ProposalBlockCategory = {
  id: ProposalBlockCategoryId;
  title: string;
  purpose: string;
  narrativeStage: "opening" | "diagnosis" | "argument" | "proof" | "solution" | "delivery" | "closing" | "custom";
};

export type ProposalBlockSemanticMetadata = {
  semanticCategory: ProposalBlockCategoryId;
  icon: string;
  previewImage: string | null;
  tags: string[];
  schema: string[];
  variants: string[];
  modes: ProposalBlockMode[];
  darkModeSupport: boolean;
  pdfSupport: boolean;
  mobileSupport: boolean;
  animations: string[];
  narrativeRole: string;
  catalogEnabled: boolean;
};

export type ProposalBlockCatalogItem = ProposalBlockTemplate & ProposalBlockSemanticMetadata;

export const proposalBlockCategories: ProposalBlockCategory[] = [
  {
    id: "hero-blocks",
    title: "Hero blocks",
    purpose: "Открывают pitch и создают ощущение нового уровня компании.",
    narrativeStage: "opening",
  },
  {
    id: "audit-blocks",
    title: "Audit blocks",
    purpose: "Показывают pain reveal и объясняют, почему redesign нужен бизнесу.",
    narrativeStage: "diagnosis",
  },
  {
    id: "problem-blocks",
    title: "Problem blocks",
    purpose: "Фиксируют проблемы доверия, конверсии и mobile-опыта.",
    narrativeStage: "diagnosis",
  },
  {
    id: "seo-blocks",
    title: "SEO blocks",
    purpose: "Показывают поисковый потенциал, структуру спроса и рост посадочных.",
    narrativeStage: "argument",
  },
  {
    id: "trust-blocks",
    title: "Trust blocks",
    purpose: "Усиливают доверие через цифры, сертификаты, клиентов и географию.",
    narrativeStage: "proof",
  },
  {
    id: "product-blocks",
    title: "Product blocks",
    purpose: "Показывают продукцию, ассортимент, оборудование и возможности.",
    narrativeStage: "proof",
  },
  {
    id: "media-blocks",
    title: "Media blocks",
    purpose: "Доказывают масштаб через фото, видео и визуальное сравнение.",
    narrativeStage: "proof",
  },
  {
    id: "ai-enhanced-blocks",
    title: "AI enhanced blocks",
    purpose: "Показывают усиление визуала и формулировок без зависимости editor runtime от AI.",
    narrativeStage: "argument",
  },
  {
    id: "strategy-blocks",
    title: "Strategy blocks",
    purpose: "Связывают redesign, SEO, лидогенерацию и B2B-позиционирование.",
    narrativeStage: "solution",
  },
  {
    id: "cta-blocks",
    title: "CTA blocks",
    purpose: "Переводят pitch в следующий шаг: созвон, стратегия, запуск.",
    narrativeStage: "closing",
  },
  {
    id: "process-blocks",
    title: "Process blocks",
    purpose: "Делают проект понятным по этапам, срокам и управлению.",
    narrativeStage: "delivery",
  },
  {
    id: "industrial-blocks",
    title: "Industrial blocks",
    purpose: "Раскрывают производство, технологии, контроль качества и мощность.",
    narrativeStage: "proof",
  },
  {
    id: "analytics-blocks",
    title: "Analytics blocks",
    purpose: "Показывают performance, SEO-потенциал и измеримый рост.",
    narrativeStage: "argument",
  },
  {
    id: "contact-blocks",
    title: "Contact blocks",
    purpose: "Закрывают документ прямым контактом и персональной рамкой доверия.",
    narrativeStage: "closing",
  },
  {
    id: "custom-blocks",
    title: "Custom blocks",
    purpose: "Оставляют controlled escape hatch для ручных и экспериментальных вставок.",
    narrativeStage: "custom",
  },
];

const defaultSemanticMetadata: Omit<ProposalBlockSemanticMetadata, "semanticCategory" | "icon" | "tags" | "schema" | "variants" | "narrativeRole"> = {
  previewImage: null,
  modes: ["visual", "compact", "pdf"],
  darkModeSupport: true,
  pdfSupport: true,
  mobileSupport: true,
  animations: [],
  catalogEnabled: false,
};

const proposalBlockSemanticMetadata: Record<ProposalBlockType, ProposalBlockSemanticMetadata> = {
  hero: {
    ...defaultSemanticMetadata,
    semanticCategory: "hero-blocks",
    icon: "Clapperboard",
    tags: ["opening", "industrial", "metrics", "cta"],
    schema: ["eyebrow", "headline", "body", "heroCards", "photoUrl", "cta"],
    variants: ["cinematic-hero", "split-hero", "video-hero"],
    animations: ["hero-reveal"],
    catalogEnabled: true,
    narrativeRole: "Создает первый уровень доверия и задает масштаб компании.",
  },
  editorial: {
    ...defaultSemanticMetadata,
    semanticCategory: "strategy-blocks",
    icon: "PanelTop",
    tags: ["positioning", "argument", "narrative"],
    schema: ["eyebrow", "headline", "body", "bullets"],
    variants: ["b2b-positioning", "digital-transformation", "lead-strategy"],
    narrativeRole: "Переводит разговор из дизайна в бизнес-логику digital pitch.",
  },
  metrics: {
    ...defaultSemanticMetadata,
    semanticCategory: "trust-blocks",
    icon: "BarChart3",
    tags: ["trust", "scale", "proof", "numbers"],
    schema: ["eyebrow", "headline", "metrics"],
    variants: ["company-metrics", "performance", "seo-potential"],
    narrativeRole: "Доказывает масштаб компании через быстро считываемые цифры.",
  },
  "gallery-photo": {
    ...defaultSemanticMetadata,
    semanticCategory: "media-blocks",
    icon: "Images",
    tags: ["media", "factory", "trust", "production"],
    schema: ["eyebrow", "headline", "body", "photos"],
    variants: ["industrial-gallery", "factory-scale", "quality-control"],
    narrativeRole: "Показывает реальную производственную среду как доказательство.",
  },
  "gallery-showcase": {
    ...defaultSemanticMetadata,
    semanticCategory: "media-blocks",
    icon: "ImagePlus",
    tags: ["media", "showcase", "premium", "industrial"],
    schema: ["eyebrow", "headline", "photos"],
    variants: ["product-showcase", "cinematic-media", "equipment-block"],
    narrativeRole: "Дает крупный визуальный акцент для premium-подачи производства.",
  },
  "video-block": {
    ...defaultSemanticMetadata,
    semanticCategory: "media-blocks",
    icon: "PlaySquare",
    tags: ["video", "audit", "production", "poster"],
    schema: ["eyebrow", "headline", "body", "videoUrl", "videoPoster", "videoMeta"],
    variants: ["video-audit", "video-presentation", "video-hero"],
    animations: ["play-overlay"],
    narrativeRole: "Через видео быстро снимает сомнение в масштабе и реальности компании.",
  },
  "before-after": {
    ...defaultSemanticMetadata,
    semanticCategory: "media-blocks",
    icon: "Columns3",
    tags: ["comparison", "redesign", "transformation"],
    schema: ["eyebrow", "headline", "body", "beforeTitle", "beforeItems", "afterTitle", "afterItems"],
    variants: ["before-after", "ai-visual-enhancement", "competitor-gap"],
    animations: ["compare-slider"],
    narrativeRole: "Визуально продает разницу между старой и новой digital-подачей.",
  },
  timeline: {
    ...defaultSemanticMetadata,
    semanticCategory: "process-blocks",
    icon: "Route",
    tags: ["process", "roadmap", "timeline"],
    schema: ["eyebrow", "headline", "body", "timelineSteps"],
    variants: ["workflow", "timeline", "seo-roadmap"],
    narrativeRole: "Снижает тревожность клиента через понятные этапы и сроки.",
  },
  commercial: {
    ...defaultSemanticMetadata,
    semanticCategory: "cta-blocks",
    icon: "ReceiptText",
    tags: ["commercial", "offer", "pricing", "scope"],
    schema: ["eyebrow", "headline", "body", "commercialCards"],
    variants: ["commercial-offer", "executive-cta", "next-step"],
    narrativeRole: "Фиксирует формат работы, ценность и коммерческую рамку.",
  },
  "about-panel": {
    ...defaultSemanticMetadata,
    semanticCategory: "contact-blocks",
    icon: "UserRound",
    tags: ["founder", "expertise", "contact", "trust"],
    schema: ["eyebrow", "headline", "body", "bullets", "cta"],
    variants: ["founder-block", "b2b-positioning", "direct-contact"],
    narrativeRole: "Персонализирует предложение и усиливает доверие к исполнителю.",
  },
  cta: {
    ...defaultSemanticMetadata,
    semanticCategory: "contact-blocks",
    icon: "Send",
    tags: ["cta", "contact", "closing", "next-step"],
    schema: ["eyebrow", "headline", "body", "cta", "contacts", "photoUrl"],
    variants: ["final-cta", "contact-cta", "direct-contact"],
    narrativeRole: "Закрывает pitch понятным следующим действием и прямым контактом.",
  },
  "custom-html": {
    ...defaultSemanticMetadata,
    semanticCategory: "custom-blocks",
    icon: "Code2",
    tags: ["custom", "html", "experimental"],
    schema: ["customHtml"],
    variants: ["owner-custom-html"],
    darkModeSupport: false,
    pdfSupport: false,
    mobileSupport: false,
    narrativeRole: "Временный escape hatch для ручных блоков, пока нет controlled schema.",
  },
  "rich-text": {
    ...defaultSemanticMetadata,
    semanticCategory: "custom-blocks",
    icon: "FileText",
    tags: ["rich-text", "wysiwyg", "text", "custom"],
    schema: ["eyebrow", "richTextHtml"],
    variants: ["rich-text-single"],
    catalogEnabled: true,
    narrativeRole: "Свободный текстовый блок с форматированием, фото, видео и кодом.",
  },
  "section-heading": {
    ...defaultSemanticMetadata,
    semanticCategory: "custom-blocks",
    icon: "Heading",
    tags: ["divider", "heading", "editorial", "structure"],
    schema: ["eyebrow", "headline", "body", "headingAlign", "headlineDesktopSize", "headlineMobileSize", "subheadlineDesktopSize", "subheadlineMobileSize"],
    variants: ["left-aligned", "centered", "right-aligned"],
    catalogEnabled: true,
    narrativeRole: "Разделитель секций с журнальным заголовком и подзаголовком — очерчивает структуру документа.",
  },
  // ── V3 Document Builder ─────────────────────────────────────────────────
  "doc-section": {
    ...defaultSemanticMetadata,
    semanticCategory: "custom-blocks",
    icon: "Layers",
    tags: ["v3", "section", "divider"],
    schema: ["headline", "body"],
    variants: [],
    catalogEnabled: false,
    narrativeRole: "V3: разделитель главы с заголовком и подзаголовком.",
  },
  "doc-text": {
    ...defaultSemanticMetadata,
    semanticCategory: "custom-blocks",
    icon: "Type",
    tags: ["v3", "text", "rich-text"],
    schema: ["richTextHtml"],
    variants: [],
    catalogEnabled: false,
    narrativeRole: "V3: форматированный текстовый блок (TipTap HTML).",
  },
  "doc-media": {
    ...defaultSemanticMetadata,
    semanticCategory: "custom-blocks",
    icon: "Image",
    tags: ["v3", "media", "image", "video"],
    schema: ["photoUrl", "mediaType", "mediaDisplay", "body"],
    variants: [],
    catalogEnabled: false,
    narrativeRole: "V3: изображение или видео.",
  },
  "doc-embed": {
    ...defaultSemanticMetadata,
    semanticCategory: "custom-blocks",
    icon: "Code",
    tags: ["v3", "embed", "youtube", "html"],
    schema: ["embedType", "embedCode"],
    variants: [],
    catalogEnabled: false,
    narrativeRole: "V3: встраиваемый HTML/YouTube/iframe контент.",
  },
  "doc-ai": {
    ...defaultSemanticMetadata,
    semanticCategory: "custom-blocks",
    icon: "Sparkles",
    tags: ["v3", "ai", "generated"],
    schema: ["aiPrompt", "aiSourceUrl", "aiResult", "aiStatus"],
    variants: [],
    catalogEnabled: false,
    narrativeRole: "V3: блок с AI-сгенерированным контентом.",
  },
  "doc-contacts": {
    ...defaultSemanticMetadata,
    semanticCategory: "custom-blocks",
    icon: "User",
    tags: ["v3", "contacts", "cta"],
    schema: ["headline", "body", "photoUrl", "contacts", "ctaLabel", "ctaHref", "ctaLabelSecondary", "ctaHrefSecondary"],
    variants: [],
    catalogEnabled: false,
    narrativeRole: "V3: блок контактов с фото, контактными данными и CTA-кнопками.",
  },
  "doc-agency-pitch": {
    ...defaultSemanticMetadata,
    semanticCategory: "custom-blocks",
    icon: "Briefcase",
    tags: ["v3", "agency", "pitch", "faq", "cta"],
    schema: ["headline", "body", "agencyName", "pitchSections", "pitchStats", "pitchItems", "pitchBullets", "faqItems", "pitchCtaUrl", "pitchCtaContact"],
    variants: ["default"],
    catalogEnabled: true,
    narrativeRole: "V3: агентский питч-блок — проблема, цифры компании, состав работ, преимущества, этапы, FAQ и CTA. Редактируемые секции.",
  },
};

function generateBlockId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const factoryHeroCards: HeroCardItem[] = [
  {
    caption: "Рынок",
    value: "Сложные металлоконструкции",
    copy: "Поставка каркасов, пролетов и узлов для промышленных и логистических объектов по России.",
  },
  {
    caption: "Фокус",
    value: "Срок + точность",
    copy: "Работаем по чертежам КМ/КМД, контролируем геометрию, маркировку и отгрузку партиями под график монтажа.",
  },
];

const factoryMetrics: ProposalMetric[] = [
  { value: "14", label: "лет в проектировании и производстве" },
  { value: "18 000 м2", label: "производственная площадка" },
  { value: "320+", label: "объектов в портфеле" },
];

const factoryPhotos: GalleryPhoto[] = [
  {
    meta: "Сборка ферм",
    caption: "Участок крупноузловой сборки с контролем диагоналей и сварочных швов.",
    url: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1600&q=80",
  },
  {
    meta: "Линия раскроя",
    caption: "Плазменная резка и подготовка деталей под серию и индивидуальные позиции.",
    url: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&w=1400&q=80",
  },
  {
    meta: "Контроль качества",
    caption: "Проверка геометрии и маркировки перед отгрузкой на площадку заказчика.",
    url: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=1400&q=80",
  },
];

const factoryTimeline: TimelineStep[] = [
  {
    index: "Этап 01",
    title: "Бриф и аудит текущей подачи",
    body: "Фиксируем целевые сегменты клиентов, типовые сделки и что именно должно усиливать доверие в digital.",
  },
  {
    index: "Этап 02",
    title: "Сборка структуры и блоков",
    body: "Собираем страницу как коммерческий маршрут: обложка, доказательства, медиа, условия и контактный переход.",
  },
  {
    index: "Этап 03",
    title: "Полировка и публикация",
    body: "Доводим типографику, ритм и формулировки; выдаем ссылку, которую удобно смотреть и пересылать с телефона.",
  },
];

const factoryCommercial: CommercialCard[] = [
  {
    label: "Пакет BASE",
    price: "от 380 000 Р",
    meta: "Структура, визуальная система, 8-10 блоков, контентная упаковка и финальный mobile-share поток.",
    featured: true,
  },
  {
    label: "Срок запуска",
    meta: "3-5 недель при наличии фото/видео и ответственного лица со стороны компании.",
  },
  {
    label: "Результат",
    meta: "Рабочая цифровая подача для коммерческих переговоров, тендеров и отправки в мессенджерах.",
  },
];

const factoryContacts: ContactItem[] = [
  { label: "Телефон", value: "+7 921 201-32-52", href: "tel:+79212013252", meta: "Позвонить или написать SMS" },
  { label: "Telegram", value: "@bilarius", href: "https://t.me/bilarius", meta: "Быстрее всего отвечу здесь" },
  { label: "Max.ru (ВКонтакте)", value: "Написать в Max", href: "https://vk.me/bilarius", meta: "Альтернативный мессенджер" },
  { label: "Email", value: "bilariuss@yandex.ru", href: "mailto:bilariuss@yandex.ru" },
];

export const proposalBlockTemplates: ProposalBlockTemplate[] = [
  {
    type: "hero",
    category: "Открытие",
    label: "Обложка",
    description: "Первый экран с тёмным фото-фоном, главным заголовком и боковыми карточками.",
    defaultTitle: "Обложка",
    createPayload: () => ({
      eyebrow: "Северный Контур Машиностроение · цифровой концепт",
      headline: "Промышленная компания должна выглядеть убедительно с первого экрана",
      body: "Собираем спокойный, дорогой первый экран: сильная формулировка, производственный фон и один визуальный акцент справа.",
      backgroundImageUrl: "https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1800&q=80",
      overlayOpacity: 72,
      headlineDesktopSize: 56,
      headlineMobileSize: 34,
      ctaLabel: "Смотреть структуру",
      ctaHref: "#content",
      ctaLabelSecondary: "Перейти к контактам",
      ctaHrefSecondary: "#contact",
      heroCards: factoryHeroCards,
      photoUrl: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80",
    }),
  },
  {
    type: "editorial",
    category: "Нарратив",
    label: "Редакционный блок",
    description: "Текстовый блок с заголовком, основным текстом и двумя колонками заметок.",
    defaultTitle: "Редакционный текст",
    createPayload: () => ({
      eyebrow: "01 / Позиционирование",
      headline: "Это не редизайн ради внешнего вида, а коммерческий инструмент для производственной продажи",
      body: "Существующий сайт Северного Контура содержит опыт и факты, но не собирает их в убедительный маршрут для B2B-заказчика.",
      bullets: [
        "Новый контур страницы ведет клиента от первого впечатления к доказательствам и далее к конкретному следующему шагу.",
        "Структура сразу адаптирована под мобильный просмотр и пересылку в чаты закупщиков, подрядчиков и собственников.",
      ],
    }),
  },
  {
    type: "metrics",
    category: "Нарратив",
    label: "Метрики",
    description: "Три числовых показателя компании в виде крупных карточек.",
    defaultTitle: "Ключевые показатели",
    createPayload: () => ({
      eyebrow: "02 / Факты",
      headline: "Цифры фиксируют масштаб и снимают сомнения до личного звонка",
      metrics: factoryMetrics,
    }),
  },
  {
    type: "gallery-photo",
    category: "Медиа",
    label: "Фото-галерея",
    description: "Сетка из трёх производственных фотографий с подписями.",
    defaultTitle: "Фото-галерея",
    createPayload: () => ({
      eyebrow: "03 / Производственная среда",
      headline: "Фотоблок показывает не абстрактный бренд, а реальную операционную мощность",
      body: "Сильные кадры цеха и команды делают коммерческое предложение предметным и достоверным.",
      photos: factoryPhotos,
    }),
  },
  {
    type: "gallery-showcase",
    category: "Медиа",
    label: "Фото 100%",
    description: "Полноширинное фото с опциональной подписью снизу.",
    defaultTitle: "Фото 100%",
    createPayload: () => ({
      photoUrl: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&w=1800&q=80",
      body: "",
      captionDesktopSize: 16,
      captionMobileSize: 14,
    }),
  },
  {
    type: "video-block",
    category: "Медиа",
    label: "Видео-блок",
    description: "Большой видео-кадр с постером и тремя информационными панелями.",
    defaultTitle: "Видео",
    createPayload: () => ({
      eyebrow: "05 / Видео-погружение",
      headline: "Видео доказывает динамику производства и снимает главный вопрос: реально ли компания такого масштаба",
      body: "Одна сильная видео-секция закрывает недоверие быстрее длинных описаний, особенно в мобильном просмотре.",
      videoMeta: "Северный Контур · маршрут производства за 90 секунд",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoPoster: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1800&q=80",
    }),
  },
  {
    type: "before-after",
    category: "Сравнение",
    label: "До / После",
    description: "Интерактивный compare-блок с перетаскиваемым разделителем.",
    defaultTitle: "До / После",
    createPayload: () => ({
      eyebrow: "06 / Сравнение",
      headline: "До/после наглядно показывает, как меняется восприятие компании после переупаковки",
      body: "Блок помогает собственнику увидеть разницу в тоне, структуре и коммерческой читаемости.",
      beforeTitle: "Текущая подача дробит внимание и теряет ценность",
      beforeItems: [
        "Слабый первый экран без внятного промышленного образа",
        "Факты, фото и коммерческая часть не связаны в один маршрут",
        "В мобильном просмотре страница теряет убедительность",
      ],
      afterTitle: "Новая версия сразу транслирует масштаб и управляемость",
      afterItems: [
        "Четкая иерархия блоков, которую удобно читать с телефона",
        "Фото/видео работают как доказательство, а не как декор",
        "Финальный CTA естественно переводит к диалогу по проекту",
      ],
    }),
  },
  {
    type: "timeline",
    category: "Нарратив",
    label: "Этапы / Таймлайн",
    description: "Три шага реализации проекта в виде пронумерованных карточек.",
    defaultTitle: "Этапы проекта",
    createPayload: () => ({
      eyebrow: "07 / План внедрения",
      headline: "Проект движется по этапам, понятным собственнику, маркетингу и продажам",
      body: "Маршрут без лишней бюрократии: быстро собираем рабочую подачу и запускаем в реальный оборот ссылок.",
      timelineSteps: factoryTimeline,
    }),
  },
  {
    type: "commercial",
    category: "Коммерция",
    label: "Коммерческий блок",
    description: "Прайс-секция с тремя карточками условий и стоимости.",
    defaultTitle: "Коммерческое предложение",
    createPayload: () => ({
      eyebrow: "08 / Коммерческая рамка",
      headline: "Стоимость и условия должны быть продолжением логики страницы, а не отдельной таблицей",
      body: "Показываем, что компания получает на выходе и зачем это помогает в реальных продажах.",
      commercialCards: factoryCommercial,
    }),
  },
  {
    type: "about-panel",
    category: "Доверие",
    label: "О дизайнере / Авторе",
    description: "Тёмный блок с кратким позиционированием, двумя тезисами и CTA.",
    defaultTitle: "Обо мне",
    createPayload: () => ({
      eyebrow: "09 / Подход команды",
      headline: "Мы проектируем не витрину, а переговорный digital-инструмент для индустриальных продаж",
      body: "Фокус на том, чтобы коммерческий директор, собственник и клиент быстро считали зрелость компании и понимали следующий шаг.",
      ctaLabel: "Смотреть метод",
      ctaHref: "#contact",
      ctaLabelSecondary: "Обсудить проект",
      ctaHrefSecondary: "#contact",
      bullets: [
        "Industrial, B2B и сложные сделки с длинным циклом",
        "Сначала бизнес-маршрут, затем визуальная сборка",
      ],
    }),
  },
  {
    type: "cta",
    category: "Закрытие",
    label: "Финальный CTA",
    description: "Тёмный блок с призывом к действию, фото и контактами.",
    defaultTitle: "Контакт",
    createPayload: () => ({
      eyebrow: "Следующий шаг",
      headline: "Обсудим ваш проект",
      body: "Пишите в любой мессенджер или звоните. Расскажу что именно можно сделать с вашим производством — бесплатный короткий разбор в любом формате.",
      ctaLabel: "Написать в Telegram",
      ctaHref: "https://t.me/bilarius",
      ctaLabelSecondary: "Позвонить",
      ctaHrefSecondary: "tel:+79212013252",
      contacts: factoryContacts,
      photoUrl: "",
    }),
  },
  {
    type: "custom-html",
    category: "Произвольное",
    label: "Произвольный HTML",
    description: "Вставка любого HTML-кода — для AI-генерированных или кастомных блоков.",
    defaultTitle: "Кастомный блок",
    createPayload: () => ({
      eyebrow: "Кастомный блок",
      headline: "Произвольный HTML",
      customHtml: "<!-- Вставьте HTML-код блока сюда -->",
    }),
  },
  {
    type: "rich-text",
    category: "Произвольное",
    label: "Текстовый блок (WYSIWYG)",
    description: "Редактор как в Word: заголовки, списки, жирный, курсив, фото, видео YouTube, код.",
    defaultTitle: "Текстовый блок",
    createPayload: () => ({
      eyebrow: "",
      richTextHtml: "<p>Введите текст блока...</p>",
    }),
  },
  {
    type: "section-heading",
    category: "Структура",
    label: "Заголовок-разделитель",
    description: "Большой журнальный заголовок с подзаголовком и кикером. Разделяет документ на тематические секции.",
    defaultTitle: "Разделитель",
    createPayload: () => ({
      eyebrow: "Новый раздел",
      headline: "Заголовок раздела пишется большим, чётким и без лишних слов",
      body: "Подзаголовок раскрывает контекст раздела без перегрузки читателя.",
      headingAlign: "left" as const,
      headlineDesktopSize: 80,
      headlineMobileSize: 44,
      subheadlineDesktopSize: 20,
      subheadlineMobileSize: 17,
    }),
  },
  {
    type: "doc-agency-pitch",
    category: "Агентство",
    label: "Агентский питч",
    description: "Полный коммерческий питч агентства: проблема, цифры, состав услуг, этапы, FAQ и CTA. Секции можно скрывать/показывать.",
    defaultTitle: "Агентский питч",
    createPayload: (): ProposalBlockPayload => ({
      headline: "Без сайта вы теряете клиентов каждый день",
      body: "Современный продающий сайт — не расход, а инфраструктура роста. Мы создаём сайты, которые работают на ваш бизнес 24/7.",
      agencyName: "Konversus",
      eyebrow: "Коммерческое предложение",
      pitchSections: ["problem", "stats", "composition", "benefits", "process", "faq", "cta"],
      pitchStats: [
        { value: "8+", label: "лет на рынке" },
        { value: "120+", label: "проектов запущено" },
        { value: "×2.4", label: "рост конверсии в среднем" },
        { value: "14 дней", label: "средний срок запуска" },
      ] as PitchStat[],
      pitchItems: [
        { num: "01", title: "Стратегия и структура", body: "Анализируем рынок, аудиторию и конкурентов. Строим маршрут пользователя от первого экрана до заявки." },
        { num: "02", title: "Дизайн и разработка", body: "Уникальный визуальный стиль под ваш бренд. Чистый адаптивный код, быстрая загрузка, SEO-фундамент." },
        { num: "03", title: "Контент и запуск", body: "Пишем тексты, обрабатываем фото и видео. Запускаем сайт и настраиваем аналитику." },
      ] as PitchItem[],
      pitchBullets: [
        "Скорость загрузки до 1 сек — меньше отказов, выше позиции",
        "Мобильная версия с первого дня разработки",
        "Интеграция с CRM и мессенджерами под ключ",
        "Поддержка и обновления без дополнительных расходов",
      ],
      faqItems: [
        { question: "Сколько стоит сайт?", answer: "Стоимость зависит от сложности и объёма контента. Базовый лендинг — от 80 000 Р, корпоративный сайт — от 250 000 Р. Подготовим точный расчёт после брифинга." },
        { question: "Как долго длится разработка?", answer: "Лендинг — 10–14 рабочих дней, многостраничный сайт — 30–45 дней. Сроки фиксируются в договоре." },
        { question: "Что нужно от нас?", answer: "Ваши логотип, фото продукта или команды, описание услуг и список конкурентов. Остальное берём на себя." },
        { question: "Вы делаете поддержку после запуска?", answer: "Да, первые 2 недели поддержка бесплатная. Далее — по договору: ежемесячное обслуживание или пакет часов." },
      ] as FaqItem[],
      pitchCtaUrl: "https://t.me/bilarius",
      pitchCtaContact: "@bilarius",
    }),
  },
];

export const proposalBlockCatalog: ProposalBlockCatalogItem[] = proposalBlockTemplates.map((template) => ({
  ...template,
  ...proposalBlockSemanticMetadata[template.type],
}));

export const activeProposalBlockCatalog = proposalBlockCatalog.filter((template) => template.catalogEnabled);

export function getProposalBlockCategoryInfo(categoryId: ProposalBlockCategoryId) {
  return proposalBlockCategories.find((category) => category.id === categoryId) ?? null;
}

export function getProposalBlockCatalogByCategory() {
  return proposalBlockCategories
    .map((category) => ({
      category,
      blocks: activeProposalBlockCatalog.filter((block) => block.semanticCategory === category.id),
    }))
    .filter((group) => group.blocks.length > 0);
}

export function getProposalBlockTemplate(type: ProposalBlockType) {
  return proposalBlockCatalog.find((template) => template.type === type) ?? null;
}

export function getProposalBlockLabel(type: ProposalBlockType) {
  return getProposalBlockTemplate(type)?.label ?? type;
}

export function getProposalBlockCategory(type: ProposalBlockType) {
  return getProposalBlockTemplate(type)?.category ?? "Без категории";
}

export function getRecommendedNextBlockTypes(currentType?: ProposalBlockType | null): ProposalBlockType[] {
  if (!currentType) {
    return ["hero", "editorial", "metrics", "gallery-photo"];
  }

  if (currentType === "hero") {
    return ["editorial", "metrics", "gallery-photo", "gallery-showcase"];
  }

  if (["editorial", "metrics"].includes(currentType)) {
    return ["gallery-photo", "gallery-showcase", "video-block", "before-after"];
  }

  if (["gallery-photo", "gallery-showcase", "video-block"].includes(currentType)) {
    return ["before-after", "timeline", "commercial", "cta"];
  }

  if (currentType === "before-after" || currentType === "timeline") {
    return ["commercial", "about-panel", "cta"];
  }

  return ["editorial", "gallery-photo", "timeline", "cta"];
}

export function getRecommendedNextBlockTemplates(currentType?: ProposalBlockType | null) {
  const types = getRecommendedNextBlockTypes(currentType);
  return activeProposalBlockCatalog.filter((template) => types.includes(template.type));
}

export function createProposalBlock(type: ProposalBlockType): ProposalBlock {
  const template = getProposalBlockTemplate(type);

  if (!template) {
    throw new Error("Неизвестный тип блока концепта.");
  }

  return {
    id: generateBlockId(),
    type,
    title: template.defaultTitle,
    visible: true,
    payload: template.createPayload(),
  };
}

export function createHeroVariantBlock(variant: NonNullable<ProposalBlockPayload["heroVariant"]>): ProposalBlock {
  const block = createProposalBlock("hero");

  if (variant === "color-photo-right") {
    return {
      ...block,
      title: "Hero цвет + фото справа",
      payload: {
        ...block.payload,
        heroVariant: variant,
        backgroundImageUrl: "",
        backgroundColor: "#f4efe7",
        textColor: "#14181d",
        headline: "Сильная производственная подача без визуального шума",
        body: "Чистый цветовой фон, крупный заголовок и один уверенный кадр справа помогают быстро считать масштаб компании.",
        overlayOpacity: 0,
      },
    };
  }

  if (variant === "color-photo-left") {
    return {
      ...block,
      title: "Hero фото слева + цвет",
      payload: {
        ...block.payload,
        heroVariant: variant,
        backgroundImageUrl: "",
        backgroundColor: "#111820",
        textColor: "#f7f2ea",
        headline: "Точная инженерная история начинается с ясного первого экрана",
        body: "Фото задает материальность, а спокойная типографика держит внимание на коммерческом сообщении.",
        overlayOpacity: 0,
      },
    };
  }

  return {
    ...block,
    payload: {
      ...block.payload,
      heroVariant: variant,
    },
  };
}

type DefaultStructureSeed = {
  companyName?: string | null;
  title: string;
  headline?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
};

export function createDefaultProposalStructure(seed: DefaultStructureSeed) {
  const hero = createProposalBlock("hero");

  if (seed.companyName) {
    hero.payload.eyebrow = `Концепт для ${seed.companyName}`;
  }

  if (seed.headline) {
    hero.payload.headline = seed.headline;
  }

  if (seed.subheadline) {
    hero.payload.body = seed.subheadline;
  }

  if (seed.ctaLabel) {
    hero.payload.ctaLabel = seed.ctaLabel;
  }

  return [hero];
}

export function normalizeProposalBlocks(blocks: ProposalBlock[]) {
  // Цвета, которые были выставлены автоматически шаблоном — не пользователем.
  // Стрипаем их для всех non-hero блоков, чтобы палитра страницы работала.
  const TEMPLATE_DEFAULT_BG = new Set([
    "#0d1116", "#101820", "#0a0e13", "#171e25", "#111820",
  ]);

  return blocks.map((block) => {
    const heroDefaults = block.type === "hero" ? getProposalBlockTemplate("hero")?.createPayload() : null;

    const rawBg = block.payload?.backgroundColor;
    const isSystemDefault =
      block.type !== "hero" &&
      rawBg != null &&
      TEMPLATE_DEFAULT_BG.has(String(rawBg).toLowerCase());
    const backgroundColor = isSystemDefault ? undefined : (rawBg || undefined);
    const textColor = isSystemDefault ? undefined : (block.payload?.textColor || undefined);

    return {
      ...block,
      visible: block.visible !== false,
      payload: {
        ...block.payload,
        eyebrow: block.payload?.eyebrow ?? "",
        headline: block.payload?.headline ?? "",
        body: block.payload?.body ?? "",
        backgroundImageUrl: block.payload?.backgroundImageUrl || heroDefaults?.backgroundImageUrl || "",
        backgroundColor,
        textColor,
        overlayOpacity: typeof block.payload?.overlayOpacity === "number" ? block.payload.overlayOpacity : 72,
        headlineDesktopSize: typeof block.payload?.headlineDesktopSize === "number" ? block.payload.headlineDesktopSize : 56,
        headlineMobileSize: typeof block.payload?.headlineMobileSize === "number" ? block.payload.headlineMobileSize : 34,
        heroVariant: block.payload?.heroVariant || "image-split",
        bullets: Array.isArray(block.payload?.bullets) ? block.payload.bullets : [],
        metrics: Array.isArray(block.payload?.metrics) ? block.payload.metrics : [],
        heroCards: Array.isArray(block.payload?.heroCards) ? block.payload.heroCards : [],
        photos: Array.isArray(block.payload?.photos) ? block.payload.photos : [],
        timelineSteps: Array.isArray(block.payload?.timelineSteps) ? block.payload.timelineSteps : [],
        commercialCards: Array.isArray(block.payload?.commercialCards) ? block.payload.commercialCards : [],
        contacts: Array.isArray(block.payload?.contacts) ? block.payload.contacts : [],
        beforeItems: Array.isArray(block.payload?.beforeItems) ? block.payload.beforeItems : [],
        afterItems: Array.isArray(block.payload?.afterItems) ? block.payload.afterItems : [],
        ctaLabel: block.payload?.ctaLabel ?? "",
        ctaHref: block.payload?.ctaHref ?? "",
        ctaLabelSecondary: block.payload?.ctaLabelSecondary ?? "",
        ctaHrefSecondary: block.payload?.ctaHrefSecondary ?? "",
        videoUrl: block.payload?.videoUrl ?? "",
        videoPoster: block.payload?.videoPoster ?? "",
        videoMeta: block.payload?.videoMeta ?? "",
        beforeTitle: block.payload?.beforeTitle ?? "",
        afterTitle: block.payload?.afterTitle ?? "",
        customHtml: block.payload?.customHtml ?? "",
        photoUrl: block.payload?.photoUrl || heroDefaults?.photoUrl || "",
        headingAlign: block.payload?.headingAlign ?? "left",
        subheadlineDesktopSize: typeof block.payload?.subheadlineDesktopSize === "number" ? block.payload.subheadlineDesktopSize : 20,
        subheadlineMobileSize: typeof block.payload?.subheadlineMobileSize === "number" ? block.payload.subheadlineMobileSize : 17,
        captionDesktopSize: typeof block.payload?.captionDesktopSize === "number" ? block.payload.captionDesktopSize : 16,
        captionMobileSize: typeof block.payload?.captionMobileSize === "number" ? block.payload.captionMobileSize : 14,
        // doc-agency-pitch
        agencyName: block.payload?.agencyName ?? "",
        pitchSections: Array.isArray(block.payload?.pitchSections) ? block.payload.pitchSections : ["problem", "stats", "composition", "benefits", "process", "faq", "cta"],
        pitchStats: Array.isArray(block.payload?.pitchStats) ? block.payload.pitchStats : [],
        pitchItems: Array.isArray(block.payload?.pitchItems) ? block.payload.pitchItems : [],
        pitchBullets: Array.isArray(block.payload?.pitchBullets) ? block.payload.pitchBullets : [],
        faqItems: Array.isArray(block.payload?.faqItems) ? block.payload.faqItems : [],
        pitchCtaUrl: block.payload?.pitchCtaUrl ?? "",
        pitchCtaContact: block.payload?.pitchCtaContact ?? "",
        pitchBrandColor: block.payload?.pitchBrandColor ?? "#0066CC",
      },
    };
  });
}
