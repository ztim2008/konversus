/**
 * Avito API integration — OAuth2 client_credentials.
 *
 * ВАЖНО: client_credentials даёт доступ ТОЛЬКО к собственному аккаунту.
 * Для чужих профилей/объявлений официальный API не предоставляет данных.
 *
 * Что используем:
 *   GET /core/v1/accounts/self          → профиль владельца credentials
 *   GET /ratings/v1/info                → рейтинг и отзывы (собственный)
 *   GET /ratings/v1/reviews             → список отзывов (собственный)
 *   GET /core/v1/items                  → список активных объявлений
 */

// ── In-memory token cache ─────────────────────────────────────────────────

interface CachedToken {
  token: string;
  expiresAt: number; // ms timestamp
}

const TOKEN_CACHE = new Map<string, CachedToken>();
const TOKEN_MARGIN_MS = 60_000; // обновляем за 1 минуту до истечения

// ── Types ─────────────────────────────────────────────────────────────────

export interface AvitoSelfInfo {
  id: number;
  name: string;
  email?: string;
  phones?: string[];
  profile_url?: string;
}

export interface AvitoRatingInfo {
  isEnabled: boolean;
  rating?: {
    reviewsCount: number;
    reviewsWithScoreCount: number;
    score: number;
  };
}

export interface AvitoReview {
  id: number;
  text?: string;
  created_at?: number;
  author_name?: string;
  score?: number;
}

export interface AvitoItemShort {
  id: number;
  status: string;
  url?: string;
  title?: string;
}

export interface AvitoApiData {
  is_own_profile: boolean;
  user_id?: number;
  user_name?: string;
  phones?: string[];
  profile_url?: string;
  rating_score?: number;
  reviews_count?: number;
  active_items_count?: number;
  top_reviews?: Array<{ score?: number; text?: string; author?: string }>;
}

// ── Token ─────────────────────────────────────────────────────────────────

export async function getAvitoToken(
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const cacheKey = `${clientId}:${clientSecret}`;
  const cached = TOKEN_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt - TOKEN_MARGIN_MS) {
    return cached.token;
  }

  try {
    const res = await fetch("https://api.avito.ru/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) return null;

    const expiresAt = Date.now() + (data.expires_in ?? 86400) * 1000;
    TOKEN_CACHE.set(cacheKey, { token: data.access_token, expiresAt });
    return data.access_token;
  } catch {
    return null;
  }
}

// ── Self info ─────────────────────────────────────────────────────────────

export async function getAvitoSelf(
  token: string
): Promise<AvitoSelfInfo | null> {
  try {
    const res = await fetch("https://api.avito.ru/core/v1/accounts/self", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as AvitoSelfInfo;
  } catch {
    return null;
  }
}

// ── Ratings ───────────────────────────────────────────────────────────────

export async function getAvitoRatings(
  token: string
): Promise<AvitoRatingInfo | null> {
  try {
    const res = await fetch("https://api.avito.ru/ratings/v1/info", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as AvitoRatingInfo;
  } catch {
    return null;
  }
}

// ── Reviews ───────────────────────────────────────────────────────────────

export async function getAvitoReviews(
  token: string,
  limit = 5
): Promise<AvitoReview[]> {
  try {
    const url = new URL("https://api.avito.ru/ratings/v1/reviews");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", "0");
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      reviews?: Array<{
        id: number;
        text?: string;
        createdAt?: number;
        score?: number;
        author?: { name?: string };
      }>;
    };
    return (data.reviews ?? []).map((r) => ({
      id: r.id,
      text: r.text,
      created_at: r.createdAt,
      author_name: r.author?.name,
      score: r.score,
    }));
  } catch {
    return [];
  }
}

// ── Items count ───────────────────────────────────────────────────────────

export async function getAvitoActiveItemsCount(
  token: string
): Promise<number | null> {
  try {
    const url = new URL("https://api.avito.ru/core/v1/items");
    url.searchParams.set("per_page", "1");
    url.searchParams.set("page", "1");
    url.searchParams.set("status", "active");
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      meta?: { total?: number };
      resources?: unknown[];
    };
    // Авито не всегда возвращает total в meta — считаем по resources
    return data.meta?.total ?? null;
  } catch {
    return null;
  }
}

// ── URL helpers ───────────────────────────────────────────────────────────

/**
 * Извлекает хэш профиля из URL вида:
 *   https://www.avito.ru/user/7d04cdc3a12726eee72c6851c953ac54/profile
 *   https://www.avito.ru/brands/brandname
 *   https://www.avito.ru/user/shop_name/profile
 */
export function extractAvitoProfileHash(url: string): string | null {
  const m = url.match(/avito\.ru\/user\/([^/?#]+)/i);
  if (m) return m[1];
  return null;
}

/**
 * Извлекает item_id из URL вида:
 *   https://www.avito.ru/city/category/title-12345678
 */
export function extractAvitoItemId(url: string): number | null {
  const m = url.match(/-(\d{7,12})(?:[/?#]|$)/);
  if (m) return parseInt(m[1], 10);
  return null;
}

// ── Main: enrich avito snapshot with API data ─────────────────────────────

export async function enrichWithAvitoApi(
  url: string,
  clientId: string,
  clientSecret: string
): Promise<AvitoApiData> {
  const token = await getAvitoToken(clientId, clientSecret);
  if (!token) return { is_own_profile: false };

  // Получаем свой профиль
  const self = await getAvitoSelf(token);
  if (!self) return { is_own_profile: false };

  // Сверяем: совпадает ли переданный URL с профилем владельца credentials
  const inputHash = extractAvitoProfileHash(url);
  const selfHash = self.profile_url ? extractAvitoProfileHash(self.profile_url) : null;

  const isOwnProfile =
    Boolean(inputHash) &&
    Boolean(selfHash) &&
    inputHash?.toLowerCase() === selfHash?.toLowerCase();

  if (!isOwnProfile) {
    // Не наш профиль — возвращаем только флаг
    return { is_own_profile: false };
  }

  // Наш профиль — получаем полные данные
  const [ratings, reviews, itemsCount] = await Promise.all([
    getAvitoRatings(token),
    getAvitoReviews(token, 5),
    getAvitoActiveItemsCount(token),
  ]);

  return {
    is_own_profile: true,
    user_id: self.id,
    user_name: self.name,
    phones: self.phones,
    profile_url: self.profile_url,
    rating_score: ratings?.rating?.score,
    reviews_count: ratings?.rating?.reviewsCount,
    active_items_count: itemsCount ?? undefined,
    top_reviews: reviews.slice(0, 5).map((r) => ({
      score: r.score,
      text: r.text,
      author: r.author_name,
    })),
  };
}
