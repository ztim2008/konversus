/**
 * Прямой клиент DeepSeek (api.deepseek.com), без OpenRouter.
 * Ключ: DEEPSEEK_API_KEY или site_settings.deepseek_api_key.
 */
export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekResponse {
  content: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number };
}

export async function callDeepSeek(
  messages: DeepSeekMessage[],
  config: { apiKey: string; model?: string; maxTokens?: number }
): Promise<DeepSeekResponse> {
  const { apiKey, model = "deepseek-chat", maxTokens = 800 } = config;

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "—");
    throw new Error(`DeepSeek ${response.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  return {
    content: data.choices?.[0]?.message?.content ?? "",
    model: data.model ?? model,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}
