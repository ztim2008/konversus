/**
 * Профили отправителя КП (гипотезы A/B).
 * Активный — из settings; снимок «Игорь» сохранён для отката.
 */
import { getSetting } from "@/lib/data/settings";

export const SETTING_SENDER_PROFILE = "lead_radar_sender_profile";

export type SenderProfileId = "igor" | "alexey";

export type SenderProfile = {
  id: SenderProfileId;
  /** Короткое имя для писем */
  displayName: string;
  /** Полное ФИО (если нужно) */
  fullName: string;
  role: string;
  brand: string;
  tagline: string;
  phoneE164: string;
  phoneDisplay: string;
  /** From display-name в SMTP */
  fromName: string;
  /** Reply-To (если пусто — SMTP_USER на отправке) */
  replyToEmail: string;
  /** Главный сайт (CTA / interest redirect) */
  primarySiteUrl: string;
  primarySiteLabel: string;
  /** Доп. портфолио */
  secondarySiteUrl?: string;
  secondarySiteLabel?: string;
  videoUrl?: string;
  videoLabel?: string;
  photoUrl?: string;
  /** Кратко для AI: чем отличаемся */
  offerHint: string;
  /** Блок услуг в HTML-шаблоне (короткие пункты) */
  offerBullets?: readonly string[];
};

/** Снимок гипотезы A — Игорь / lead-web.pro (не удалять). */
export const SENDER_PROFILE_IGOR: SenderProfile = {
  id: "igor",
  displayName: "Игорь",
  fullName: "Игорь",
  role: "веб-разработчик",
  brand: "lead-web.pro",
  tagline: "веб-разработка с умом и на результат",
  phoneE164: "+79238240461",
  phoneDisplay: "+7 (923) 824-04-61",
  fromName: "lead-web.pro",
  replyToEmail: "leadweb@yandex.ru",
  primarySiteUrl: "https://lead-web.pro/",
  primarySiteLabel: "lead-web.pro",
  offerHint:
    "сайты и доработки под заявки; бренд lead-web.pro; не упоминай Konversus",
};

/** Гипотеза B — Алексей / дерево-дома / Craftum. */
export const SENDER_PROFILE_ALEXEY: SenderProfile = {
  id: "alexey",
  displayName: "Алексей",
  fullName: "Алексей Тимофеев",
  role: "специалист по сайтам для строителей",
  brand: "russait.ru",
  tagline: "сайты для тех, кто строит из дерева",
  phoneE164: "+79212013252",
  phoneDisplay: "+7 (921) 201-32-52",
  fromName: "Алексей · russait.ru",
  replyToEmail: "",
  primarySiteUrl: "https://russait.ru/",
  primarySiteLabel: "russait.ru",
  secondarySiteUrl: "https://маркет-фон.рф/",
  secondarySiteLabel: "маркет-фон.рф",
  videoUrl: "https://vkvideo.ru/@craftum_design",
  videoLabel: "Видеоканал Craftum Design",
  photoUrl:
    "https://konversus.ru/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg",
  offerHint:
    "сайты и лендинги (Craftum и др.) для домов/бань/каркаса/бытовок/веранд; доп. услуги: ИИ-обработка фото для портфолио, КП и каталоги PDF, реклама и разбор конкурентов, слабые места в воронке заявок; портфолио russait.ru и маркет-фон.рф; не упоминай Konversus и Игоря",
  offerBullets: [
    "Обработка фото объектов с помощью ИИ — аккуратное портфолио без «сырых» снимков",
    "Коммерческие предложения и презентации под объекты / клиентов",
    "Каталог продукции: буклет или PDF для менеджеров и выставок",
    "Настройка рекламы и аналитика конкурентов — где теряются заявки",
    "Разбор слабых сторон сайта и воронки: что мешает звонкам",
  ],
};

export const SENDER_PROFILES: Record<SenderProfileId, SenderProfile> = {
  igor: SENDER_PROFILE_IGOR,
  alexey: SENDER_PROFILE_ALEXEY,
};

