/**
 * Утренний дайджест пачки в Telegram (текст; фото — этап 7).
 */
import "server-only";

export async function sendMorningDigest(params: {
  botToken: string;
  chatId: string;
  batchDate: string;
  city: string;
  niche: string;
  queuedCount: number;
  limit: number;
  tokensTotal: number;
  samples: Array<{
    name: string;
    domain: string;
    platform?: string | null;
    email?: string | null;
    hotScore?: number;
  }>;
  adminUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
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
    `Ниша: *${escapeMd(niche)}*\n` +
    `Готово к отправке: *${queuedCount}/${limit}*\n` +
    `Токены AI: ~${tokensTotal}\n\n` +
    (lines.length ? lines.join("\n") + "\n\n" : "") +
    `Утро = план. Открыть очередь:\n${adminUrl}`;

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
    const err = await res.text();
    return { ok: false, error: err };
  }
  return { ok: true };
}

function escapeMd(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
