/**
 * URL Detector — определяет тип источника по URL.
 * Используется на клиенте (виджет) и на сервере (API).
 * Не имеет зависимостей — чистая логика.
 */

import type { SourceType } from "@/lib/architect/types";

const OZON_RE = /^https?:\/\/(www\.)?ozon\.ru\//i;
const WB_RE = /^https?:\/\/(www\.)?(wildberries\.ru|wb\.ru)\//i;
const AVITO_SELLER_RE = /^https?:\/\/(www\.)?avito\.ru\/(companies|brands|user|shop)\//i;
const AVITO_RE = /^https?:\/\/(www\.)?avito\.ru\//i;

export function detectSourceType(url: string): SourceType {
  if (OZON_RE.test(url)) return "ozon";
  if (WB_RE.test(url)) return "wb";
  if (AVITO_SELLER_RE.test(url)) return "avito-seller";
  if (AVITO_RE.test(url)) return "avito-listing";
  return "website";
}

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  website: "Сайт",
  ozon: "Ozon",
  wb: "Wildberries",
  "avito-seller": "Авито — продавец",
  "avito-listing": "Авито — объявление",
};

export const SOURCE_TYPE_ICONS: Record<SourceType, string> = {
  website: "🌐",
  ozon: "📦",
  wb: "🛍️",
  "avito-seller": "🏪",
  "avito-listing": "📋",
};
