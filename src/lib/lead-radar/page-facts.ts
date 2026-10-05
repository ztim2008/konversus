/**
 * Факты со страницы: честный H1, живой ящик, телефон, Telegram.
 * Чистые функции — без сети и без базы.
 */

const JUNK_H1 = new Set([
  "контакты",
  "контакт",
  "contacts",
  "contact",
  "отзывы",
  "отзыв",
  "reviews",
  "меню",
  "menu",
  "главная",
  "home",
  "каталог",
  "новости",
  "поиск",
  "корзина",
  "вход",
  "регистрация",
  "о нас",
  "о компании",
  "карта сайта",
  "sitemap",
  "ошибка",
  "404",
  "error",
]);

/** Общий ящик отдела, не человека. */
const ROLE_LOCAL =
  /^(info|mail|e-mail|email|office|sales|sale|zakaz|order|orders|hello|contact|contacts|admin|support|webmaster|reklama|manager|post|shop|opt|marketing|noreply|no-reply|no_reply|feedback|clients|client|hr|press|service|help|team|general|site|web|www|pochta|inbox|price|prices|pr|ads|job|jobs|billing|account|accounts|mailer|donotreply)$/i;

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, n) => codePointChar(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => codePointChar(parseInt(n, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&laquo;/gi, "«")
    .replace(/&raquo;/gi, "»")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function codePointChar(code: number): string {
  if (!Number.isFinite(code) || code < 32 || code === 127) return " ";
  try {
    return String.fromCodePoint(code);
  } catch {
    return " ";
  }
}

function normalizeCharset(raw: string): string | null {
  const name = raw.toLowerCase().replace(/['"]/g, "").trim();
  if (!name) return null;
  if (name === "utf8" || name === "utf-8") return "utf-8";
  if (
    name === "windows-1251" ||
    name === "cp1251" ||
    name === "win-1251" ||
    name === "x-cp1251"
  ) {
    return "windows-1251";
  }
  if (name === "koi8-r") return "koi8-r";
  return name;
}

/** Байты страницы → строка. Старые сайты часто в windows-1251, иначе H1 — кракозябры. */
export function decodeHtmlBuffer(buf: Buffer, contentType: string | null): string {
  const head = buf.subarray(0, 4096).toString("latin1");
  const fromHeader = /charset\s*=\s*["']?\s*([\w.-]+)/i.exec(contentType || "")?.[1] || "";
  const fromMeta = /charset\s*=\s*["']?\s*([\w.-]+)/i.exec(head)?.[1] || "";
  const label = normalizeCharset(fromHeader || fromMeta);
  if (label) {
    try {
      return new TextDecoder(label).decode(buf);
    } catch {
      /* неизвестное имя — ниже */
    }
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1251").decode(buf);
  }
}

export async function readResponseHtml(res: Response): Promise<string> {
  const buf = Buffer.from(await res.arrayBuffer());
  return decodeHtmlBuffer(buf, res.headers.get("content-type"));
}

function stripNoise(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, " ");
}

/** Все видимые H1, уже без вложенных тегов и с раскодированными сущностями. */
export function extractH1Texts(html: string): string[] {
  const clean = stripNoise(html);
  const out: string[] = [];
  const re = /<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi;
  for (const match of clean.matchAll(re)) {
    const attrs = match[1] || "";
    if (/\bhidden\b/i.test(attrs) || /aria-hidden=["']true["']/i.test(attrs)) continue;
    if (/display\s*:\s*none/i.test(attrs)) continue;
    if (/class=["'][^"']*(?:visually-hidden|sr-only|d-none)/i.test(attrs)) continue;
    const text = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (text) out.push(text);
  }
  return out;
}

/**
 * Первый H1, который можно показать агенту.
 * «Отзывы», «Контакты», голое имя города и кракозябры — не заголовок услуги.
 */
export function pickHonestH1(texts: string[], cityNames: string[] = []): string | null {
  const cities = new Set(cityNames.map((name) => name.trim().toLowerCase()));
  for (const raw of texts) {
    if (raw.includes("\uFFFD")) continue;
    const text = raw.replace(/\s+/g, " ").trim();
    if (text.length < 8 || text.length > 180) continue;
    if (/[ÐÑ]/.test(text) && !/[а-яё]/i.test(text)) continue;
    const key = text.toLowerCase().replace(/[«»"'«»]/g, "").trim();
    if (JUNK_H1.has(key)) continue;
    if (cities.has(key)) continue;
    return text.slice(0, 250);
  }
  return null;
}

/** Ящик человека, не info@ / zakaz@ / office@. */
export function isLiveEmail(email: string): boolean {
  const local = (email.split("@")[0] || "").toLowerCase();
  if (local.length < 2) return false;
  if (ROLE_LOCAL.test(local)) return false;
  const head = local.split(/[._+-]/)[0] || "";
  if (head && ROLE_LOCAL.test(head)) return false;
  return true;
}

export type SiteStrengthInput = {
  cmsTier: string | null;
  hasViewport: boolean;
  copyrightYear: number | null;
  ssl: boolean;
  nowYear?: number;
};

/**
 * null — сайт слабый, его можно брать.
 * Строка — причина отказа (сильный сайт).
 * Битрикс и современные фреймворки — всегда сильные.
 * Обычная CMS — слабая, только если сайт старый, без мобильной вёрстки или без https.
 * Конструктор и самописный — слабые.
 */
export function strongSiteReason(input: SiteStrengthInput): string | null {
  const tier = input.cmsTier;
  if (tier === "enterprise" || tier === "framework") return "strong_site";
  if (tier === "constructor" || tier === "custom") return null;
  const year = input.nowYear ?? new Date().getFullYear();
  const old = input.copyrightYear != null && input.copyrightYear <= year - 2;
  if (!input.ssl || !input.hasViewport || old) return null;
  return "strong_site";
}

export function extractPhone(html: string): string | null {
  const tel = html.match(/href=["']tel:([^"']+)/i);
  const raw =
    tel?.[1] ||
    html.match(/(?:\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/)?.[0];
  if (!raw) return null;
  return normalizePhone(decodeHtmlEntities(raw));
}

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return `+7${digits.slice(1)}`;
  }
  if (digits.length === 10) return `+7${digits}`;
  return null;
}

export function extractTelegram(html: string): string | null {
  const patterns = [
    /(?:https?:)?\/\/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]{4,32})/i,
    /tg:\/\/resolve\?domain=([a-zA-Z0-9_]{4,32})/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const name = match?.[1];
    if (!name) continue;
    if (/^(share|joinchat|addstickers|iv|s|proxy)$/i.test(name)) continue;
    return `https://t.me/${name}`;
  }
  return null;
}

export type LegalForm = "ip" | "company" | "unknown";

export type LegalReading = {
  form: LegalForm;
  inn: string | null;
};

/** Контрольные цифры ИНН. 10 — организация, 12 — ИП или физлицо. */
export function isValidInn(digits: string): boolean {
  if (!/^\d{10}$|^\d{12}$/.test(digits)) return false;
  const d = digits.split("").map(Number);
  const check = (coeffs: number[], index: number) => {
    const sum = coeffs.reduce((acc, coeff, i) => acc + coeff * d[i], 0);
    return (sum % 11) % 10 === d[index];
  };
  if (d.length === 10) return check([2, 4, 10, 3, 5, 9, 4, 6, 8], 9);
  return (
    check([7, 2, 4, 10, 3, 5, 9, 4, 6, 8], 10) &&
    check([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8], 11)
  );
}

function pageText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ");
}

function mentionsIp(text: string): boolean {
  if (/индивидуальн\w*\s+предпринимател/i.test(text)) return true;
  return /(?<![A-Za-zА-Яа-яЁё0-9])ИП(?![A-Za-zА-Яа-яЁё0-9])/.test(text);
}

/** ИНН рядом со словом «ИНН». Без подписи номер не берём: это может быть телефон или заказ. */
export function readLegalForm(html: string): LegalReading {
  const text = pageText(html);
  const found: string[] = [];
  const re = /инн[^0-9]{0,16}([0-9][0-9\s-]{8,22})/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const digits = match[1].replace(/\D/g, "");
    const twelve = digits.slice(0, 12);
    const ten = digits.slice(0, 10);
    if (twelve.length === 12 && isValidInn(twelve)) found.push(twelve);
    else if (ten.length === 10 && isValidInn(ten)) found.push(ten);
  }
  const inn12 = found.find((item) => item.length === 12) || null;
  const inn10 = found.find((item) => item.length === 10) || null;
  if (inn12) return { form: "ip", inn: inn12 };
  if (inn10) return { form: "company", inn: inn10 };
  if (mentionsIp(text)) return { form: "ip", inn: null };
  return { form: "unknown", inn: null };
}

/** Номер важнее слова. 12 цифр важнее 10. */
export function preferLegalForm(current: LegalReading, next: LegalReading): LegalReading {
  const rank = (item: LegalReading) => {
    if (item.form === "ip" && item.inn) return 3;
    if (item.form === "company" && item.inn) return 2;
    if (item.form === "ip") return 1;
    return 0;
  };
  return rank(next) > rank(current) ? next : current;
}

export function legalFormLabel(form: string | null | undefined): string {
  if (form === "ip") return "ИП";
  if (form === "company") return "ООО";
  return "не видно";
}
