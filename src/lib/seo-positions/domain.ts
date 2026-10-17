/** Сравнение доменов без внешних зависимостей: чистые функции, используются и в тестах. */

export function normalizeDomain(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  let host: string;
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`).hostname;
  } catch {
    return null;
  }
  host = host.replace(/\.$/, "").replace(/^www\./, "");
  if (!/^[a-z0-9.-]+$/.test(host) || !host.includes(".") || host.length > 253) return null;
  if (host.split(".").some((part) => !part || part.length > 63)) return null;
  return host;
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** example.uz совпадает с example.uz, www.example.uz, ru.example.uz; не с example.uz.attacker.com и не с myexample.uz. */
export function urlMatchesDomain(url: string, domain: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return host === domain || host.endsWith(`.${domain}`);
}
