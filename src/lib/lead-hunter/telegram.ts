/**
 * Telegram notifier для Lead Hunter.
 * Отправляет уведомление о новом лиде с inline-кнопками.
 */

export interface TelegramLeadNotifyParams {
  botToken: string;
  chatId: string;
  leadId: string;
  url: string;
  companyName?: string | null;
  siteScore?: number | null;
  priority?: string | null;
  problems?: string[];
  architectId?: string | null;
}

export async function sendLeadToTelegram(
  params: TelegramLeadNotifyParams
): Promise<void> {
  const {
    botToken,
    chatId,
    leadId,
    url,
    companyName,
    siteScore,
    priority,
    problems = [],
    architectId,
  } = params;

  const priorityEmoji =
    priority === "high" ? "🔴" : priority === "medium" ? "🟡" : priority === "low" ? "🟢" : "⚪";

  const scoreBar = siteScore != null
    ? `${"█".repeat(Math.round(siteScore / 10))}${"░".repeat(10 - Math.round(siteScore / 10))} ${siteScore}/10`
    : "—";

  const problemsText =
    problems.length > 0
      ? "\n\n*Проблемы:*\n" + problems.slice(0, 5).map((p) => `• ${p}`).join("\n")
      : "";

  const baseUrl = "https://konversus.ru";

  const text =
    `🎯 *Найден новый лид*\n\n` +
    `*Компания:* ${companyName ? escapeMarkdown(companyName) : "Не определено"}\n` +
    `*Сайт:* ${escapeMarkdown(url)}\n` +
    `*Оценка сайта:* ${scoreBar}\n` +
    `*Потенциал:* ${priorityEmoji} ${priority ? priority.toUpperCase() : "не определён"}` +
    problemsText;

  const buttons: { text: string; url?: string; callback_data?: string }[][] = [
    [
      { text: "📄 Создать КП", url: `${baseUrl}/dashboard/leads/${leadId}/proposal` },
      { text: "🌐 Открыть сайт", url: url },
    ],
    [
      ...(architectId
        ? [{ text: "📊 Полный анализ", url: `${baseUrl}/architect/${architectId}` }]
        : []),
      { text: "🗄 В архив", callback_data: `lead_archive_${leadId}` },
    ],
  ];

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: buttons },
  };

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API error: ${err}`);
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
