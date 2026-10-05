/**
 * Короткие тексты второго и третьего касания.
 * Первое письмо собирает агент и здесь не меняется.
 */

function cleanFinding(raw: string): string {
  return raw
    .replace(/^❌\s*|^⚠️\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Вторая деталь с карточки. Если её нет — первая. */
export function secondFinding(problems: unknown): string | null {
  let parsed: unknown = problems;
  if (typeof problems === "string") {
    const trimmed = problems.trim();
    if (!trimmed) return null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      const one = cleanFinding(trimmed);
      return one.length > 3 ? one : null;
    }
  }
  if (!Array.isArray(parsed)) return null;
  const items = parsed
    .map((item) => {
      if (typeof item === "string") return cleanFinding(item);
      if (item && typeof item === "object" && "text" in item) {
        return cleanFinding(String((item as { text: unknown }).text || ""));
      }
      return "";
    })
    .filter((item) => item.length > 3);
  const picked = items[1] || items[0] || "";
  return picked || null;
}

export function replySubject(original: string): string {
  const subject = original.trim();
  if (!subject) return "Re: сайт";
  if (/^re:/i.test(subject)) return subject;
  return `Re: ${subject}`;
}

function sentence(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

export function followUpBody(params: {
  touch: 2 | 3;
  domain: string;
  finding?: string | null;
  hasScreenshot: boolean;
}): string {
  const domain = params.domain.trim() || "ваш сайт";
  if (params.touch === 3) {
    const shot = params.hasScreenshot
      ? " Скрин прилагаю, чтобы было видно, о каком сайте речь."
      : "";
    return [
      "Здравствуйте!",
      "",
      `Это последнее письмо по сайту ${domain}.${shot}`,
      "",
      "Если сейчас не актуально — больше не пишу. Если хотите, чтобы я показал, как поправить картинки или первый экран, ответьте на это письмо.",
    ].join("\n");
  }

  const shot = params.hasScreenshot
    ? " На скрине снова первый экран — так проще вспомнить, о каком сайте речь."
    : "";
  const finding = params.finding?.trim();
  const detail = finding
    ? `Ещё одна деталь: ${sentence(finding)}`
    : "Первый экран по-прежнему можно сделать понятнее: сразу видно, что вы делаете и как оставить заявку.";
  return [
    "Здравствуйте!",
    "",
    `Писал несколько дней назад про сайт ${domain}.${shot}`,
    "",
    detail,
    "",
    "Если откликнется, пришлю коротко, как это поправить. Можно просто ответить на это письмо.",
  ].join("\n");
}

export function angleMessageId(messageId: string): string {
  const id = messageId.trim();
  if (id.startsWith("<") && id.endsWith(">")) return id;
  return `<${id}>`;
}
