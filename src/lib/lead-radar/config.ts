/**
 * Конфиг Лид-радар Auto (лимиты + веса рулетки из settings).
 */
import "server-only";
import { getSetting, setManySetting } from "@/lib/data/settings";
import { getDbPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import {
  VERTICALS_V2,
  type VerticalId,
} from "@/lib/lead-radar-geo";

/** Дефолт очереди и отправки (конвейер 40/день). */
export const DAILY_QUEUE_LIMIT = 40;
export const DAILY_SEND_LIMIT = 40;

export const SETTING_DAILY_QUEUE_LIMIT = "lead_radar_daily_queue_limit";
export const SETTING_DAILY_SEND_LIMIT = "lead_radar_daily_send_limit";
export const SETTING_AUTO_SEND_ENABLED = "lead_radar_auto_send_enabled";
export const SETTING_VERTICAL_WEIGHTS = "lead_radar_vertical_weights";
export const SETTING_MANUAL_RESPECTS_LIMIT = "lead_radar_manual_respects_limit";

/** Минимальный hotScore для приоритета в TG-превью (не жёсткий gate очереди). */
export const HOT_SCORE_PREVIEW_MIN = 0;

/** Вечерний отчёт по умолчанию (МСК). */
export const DAILY_REPORT_HOUR_MSK = 21;

/** Окно автоотправки (час МСК, включительно). 9:00–18:59 → ~40 слотов ×15 мин. */
export const AUTO_SEND_WINDOW_START_HOUR_MSK = 9;
export const AUTO_SEND_WINDOW_END_HOUR_MSK = 18;

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

export async function getDailySendLimit(): Promise<number> {
  const raw = (await getSetting(SETTING_DAILY_SEND_LIMIT)).trim();
  const n = Number.parseInt(raw || String(DAILY_SEND_LIMIT), 10);
  if (!Number.isFinite(n) || n < 1) return DAILY_SEND_LIMIT;
  return Math.min(100, Math.max(1, n));
}

/** По умолчанию включено (конвейер). Выкл: setting = 0/false. */
export async function getAutoSendEnabled(): Promise<boolean> {
  const raw = (await getSetting(SETTING_AUTO_SEND_ENABLED)).trim().toLowerCase();
  if (!raw) return true;
  return !(raw === "0" || raw === "false" || raw === "no" || raw === "off");
}

export async function getManualRespectsLimit(): Promise<boolean> {
  const raw = (await getSetting(SETTING_MANUAL_RESPECTS_LIMIT)).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** Сейчас в окне автоотправки по Москве? */
export function isAutoSendWindowMsk(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  return (
    hour >= AUTO_SEND_WINDOW_START_HOUR_MSK &&
    hour <= AUTO_SEND_WINDOW_END_HOUR_MSK
  );
}

/** Сколько писем уже ушло за batch_date (contacted+). */
export async function countSentForBatchDate(batchDate?: string): Promise<number> {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT COUNT(*) AS c FROM lead_radar_sites
     WHERE status IN ('contacted','replied','won')
       AND batch_date = COALESCE(?, CURDATE())`,
    [batchDate || null]
  );
  return Number((rows as RowDataPacket[])[0]?.c ?? 0);
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
  dailySendLimit?: number;
  autoSendEnabled?: boolean;
  manualRespectsLimit?: boolean;
  weights?: Partial<VerticalWeights>;
}): Promise<{
  dailyQueueLimit: number;
  dailySendLimit: number;
  autoSendEnabled: boolean;
  manualRespectsLimit: boolean;
  weights: VerticalWeights;
}> {
  const patch: Record<string, string> = {};

  let dailyQueueLimit = await getDailyQueueLimit();
  if (typeof params.dailyQueueLimit === "number") {
    dailyQueueLimit = Math.min(100, Math.max(1, Math.floor(params.dailyQueueLimit)));
    patch[SETTING_DAILY_QUEUE_LIMIT] = String(dailyQueueLimit);
  }

  let dailySendLimit = await getDailySendLimit();
  if (typeof params.dailySendLimit === "number") {
    dailySendLimit = Math.min(100, Math.max(1, Math.floor(params.dailySendLimit)));
    patch[SETTING_DAILY_SEND_LIMIT] = String(dailySendLimit);
  }

  let autoSendEnabled = await getAutoSendEnabled();
  if (typeof params.autoSendEnabled === "boolean") {
    autoSendEnabled = params.autoSendEnabled;
    patch[SETTING_AUTO_SEND_ENABLED] = autoSendEnabled ? "1" : "0";
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

  return {
    dailyQueueLimit,
    dailySendLimit,
    autoSendEnabled,
    manualRespectsLimit,
    weights,
  };
}

export function estimateUsd(tokens: number): number {
  return (Math.max(0, tokens) / 1_000_000) * USD_PER_MILLION_TOKENS;
}

export function formatBatchDateRu(iso: string): string {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
