export type PortfolioVideo = {
  provider: "vk" | "rutube";
  pageUrl: string;
  embedUrl: string;
  layout: "wide" | "tall";
};

const VK_HOSTS = new Set(["vk.com", "vk.ru", "vkvideo.ru"]);

function hostOf(url: URL) {
  return url.hostname.toLowerCase().replace(/^(?:www|m)\./, "");
}

function takeUrl(input: string) {
  let text = input.trim().slice(0, 2000);
  const src = text.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  if (src) text = (src[1] || src[2] || src[3] || "").trim();
  text = text.replace(/&amp;/gi, "&");
  if (!/^https?:\/\//i.test(text) && /^(?:www\.|m\.)?(?:vk\.com|vk\.ru|vkvideo\.ru|rutube\.ru)\//i.test(text)) {
    text = `https://${text}`;
  }
  return text;
}

function vkVideo(ownerId: string, videoId: string, layout: "wide" | "tall", hash: string | null): PortfolioVideo | null {
  if (!/^-?\d{1,15}$/.test(ownerId) || !/^\d{1,15}$/.test(videoId)) return null;
  const kind = layout === "tall" ? "clip" : "video";
  const page = new URL(`https://vk.com/${kind}${ownerId}_${videoId}`);
  const embed = new URL("https://vk.com/video_ext.php");
  embed.searchParams.set("oid", ownerId);
  embed.searchParams.set("id", videoId);
  embed.searchParams.set("hd", "2");
  if (hash && /^[a-zA-Z0-9_-]{4,64}$/.test(hash)) {
    page.searchParams.set("hash", hash);
    embed.searchParams.set("hash", hash);
  }
  return { provider: "vk", pageUrl: page.toString(), embedUrl: embed.toString(), layout };
}

function rutubeVideo(id: string, layout: "wide" | "tall", access: string | null, priv: boolean): PortfolioVideo | null {
  if (!/^[a-f0-9]{32}$/i.test(id)) return null;
  const safeId = id.toLowerCase();
  const safeAccess = access && /^[a-zA-Z0-9]{4,64}$/.test(access) ? access : null;
  const pagePath = layout === "tall" ? `/shorts/${safeId}/` : priv ? `/video/private/${safeId}/` : `/video/${safeId}/`;
  const page = new URL(`https://rutube.ru${pagePath}`);
  const embed = new URL(`https://rutube.ru/play/embed/${safeId}`);
  if (safeAccess) {
    page.searchParams.set("p", safeAccess);
    embed.searchParams.set("p", safeAccess);
  }
  return { provider: "rutube", pageUrl: page.toString(), embedUrl: embed.toString(), layout };
}

function parseVk(url: URL): PortfolioVideo | null {
  const hash = url.searchParams.get("hash");
  if (url.pathname === "/video_ext.php") {
    const ownerId = url.searchParams.get("oid") ?? "";
    const videoId = url.searchParams.get("id") ?? "";
    return vkVideo(ownerId, videoId, "wide", hash);
  }

  const path = url.pathname.match(/^\/(video|clip)(-?\d{1,15})_(\d{1,15})\/?$/);
  if (path) return vkVideo(path[2], path[3], path[1] === "clip" ? "tall" : "wide", hash);

  const z = url.searchParams.get("z") ?? "";
  const fromZ = z.match(/^(?:video|clip)(-?\d{1,15})_(\d{1,15})/);
  if (!fromZ) return null;
  const tall = z.startsWith("clip");
  return vkVideo(fromZ[1], fromZ[2], tall ? "tall" : "wide", hash);
}

function parseRutube(url: URL): PortfolioVideo | null {
  const access = url.searchParams.get("p");
  const embed = url.pathname.match(/^\/play\/embed\/([a-f0-9]{32})\/?$/i);
  if (embed) return rutubeVideo(embed[1], "wide", access, false);

  const shorts = url.pathname.match(/^\/shorts\/([a-f0-9]{32})\/?$/i);
  if (shorts) return rutubeVideo(shorts[1], "tall", access, false);

  const priv = url.pathname.match(/^\/video\/private\/([a-f0-9]{32})\/?$/i);
  if (priv) return rutubeVideo(priv[1], "wide", access, true);

  const video = url.pathname.match(/^\/video\/([a-f0-9]{32})\/?$/i);
  if (video) return rutubeVideo(video[1], "wide", access, false);

  return null;
}

/** Ссылка или код вставки VK Видео / Rutube → канонический адрес и безопасный embed. */
export function parsePortfolioVideo(input: string): PortfolioVideo | null {
  let url: URL;
  try {
    url = new URL(takeUrl(input));
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;

  const host = hostOf(url);
  if (VK_HOSTS.has(host)) return parseVk(url);
  if (host === "rutube.ru") return parseRutube(url);
  return null;
}
