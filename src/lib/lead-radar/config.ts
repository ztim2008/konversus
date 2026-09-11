/**
 * Конфиг Лид-радар Auto (лимиты + веса рулетки из settings).
 */
import "server-only";
import { getSetting, setManySetting } from "@/lib/data/settings";
import {
  VERTICALS_V2,
  type VerticalId,
} from "@/lib/lead-radar-geo";

/** Дефолт, если в settings пусто. */
export const DAILY_QUEUE_LIMIT = 20;

export const SETTING_DAILY_QUEUE_LIMIT = "lead_radar_daily_queue_limit";
export const SETTING_VERTICAL_WEIGHTS = "lead_radar_vertical_weights";
export const SETTING_MANUAL_RESPECTS_LIMIT = "lead_radar_manual_respects_limit";

/** Минимальный hotScore для приоритета в TG-превью (не жёсткий gate очереди). */
export const HOT_SCORE_PREVIEW_MIN = 0;

/** Вечерний отчёт по умолчанию (МСК). */
export const DAILY_REPORT_HOUR_MSK = 21;

/** Оценка $ за 1M токенов DeepSeek via OpenRouter (blended). */
export const USD_PER_MILLION_TOKENS = 0.2;

export type VerticalWeights = Record<VerticalId, number>;

export function defaultVerticalWeights(): VerticalWeights {
  return Object.fromEntries(
    VERTICALS_V2.map((v) => [v.id, v.weight])
  ) as VerticalWeights;
}

export async function getDailyQueueLimit(): Promise<number> {
  const raw = (await getSetting(SETTING_DAILY_QUEUE_LIMIT)).trim();
  const n = Number.parseInt(raw || String(DAILY_QUEUE_LIMIT), 10);
  if (!Number.isFinite(n) || n < 1) return DAILY_QUEUE_LIMIT;
  return Math.min(100, Math.max(1, n));
}

export async function getManualRespectsLimit(): Promise<boolean> {
  const raw = (await getSetting(SETTING_MANUAL_RESPECTS_LIMIT)).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export async function getVerticalWeights(): Promise<VerticalWeights> {
  const defaults = defaultVerticalWeights();
  const raw = (await getSetting(SETTING_VERTICAL_WEIGHTS)).trim();
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out = { ...defaults };
    for (const v of VERTICALS_V2) {
      const n = Number(parsed[v.id]);
      if (Number.isFinite(n) && n >= 0) out[v.id] = n;
    }
    const sum = Object.values(out).reduce((a, b) => a + b, 0);
    if (sum <= 0) return defaults;
    return out;
  } catch {
    return defaults;
  }
}

export async function saveRadarRuntimeSettings(params: {
  dailyQueueLimit?: number;
  manualRespectsLimit?: boolean;
  weights?: Partial<VerticalWeights>;
}): Promise<{
  dailyQueueLimit: number;
  manualRespectsLimit: boolean;
  weights: VerticalWeights;
}> {
  const patch: Record<string, string> = {};

  let dailyQueueLimit = await getDailyQueueLimit();
  if (typeof params.dailyQueueLimit === "number") {
    dailyQueueLimit = Math.min(100, Math.max(1, Math.floor(params.dailyQueueLimit)));
    patch[SETTING_DAILY_QUEUE_LIMIT] = String(dailyQueueLimit);
  }

  let manualRespectsLimit = await getManualRespectsLimit();
  if (typeof params.manualRespectsLimit === "boolean") {
    manualRespectsLimit = params.manualRespectsLimit;
    patch[SETTING_MANUAL_RESPECTS_LIMIT] = manualRespectsLimit ? "1" : "0";
  }

  let weights = await getVerticalWeights();
  if (params.weights) {
    weights = { ...weights };
    for (const v of VERTICALS_V2) {
      if (params.weights[v.id] != null) {
        const n = Number(params.weights[v.id]);
        if (Number.isFinite(n) && n >= 0) weights[v.id] = n;
      }
    }
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (sum <= 0) weights = defaultVerticalWeights();
    patch[SETTING_VERTICAL_WEIGHTS] = JSON.stringify(weights);
  }

  if (Object.keys(patch).length) {
    await setManySetting(patch);
  }

  return { dailyQueueLimit, manualRespectsLimit, weights };
}

export function estimateUsd(tokens: number): number {
  return (Math.max(0, tokens) / 1_000_000) * USD_PER_MILLION_TOKENS;
}

export function formatBatchDateRu(iso: string): string {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
