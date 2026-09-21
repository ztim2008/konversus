/**
 * Telegram: утренний план (текст + фото + КП), отправка, вечерний факт.
 */
import "server-only";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join } from "node:path";

const PHOTO_LIMIT = 5;
/** Лимит Telegram sendMessage — оставляем запас. */
const TG_TEXT_LIMIT = 3900;

const SOURCE_RU: Record<string, string> = {
  manual: "Вручную в админке",
  form: "Форма на сайте",
  cta: "Клик по ссылке в письме",
  email: "Ответ на email",
  webhook: "Заявка / webhook",
};

export type DigestSample = {
  name: string;
  domain: string;
  platform?: string | null;
  email?: string | null;
  hotScore?: number;
  screenshotUrl?: string | null;
  /** Абсолютный путь на диске — предпочтительнее URL (без 404 Next/nginx). */
  screenshotPath?: string | null;
  kpSubject?: string | null;
  kpHtml?: string | null;
  kpText?: string | null;
};

export async function sendMorningDigest(params: {
  botToken: string;
  chatId: string;
  batchDate: string;
  city: string;
  niche: string;
  /** Вертикаль рулетки B (стройка / ремонт / …). */
  vertical?: string;
  queuedCount: number;
  limit: number;
  tokensTotal: number;
  samples: DigestSample[];
  adminUrl: string;
  publicOrigin?: string;
  /** Сколько карточек со скрином+КП (по умолчанию 5). */
  photoLimit?: number;
}): Promise<{ ok: boolean; error?: string; photosSent?: number; kpSent?: number }> {
  const {
    botToken,
    chatId,
    batchDate,
    city,
    niche,
    queuedCount,
    limit,
    tokensTotal,
    samples,
    adminUrl,
    publicOrigin,
  } = params;

  if (!botToken || !chatId) {
    return { ok: false, error: "telegram not configured" };
  }

  const dd = batchDate.split("-").reverse().join(".");
  const lines = samples.slice(0, 8).map((s, i) => {
    const plat = s.platform ? ` · ${s.platform}` : "";
    const hot = s.hotScore != null ? ` · 🔥${s.hotScore}` : "";
    return `${i + 1}. ${s.name || s.domain}${plat}${hot}`;
  });

  const text =
    `📋 *Пачка ${dd}*\n` +
    `Город: *${escapeMd(city)}*\n` +
    (params.vertical
      ? `Вертикаль: *${escapeMd(params.vertical)}*\n`
      : "") +
    `Ниша: *${escapeMd(niche)}*\n` +
    `Готово к отправке: *${queuedCount}/${limit}*\n` +
    `Токены AI: ~${tokensTotal}\n\n` +
    (lines.length ? lines.join("\n") + "\n\n" : "") +
    `Ниже — скрин и текст письма по горячим лидам (для согласования в чате).\n` +
    `Утро = план:\n${adminUrl}`;

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }

  const photoLimit = params.photoLimit ?? PHOTO_LIMIT;
  const top = [...samples]
    .sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0))
    .slice(0, photoLimit);

  let photosSent = 0;
  let kpSent = 0;
  for (let i = 0; i < top.length; i++) {
    const s = top[i];
    const n = `${i + 1}/${top.length}`;
    const cardOk = await sendLeadCardToTelegram({
      botToken,
      chatId,
      publicOrigin,
      prefix: n,
      mode: "plan",
      sample: s,
    });
    if (cardOk.photo) photosSent++;
    if (cardOk.kp) kpSent++;
  }

  const rest = Math.max(0, queuedCount - photoLimit);
  if (rest > 0) {
    await sendPlainText({
      botToken,
      chatId,
      text: `📎 Ещё ${rest} в админке → ${adminUrl}`,
    });
  }

  return { ok: true, photosSent, kpSent };
}

/**
 * Уведомление: сайт добавлен в очередь вручную.
 */