/** Активная гипотеза по умолчанию после переключения вектора. */
export const DEFAULT_SENDER_PROFILE_ID: SenderProfileId = "alexey";

export function getSenderProfileById(
  id: string | null | undefined
): SenderProfile {
  if (id === "igor" || id === "alexey") return SENDER_PROFILES[id];
  return SENDER_PROFILES[DEFAULT_SENDER_PROFILE_ID];
}

export async function getActiveSenderProfile(): Promise<SenderProfile> {
  const raw = (await getSetting(SETTING_SENDER_PROFILE)).trim().toLowerCase();
  return getSenderProfileById(raw || DEFAULT_SENDER_PROFILE_ID);
}

export function buildKpSystemPrompt(profile: SenderProfile): string {
  return `Ты пишешь исходящие письма от лица ${profile.displayName} — ${profile.role}, бренд ${profile.brand}.
Не упоминай Konversus. Не упоминай Игоря и lead-web.pro, если бренд не lead-web.pro.
Представляйся как человек: ${profile.fullName}, ${profile.role}.
Оффер: ${profile.offerHint}.

Задача: короткий персональный текст письма владельцу бизнеса в нише деревянного домостроения / бань / каркаса / бытовок / веранд (тело без HTML).

ПРАВИЛА:
1. Не шаблонничай — опирайся на факты сайта.
2. Учти CMS/платформу: Tilda/Wix/Craftum — про рост заявок и доверие; WordPress — скорость/дизайн; Битрикс — доработки; самописный — как плюс зрелости.
3. 1–2 конкретные проблемы и зачем это бьёт по заявкам (сезон, объекты, «посмотреть проекты», звонок).
4. 1 мысль: как сайт/лендинг даст больше заявок именно в их сегменте (дома, бани, каркас и т.п.).
5. Коротко упомяни 1–2 доп. услуги из оффера, если уместно сайту (ИИ-фото портфолио, КП/каталог PDF, реклама/конкуренты, разбор воронки) — без прайса и без длинного списка.
6. Живой тон, без угроз и без «вы нарушаете закон». Про риски cookie/политики — мягко.
7. Один бесплатный совет.
8. 130–220 слов. Без markdown. Без темы письма в теле. Без блока контактов и телефона в конце (их добавит шаблон). Без полного прайс-листа услуг (список услуг будет в шаблоне отдельно).
9. Не описывай скриншот — он будет в письме отдельно.
10. В первом абзаце можно коротко: «Меня зовут ${profile.displayName}…» — не в каждом предложении.

СТРУКТУРА:
- Приветствие (по имени если есть, иначе «Здравствуйте!»)
- Кто пишет (${profile.displayName}, ${profile.role}) + что посмотрели и одна конкретная деталь
- Проблема → влияние на заявки
- Что могу предложить коротко (сайт + 1–2 смежные услуги по делу)
- Бесплатный совет
- Мягкий переход: удобнее созвониться (без номера телефона и URL — их добавит шаблон)`;
}

export function buildKpFallbackBody(
  profile: SenderProfile,
  ctx: {
    domain: string;
    city?: string;
    cms?: string;
    contactName?: string;
    issues?: string[];
  }
): string {
  const issues =
    (ctx.issues || []).slice(0, 3).join("; ") ||
    "несколько точек роста по сайту под заявки";
  return `Здравствуйте${ctx.contactName ? `, ${ctx.contactName}` : ""}!

Меня зовут ${profile.fullName}, ${profile.role} (${profile.brand}). Посмотрел сайт ${ctx.domain}${ctx.city ? ` (${ctx.city})` : ""}${ctx.cms ? `, платформа ${ctx.cms}` : ""}. Заметил: ${issues}.

В вашей нише сайт часто решает, позвонят ли после просмотра проектов или уйдут к конкуренту. Могу помочь с сайтом под заявки и по желанию — с фото для портфолио (ИИ), КП/каталогом PDF или разбором рекламы конкурентов.

Если откликнется — удобнее созвониться или ответить на письмо, подскажу без обязательства.`;
}
