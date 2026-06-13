/**
 * Актуальный список моделей OpenRouter (по состоянию на июнь 2026).
 * Обновлять по мере появления новых моделей.
 */

export type ModelTier = "free" | "cheap" | "mid" | "premium";
export type ModelStrength = "fast" | "balanced" | "strong" | "flagship";

export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  tier: ModelTier;
  strength: ModelStrength;
  context: string;
  inputPricePerM: string; // $/M tokens
  note?: string;
}

export const OPENROUTER_MODELS: OpenRouterModel[] = [
  // ── Google Gemini ──────────────────────────────────────────────────
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "Google",
    tier: "cheap",
    strength: "fast",
    context: "1M",
    inputPricePerM: "$0.10",
    note: "Ультрабыстрый, дёшевый. Идеален для Stage 1",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    tier: "cheap",
    strength: "balanced",
    context: "1M",
    inputPricePerM: "$0.30",
    note: "Баланс скорость/качество. Хорош для стратегии",
  },
  {
    id: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    provider: "Google",
    tier: "mid",
    strength: "balanced",
    context: "1M",
    inputPricePerM: "$0.50",
    note: "Новый, мощнее 2.5 Flash, поддерживает thinking",
  },
  {
    id: "google/gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "Google",
    tier: "mid",
    strength: "strong",
    context: "1M",
    inputPricePerM: "$1.50",
    note: "Топовый Flash, код + аналитика",
  },
  // ── Anthropic Claude ────────────────────────────────────────────────
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    tier: "mid",
    strength: "strong",
    context: "200K",
    inputPricePerM: "$3.00",
    note: "Лучший для бизнес-анализа и стратегии",
  },
  {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    tier: "cheap",
    strength: "balanced",
    context: "200K",
    inputPricePerM: "$0.80",
    note: "Быстрый Claude. Хороший баланс качество/цена",
  },
  {
    id: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    tier: "premium",
    strength: "flagship",
    context: "200K",
    inputPricePerM: "$3.00",
    note: "Новейший Claude, топ для глубокого анализа",
  },
  // ── OpenAI GPT ──────────────────────────────────────────────────────
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    tier: "cheap",
    strength: "fast",
    context: "128K",
    inputPricePerM: "$0.15",
    note: "Дёшево и быстро от OpenAI",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    tier: "mid",
    strength: "strong",
    context: "128K",
    inputPricePerM: "$2.50",
    note: "Надёжный выбор для сложных задач",
  },
  // ── Meta Llama (бесплатные квоты) ──────────────────────────────────
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    provider: "Meta",
    tier: "free",
    strength: "balanced",
    context: "128K",
    inputPricePerM: "$0.00",
    note: "Бесплатно в рамках лимитов OpenRouter",
  },
  {
    id: "meta-llama/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B",
    provider: "Meta",
    tier: "free",
    strength: "fast",
    context: "128K",
    inputPricePerM: "$0.00",
    note: "Бесплатно, минимальное качество",
  },
  // ── DeepSeek ────────────────────────────────────────────────────────
  {
    id: "deepseek/deepseek-chat-v3-0324",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    tier: "cheap",
    strength: "strong",
    context: "64K",
    inputPricePerM: "$0.28",
    note: "Отличный анализ по низкой цене",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    tier: "mid",
    strength: "flagship",
    context: "64K",
    inputPricePerM: "$0.55",
    note: "Мощная reasoning модель",
  },
];

export const TIER_LABELS: Record<ModelTier, string> = {
  free: "Бесплатно",
  cheap: "Дёшево",
  mid: "Средняя цена",
  premium: "Премиум",
};

export const TIER_COLORS: Record<ModelTier, string> = {
  free: "#4ade80",
  cheap: "#60a5fa",
  mid: "#f59e0b",
  premium: "#f472b6",
};

export const STRENGTH_LABELS: Record<ModelStrength, string> = {
  fast: "Быстрая",
  balanced: "Сбалансированная",
  strong: "Сильная",
  flagship: "Флагман",
};

export const STRENGTH_ICONS: Record<ModelStrength, string> = {
  fast: "⚡",
  balanced: "⚖️",
  strong: "🔥",
  flagship: "🚀",
};

export function getModelById(id: string): OpenRouterModel | undefined {
  return OPENROUTER_MODELS.find((m) => m.id === id);
}