export async function sendManualEnqueueNotification(params: {
  botToken: string;
  chatId: string;
  name: string;
  domain: string;
  platform?: string | null;
  email?: string | null;
  screenshotUrl?: string | null;
  screenshotPath?: string | null;
  kpSubject?: string | null;
  kpHtml?: string | null;
  publicOrigin?: string;
  overLimit?: boolean;
  queuedCount?: number;
  limit?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const {
    botToken,
    chatId,
    publicOrigin,
    overLimit,
    queuedCount,
    limit,
    ...rest
  } = params;

  if (!botToken || !chatId) {
    return { ok: false, error: "telegram not configured" };
  }

  const warn =
    overLimit && queuedCount != null && limit != null
      ? `\n⚠️ В очереди ${queuedCount} (лимит авто ${limit}) — ручной режим`
      : "";

  await sendPlainText({
    botToken,
    chatId,
    text: `➕ Ручной лид добавлен в «Сегодня»${warn}`,
  });

  const card = await sendLeadCardToTelegram({
    botToken,
    chatId,
    publicOrigin,
    prefix: "1",
    mode: "plan",
    sample: {
      name: rest.name,
      domain: rest.domain,
      platform: rest.platform,
      email: rest.email,
      screenshotUrl: rest.screenshotUrl,
      screenshotPath: rest.screenshotPath,
      kpSubject: rest.kpSubject,
      kpHtml: rest.kpHtml,
    },
  });

  return card.ok ? { ok: true } : { ok: false, error: "telegram send failed" };
}

/**
 * Уведомление об отправке (+ фото + текст КП) — ручной Send и автокапля.
 */
export async function sendSentNotification(params: {
  botToken: string;
  chatId: string;
  name: string;
  domain: string;
  platform?: string | null;
  email: string;
  screenshotUrl?: string | null;
  screenshotPath?: string | null;
  kpSubject?: string | null;
  kpHtml?: string | null;
  kpText?: string | null;
  publicOrigin?: string;
  /** Пульс дня: «Сегодня 12/40 · в очереди 8» */
  pulseLine?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { botToken, chatId, publicOrigin, pulseLine, ...rest } = params;

  if (!botToken || !chatId) {
    return { ok: false, error: "telegram not configured" };
  }

  const card = await sendLeadCardToTelegram({
    botToken,
    chatId,
    publicOrigin,
    prefix: "✅",
    mode: "sent",
    pulseLine,
    sample: {
      name: rest.name,
      domain: rest.domain,
      platform: rest.platform,
      email: rest.email,
      screenshotUrl: rest.screenshotUrl,
      screenshotPath: rest.screenshotPath,
      kpSubject: rest.kpSubject,
      kpHtml: rest.kpHtml,
      kpText: rest.kpText,
    },
  });

  return card.ok ? { ok: true } : { ok: false, error: "telegram send failed" };
}

/**
 * Короткое уведомление о ручном пропуске (слот очереди свободен).
 */
export async function sendSkipNotification(params: {
  botToken: string;
  chatId: string;
  name: string;
  domain: string;
  platform?: string | null;
  queuedRemaining?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const { botToken, chatId, name, domain, platform, queuedRemaining } = params;

  if (!botToken || !chatId) {
    return { ok: false, error: "telegram not configured" };
  }

  const plat = platform ? ` · ${platform}` : "";
  const left =
    queuedRemaining != null ? `\nОсталось в очереди: ${queuedRemaining}` : "";
  const text =
    `⏭ Пропуск: ${name || domain}${plat}\n` +
    `https://${domain}\n` +
    `Слот свободен${left}`;

  return sendPlainText({ botToken, chatId, text });
}

/**
 * Уведомление об ответе / заявке (+ фото скрина).
 */
export async function sendReplyNotification(params: {
  botToken: string;
  chatId: string;
  name: string;
  domain: string;
  platform?: string | null;
  email?: string | null;
  source?: string;
  screenshotUrl?: string | null;
  screenshotPath?: string | null;
  publicOrigin?: string;
  adminUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const {
    botToken,
    chatId,
    name,
    domain,
    platform,
    email,
    source,
    screenshotUrl,
    screenshotPath,
    publicOrigin,
    adminUrl,
  } = params;

  if (!botToken || !chatId) {
    return { ok: false, error: "telegram not configured" };
  }

  const plat = platform ? ` · ${platform}` : "";
  const mail = email ? ` · ${email}` : "";
  const srcLabel = sourceLabelRu(source);
  const src = srcLabel ? `\nКак узнали: ${srcLabel}` : "";
  const admin = adminUrl ? `\nАдминка: ${adminUrl}` : "";
  const caption =
    `🔥 Ответ/заявка: ${name || domain}${plat}${mail}${src}\n` +
    `https://${domain}${admin}`;

  const localPath = resolveLocalScreenshotPath(screenshotPath, screenshotUrl);
  const absoluteShot = absolutePublicUrl(screenshotUrl, publicOrigin);
  const ok = await sendPhoto({
    botToken,
    chatId,
    photoUrl: absoluteShot,
    localPath,
    caption,
  });
  if (ok) return { ok: true };

  return sendPlainText({ botToken, chatId, text: caption });
}

/**
 * Короткий дайджест автоотправки (без фото на каждое письмо).
 */
export async function sendPlainAutoSendDigest(params: {
  botToken: string;
  chatId: string;
  sentNow: number;
  sentToday: number;
  sentLimit: number;
  queuedLeft: number;
}): Promise<{ ok: boolean; error?: string }> {
  const { botToken, chatId, sentNow, sentToday, sentLimit, queuedLeft } = params;
  if (!botToken || !chatId) {
    return { ok: false, error: "telegram not configured" };
  }
  const text =
    `📤 Автоотправка: +${sentNow}\n` +
    `Сегодня ${sentToday}/${sentLimit} · в очереди ${queuedLeft}`;
  return sendPlainText({ botToken, chatId, text });
}

/**
 * Вечерняя сводка (факт дня).
 */
export async function sendEveningReport(params: {
  botToken: string;
  chatId: string;
  batchDate: string;
  queued: number;
  sent: number;
  skipped: number;
  opened: number;
  replied: number;
  bounce: number;
  tokens: number;
  usdEstimate?: number;
  adminUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const {
    botToken,
    chatId,
    batchDate,
    queued,
    sent,
    skipped,
    opened,
    replied,
    bounce,
    tokens,
    usdEstimate,
    adminUrl,
  } = params;

  if (!botToken || !chatId) {
    return { ok: false, error: "telegram not configured" };
  }

  const dd = batchDate.split("-").reverse().join(".");
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
  const usd =
    usdEstimate != null
      ? ` (~$${usdEstimate.toFixed(3)})`
      : "";

  let text =
    `📊 День ${dd}\n` +
    `Пачка: ${queued} → отправлено ${sent} · пропуск ${skipped}\n` +
    `🔥 Ответы/заявки: ${replied}\n` +
    `Открыли: ${opened} (${openRate}%)\n` +
    `Bounce: ${bounce}\n` +
    `Токены AI: ~${tokens}${usd}`;

  if (adminUrl) {
    text += `\n\nАдминка: ${adminUrl}`;
  }

  return sendPlainText({ botToken, chatId, text });
}

export function sourceLabelRu(source?: string | null): string {
  if (!source) return "";
  return SOURCE_RU[source] || source;
}

/** HTML КП → читаемый plain text для Telegram (только тело письма). */
export function kpHtmlToPlain(html: string | null | undefined): string {
  if (!html) return "";

  // Якорь из шаблона (новые письма)
  const marked = html.match(
    /<!--\s*kp-body\s*-->([\s\S]*?)<!--\s*\/kp-body\s*-->/i
  );
  if (marked?.[1]) {
    const body = paragraphsFromHtml(marked[1]);
    const issues = listItemsFromHtml(html);
    return joinLetter(body, issues);
  }

  // Старые письма без якоря: берём <p>, отбрасываем хром шаблона
  const skipRe =
    /^(lead-web\.pro|веб-разработка|фрагмент главной|что заметили|или ответьте|разобрать подробнее|команда\b)/i;
  const paras = paragraphsFromHtml(html).filter((p) => {
    if (p.length < 12) return false;
    if (skipRe.test(p)) return false;
    if (/платформа:/i.test(p) && p.length < 140) return false;
    if (/^https?:\/\//i.test(p)) return false;
    return true;
  });
  const issues = listItemsFromHtml(html);
  return joinLetter(paras, issues);
}

function joinLetter(paragraphs: string[], issues: string[]): string {
  const parts = [...paragraphs];
  if (issues.length) {
    parts.push("Что заметили:\n" + issues.map((i) => `• ${i}`).join("\n"));
  }
  return parts
    .join("\n\n")
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n") // если вдруг пришли литералы \n
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function paragraphsFromHtml(chunk: string): string[] {
  const out: string[] = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chunk))) {
    const text = stripTagsToText(m[1]);
    if (text) out.push(text);
  }
  if (out.length === 0) {
    const fallback = stripTagsToText(chunk);
    if (fallback) out.push(fallback);
  }
  return out;
}

function listItemsFromHtml(html: string): string[] {
  const out: string[] = [];
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = stripTagsToText(m[1]).replace(/^❌\s*|^⚠️\s*/, "");
    if (text) out.push(text);
  }
  return out;
}

function stripTagsToText(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

async function sendLeadCardToTelegram(params: {
  botToken: string;
  chatId: string;
  publicOrigin?: string;
  prefix: string;
  mode: "plan" | "sent";
  sample: DigestSample;
  pulseLine?: string;
}): Promise<{ ok: boolean; photo: boolean; kp: boolean }> {
  const { botToken, chatId, publicOrigin, prefix, mode, sample, pulseLine } =
    params;
  const plat = sample.platform ? ` · ${sample.platform}` : "";
  const mail = sample.email ? `\n📧 ${sample.email}` : "";
  const pulse = pulseLine ? `\n${pulseLine}` : "";
  const title =
    mode === "sent"
      ? `${prefix} Отправлено: ${sample.name || sample.domain}${plat}${mail}\nhttps://${sample.domain}${pulse}`
      : `${prefix}. ${sample.name || sample.domain}${plat}${mail}\nhttps://${sample.domain}`;

  let photo = false;
  const localPath = resolveLocalScreenshotPath(
    sample.screenshotPath,
    sample.screenshotUrl
  );
  const absoluteShot = absolutePublicUrl(sample.screenshotUrl, publicOrigin);
  photo = await sendPhoto({
    botToken,
    chatId,
    photoUrl: absoluteShot,
    localPath,
    caption: title.slice(0, 1024),
  });

  if (!photo) {
    await sendPlainText({ botToken, chatId, text: title });
  }

  const plain =
    (sample.kpText && sample.kpText.trim()) ||
    kpHtmlToPlain(sample.kpHtml);
  let kp = false;
  if (plain) {
    const subject = sample.kpSubject
      ? `Тема: ${sample.kpSubject}\n\n`
      : "";
    const header =
      mode === "sent"
        ? `📨 Текст письма (как ушло клиенту)\n\n`
        : `📨 Текст письма (черновик к отправке)\n\n`;
    const body = truncate(`${header}${subject}${plain}`, TG_TEXT_LIMIT);
    const r = await sendPlainText({ botToken, chatId, text: body });
    kp = r.ok;
  }

  return { ok: true, photo, kp };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 20).trimEnd() + "\n…(обрезано)";
}

async function sendPhoto(params: {
  botToken: string;
  chatId: string;
  caption: string;
  /** Локальный jpeg — предпочтительно (Telegram не ходит на наш URL). */
  localPath?: string | null;
  /** Публичный URL — запасной вариант. */
  photoUrl?: string | null;
}): Promise<boolean> {
  const caption = params.caption.slice(0, 1024);

  if (params.localPath && existsSync(params.localPath)) {
    try {
      const buf = await readFile(params.localPath);
      const form = new FormData();
      form.append("chat_id", params.chatId);
      form.append("caption", caption);
      form.append(
        "photo",
        new Blob([new Uint8Array(buf)], { type: "image/jpeg" }),
        basename(params.localPath) || "screenshot.jpg"
      );
      const res = await fetch(
        `https://api.telegram.org/bot${params.botToken}/sendPhoto`,
        {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(30_000),
        }
      );
      if (res.ok) return true;
    } catch {
      /* fallback на URL */
    }
  }

  if (!params.photoUrl) return false;

  const res = await fetch(
    `https://api.telegram.org/bot${params.botToken}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: params.chatId,
        photo: params.photoUrl,
        caption,
      }),
      signal: AbortSignal.timeout(20_000),
    }
  );
  return res.ok;
}

async function sendPlainText(params: {
  botToken: string;
  chatId: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`https://api.telegram.org/bot${params.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: params.chatId,
      text: params.text.slice(0, 4096),
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }
  return { ok: true };
}

/** Путь на диске: явный path или public/ + относительный screenshot_url. */
export function resolveLocalScreenshotPath(
  path?: string | null,
  url?: string | null
): string | null {
  if (path && existsSync(path)) return path;
  if (!url) return null;

  let pathname = url;
  if (/^https?:\/\//i.test(url)) {
    try {
      pathname = new URL(url).pathname;
    } catch {
      return null;
    }
  }
  if (!pathname.startsWith("/")) return null;

  const rel = pathname.replace(/^\//, "");
  const candidates = [
    join(process.cwd(), "public", rel),
    join(process.cwd(), rel),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function absolutePublicUrl(
  url: string | null | undefined,
  origin?: string
): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (origin || "https://konversus.ru").replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

function escapeMd(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
