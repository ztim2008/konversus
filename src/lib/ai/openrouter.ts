/**
 * OpenRouter API client — фундамент для AI-генерации в Document Builder v3.
 * Сейчас работает как активный клиент: при наличии OPENROUTER_API_KEY
 * делает реальные запросы к OpenRouter. Без ключа — выбрасывает ошибку.
 */

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterConfig {
  /** API-ключ из переменной окружения OPENROUTER_API_KEY */
  apiKey: string;
  /**
   * Модель. По умолчанию — google/gemini-flash-1.5 (бесплатная, быстрая).
   * Варианты для аудитов: google/gemini-pro-1.5, anthropic/claude-3-haiku, mistralai/mistral-7b-instruct
   */
  model?: string;
  maxTokens?: number;
}

export interface OpenRouterResponse {
  content: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number };
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  config: OpenRouterConfig
): Promise<OpenRouterResponse> {
  const { apiKey, model = "google/gemini-flash-1.5", maxTokens = 6000 } = config;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://konversus.ru",
      "X-Title": "Konversus FPB",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "—");
    throw new Error(`OpenRouter ${response.status}: ${errText}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    model: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const content = data.choices[0]?.message?.content ?? "";
  const usage = {
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };

  return { content, model: data.model ?? model, usage };
}
