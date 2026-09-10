/**
 * Конфиг Лид-радар Auto (единый источник лимитов).
 */
export const DAILY_QUEUE_LIMIT = 20;

/** Минимальный hotScore для приоритета в TG-превью (не жёсткий gate очереди). */
export const HOT_SCORE_PREVIEW_MIN = 0;

/** Вечерний отчёт по умолчанию (МСК). */
export const DAILY_REPORT_HOUR_MSK = 21;

/** Оценка $ за 1M токенов DeepSeek via OpenRouter (blended). */
export const USD_PER_MILLION_TOKENS = 0.2;

export function estimateUsd(tokens: number): number {
  return (Math.max(0, tokens) / 1_000_000) * USD_PER_MILLION_TOKENS;
}

export function formatBatchDateRu(iso: string): string {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
