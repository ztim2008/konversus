/**
 * Сайты, которые уже сделаны. Автосбор их не ставит в очередь.
 * Ручное добавление URL по-прежнему можно.
 */

const PORTFOLIO_HOSTS = [
  "zapilim.pro",
  "pav-96.ru",
  "proasfalt159.ru",
  "построим-дом.рф",
  "русуралстрой74.рф",
  "poolmaster.pro",
  "jaroslavl.krovla-pro.ru",
  "демонтажомск.рф",
  "spb.krysha-pod-klyuch.ru",
  "stroylidersk.ru",
  "trotuar40.ru",
  "stroy-banya53.ru",
  "as-banya.ru",
  "bani-s-pestovo.ru",
  "bani53.ru",
  "perevoznye-bani.ru",
  "resurssibir.ru",
  "custombuilt.ru",
  "modulbani.ru",
  "фрау-кухня.рф",
  "dolgovkitchens.ru",
  "permekoprom.ru",
  "prestigekupe.com",
  "roboreal.ru",
  "kuhnya-mechty174.ru",
  "mebelanddesign.ru",
  "shkafy-spb.ru",
  "konsolnsk.ru",
  "bigmebel-kzn.ru",
  "oneon.kitchen",
];

function canonHost(input: string): string {
  const bare = input.trim().toLowerCase().replace(/^www\./, "");
  try {
    return new URL(`https://${bare}`).hostname.replace(/^www\./, "");
  } catch {
    return bare;
  }
}

const PORTFOLIO = new Set(PORTFOLIO_HOSTS.map(canonHost));

export function isPortfolioDomain(domain: string | null | undefined): boolean {
  if (!domain) return false;
  return PORTFOLIO.has(canonHost(domain));
}
