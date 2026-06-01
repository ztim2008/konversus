export const companyStatuses = [
  "draft",
  "sent",
  "won",
  "archived",
] as const;

export const proposalStatuses = [
  "draft",
  "sent",
  "won",
  "archived",
] as const;

export const designPresets = [
  "industrial-dark",
  "tech-blue",
  "premium-light",
  "heavy-industry",
  "engineering-pro",
  "metal-tech",
] as const;

export const assetKinds = [
  "image",
  "video",
  "pdf",
  "document",
  "logo",
  "screenshot",
] as const;

export const assetSources = [
  "manual",
  "imported",
  "generated",
  "captured",
] as const;

export const shareLinkStatuses = [
  "draft",
  "active",
  "expired",
  "revoked",
] as const;

export type CompanyStatus = (typeof companyStatuses)[number];
export type ProposalStatus = (typeof proposalStatuses)[number];
export type DesignPreset = (typeof designPresets)[number];
export type AssetKind = (typeof assetKinds)[number];
export type AssetSource = (typeof assetSources)[number];
export type ShareLinkStatus = (typeof shareLinkStatuses)[number];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue | undefined }
  | JsonValue[];

export type ContactInfo = {
  email?: string;
  phone?: string;
  telegram?: string;
  whatsapp?: string;
  contactPerson?: string;
  responsible?: string;
  nextStep?: string;
  contactDeadline?: string;
  leadSource?: string;
};

export type ProposalMetric = {
  label: string;
  value: string;
};

export type ProposalBlockType =
  | "hero"
  | "editorial"
  | "metrics"
  | "gallery-photo"
  | "gallery-showcase"
  | "video-block"
  | "before-after"
  | "timeline"
  | "commercial"
  | "about-panel"
  | "cta"
  | "custom-html"
  | "rich-text"
  | "section-heading"
  // ── V3 Document Builder ──────────────────────────────────────────────
  | "doc-section"
  | "doc-text"
  | "doc-media"
  | "doc-embed"
  | "doc-ai"
  | "doc-contacts"
  | "doc-agency-pitch";

export type HeroCardItem = {
  caption: string;
  value: string;
  copy: string;
};

export type GalleryPhoto = {
  url?: string;
  meta?: string;
  caption?: string;
};

export type TimelineStep = {
  index: string;
  title: string;
  body?: string;
};

export type CommercialCard = {
  label: string;
  price?: string;
  meta?: string;
  featured?: boolean;
};

export type ContactItem = {
  label: string;
  value: string;
  href?: string;
  meta?: string;
};

export type PitchStat = {
  value: string;
  label: string;
};

export type PitchItem = {
  num: string;
  title: string;
  body: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type ProposalBlockPayload = {
  // Общие поля
  eyebrow?: string;
  headline?: string;
  body?: string;
  bullets?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  ctaLabelSecondary?: string;
  ctaHrefSecondary?: string;
  backgroundImageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  overlayOpacity?: number;
  headlineDesktopSize?: number;
  headlineMobileSize?: number;
  heroVariant?: "image-split" | "color-photo-right" | "color-photo-left";
  // Metrics
  metrics?: ProposalMetric[];
  // Hero
  heroCards?: HeroCardItem[];
  // Gallery
  photos?: GalleryPhoto[];
  // Video
  videoUrl?: string;
  videoPoster?: string;
  videoMeta?: string;
  // Before/After
  beforeTitle?: string;
  beforeItems?: string[];
  afterTitle?: string;
  afterItems?: string[];
  // Timeline
  timelineSteps?: TimelineStep[];
  // Commercial
  commercialCards?: CommercialCard[];
  // CTA/Contact
  contacts?: ContactItem[];
  photoUrl?: string;
  // Custom HTML
  customHtml?: string;
  // Rich Text (TipTap HTML output)
  richTextHtml?: string;
  // Section Heading
  headingAlign?: "left" | "center" | "right";
  subheadlineDesktopSize?: number;
  subheadlineMobileSize?: number;
  // Gallery Showcase (Фото 100%)
  captionDesktopSize?: number;
  captionMobileSize?: number;
  // ── V3 doc-media ────────────────────────────────────────────────────
  mediaType?: "image" | "video";
  mediaDisplay?: "full" | "contained" | "portrait";
  videoAspect?: "landscape" | "portrait" | "stories";
  // ── V3 doc-embed ────────────────────────────────────────────────────
  embedType?: "youtube" | "html" | "iframe";
  embedCode?: string;
  // ── V3 doc-ai ───────────────────────────────────────────────────────
  aiPrompt?: string;
  aiSourceUrl?: string;
  aiResult?: string;
  aiStatus?: "idle" | "generating" | "done" | "error";
  // ── V3 doc-agency-pitch ─────────────────────────────────────────────
  agencyName?: string;
  pitchSections?: string[];    // видимые секции: ["problem","stats","composition","benefits","process","tech","faq","cta"]
  pitchStats?: PitchStat[];
  pitchItems?: PitchItem[];    // универсальные карточки (состав, шаги и т.д.)
  pitchBullets?: string[];     // технические выгоды
  faqItems?: FaqItem[];
  pitchCtaUrl?: string;
  pitchCtaContact?: string;
  pitchBrandColor?: string;  // hex цвет бренда клиента, напр. "#0066CC"
};

export type ProposalBlock = {
  id: string;
  type: ProposalBlockType;
  title?: string;
  visible: boolean;
  payload: ProposalBlockPayload;
};

export type Company = {
  id: string;
  name: string;
  websiteUrl: string | null;
  industry: string | null;
  shortDescription: string | null;
  contacts: ContactInfo;
  notes: string | null;
  status: CompanyStatus;
  previewImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Proposal = {
  id: string;
  companyId: string;
  title: string;
  preset: DesignPreset;
  status: ProposalStatus;
  headline: string | null;
  subheadline: string | null;
  ctaLabel: string | null;
  structure: ProposalBlock[];
  settings: Record<string, JsonValue | undefined>;
  createdAt: string;
  updatedAt: string;
};

export type Asset = {
  id: string;
  proposalId: string;
  kind: AssetKind;
  storageBucket: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  altText: string | null;
  source: AssetSource;
  metadata: Record<string, JsonValue | undefined>;
  createdAt: string;
  updatedAt: string;
};

export type ShareLink = {
  id: string;
  proposalId: string;
  token: string;
  slug: string | null;
  status: ShareLinkStatus;
  expiresAt: string | null;
  viewCount: number;
  uniqueViewCount: number;
  mobileViewCount: number;
  desktopViewCount: number;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProposalFeedback = {
  id: string;
  proposalId: string;
  shareLinkId: string | null;
  authorName: string | null;
  rating: number | null;
  comment: string | null;
  createdAt: string;
};

export type ProposalFeedbackSummary = {
  totalCount: number;
  avgRating: number | null;
  latestComment: string | null;
  latestAuthor: string | null;
  latestAt: string | null;
};