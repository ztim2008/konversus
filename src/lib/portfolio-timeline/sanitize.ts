const ALLOWED = new Set(["p", "br", "strong", "em", "a"]);

function escapeText(value: string) {
  return value
    .replace(/&(?![a-zA-Z0-9#]+;)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function safeHref(attrs: string) {
  const match = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
  const raw = (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Оставляет абзац, перенос, жирный, курсив и безопасную http(s)-ссылку. */
export function sanitizePortfolioHtml(input: string): string | null {
  const source = input
    .replace(/\0/g, "")
    .slice(0, 20_000)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  let html = "";
  let anchorOpen = false;
  const tags = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = tags.exec(source))) {
    html += escapeText(source.slice(last, match.index));
    last = match.index + match[0].length;
    if (match[0].startsWith("<!--")) continue;

    const rawName = match[1].toLowerCase();
    const name = rawName === "b" ? "strong" : rawName === "i" ? "em" : rawName;
    if (!ALLOWED.has(name)) continue;

    const closing = match[0].startsWith("</");
    if (name === "br") {
      html += "<br>";
      continue;
    }
    if (name === "a") {
      if (closing) {
        if (!anchorOpen) continue;
        anchorOpen = false;
        html += "</a>";
      } else {
        const href = safeHref(match[2] ?? "");
        if (!href) continue;
        anchorOpen = true;
        html += `<a href="${escapeAttr(href)}" rel="noopener noreferrer" target="_blank">`;
      }
      continue;
    }
    if (closing) {
      html += `</${name}>`;
      continue;
    }
    html += `<${name}>`;
  }

  html += escapeText(source.slice(last));
  html = html.replace(/<p>(?:\s|<br>)*<\/p>/gi, "").trim();

  const text = html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text ? html : null;
}
