/**
 * Короткий текст для мессенджера клиента после письма и кнопки «Написать».
 * Бот клиенту сам не пишет: владелец открывает чат по кнопке и вставляет текст.
 */

export type LeadMessengers = {
  telegram?: string | null;
  maxUrl?: string | null;
  whatsapp?: string | null;
};

export type MessengerButton = { text: string; url: string };

export function messengerButtons(lead: LeadMessengers): MessengerButton[] {
  const out: MessengerButton[] = [];
  if (lead.telegram) out.push({ text: "Написать в Telegram", url: lead.telegram });
  if (lead.maxUrl) out.push({ text: "Написать в Макс", url: lead.maxUrl });
  if (lead.whatsapp) out.push({ text: "Написать в WhatsApp", url: lead.whatsapp });
  return out;
}

export function messengerLines(lead: LeadMessengers): string[] {
  const out: string[] = [];
  if (lead.telegram) out.push(`💬 Telegram: ${lead.telegram}`);
  if (lead.maxUrl) out.push(`💬 Макс: ${lead.maxUrl}`);
  if (lead.whatsapp) out.push(`💬 WhatsApp: ${lead.whatsapp}`);
  return out;
}

/** Только факты, которые точно есть: кто, куда ушло письмо и его тема. */
export function buildMessengerDraft(input: {
  senderName: string;
  domain: string;
  email?: string | null;
  subject?: string | null;
}): string {
  const subject = (input.subject || "").replace(/\s+/g, " ").trim();
  const where = input.email ? `на ${input.email}` : "вам на почту";
  const letter = subject ? `письмо «${subject}»` : "письмо";
  return [
    `Здравствуйте! Меня зовут ${input.senderName}.`,
    `Отправил ${where} ${letter} по сайту ${input.domain}.`,
    "Удобно, если коротко продублирую сюда?",
  ].join("\n");
}
