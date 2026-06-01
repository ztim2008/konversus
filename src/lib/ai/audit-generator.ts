/**
 * Audit Generator — генерирует коммерческое предложение по URL компании.
 * Использует OpenRouter (Gemini Flash по умолчанию, бесплатно ~2-3 запроса/день).
 *
 * Процесс:
 * 1. Скачать текст страницы (fetch + HTML-strip)
 * 2. Передать в OpenRouter с системным промптом
 * 3. Распарсить JSON-ответ в массив ProposalBlock[]
 */
import type { ProposalBlock, ProposalBlockPayload } from "@/types/domain";
import { callOpenRouter } from "./openrouter";

// ── Системный промпт ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Ты — старший аналитик и коммерческий директор студии цифрового маркетинга КОНВЕРСУС. Специализация: производственные и B2B компании России.

Твоя задача: проанализировать компанию по тексту её сайта/страницы и составить профессиональное коммерческое предложение на модернизацию их цифрового присутствия (сайт, SEO, визуальная упаковка).

ОБЯЗАТЕЛЬНЫЙ ФОРМАТ ОТВЕТА — строго валидный JSON-массив (без markdown-обёртки):
[
  { "type": "doc-section", "title": "Название раздела", "subtitle": "Подзаголовок раздела (опционально)" },
  { "type": "doc-text", "content": "<h2>Заголовок</h2><p>Текст абзаца...</p><ul><li>Пункт 1</li></ul>" }
]

ПРАВИЛА:
- Только типы doc-section и doc-text
- Каждый раздел начинается с doc-section, затем идут один или несколько doc-text
- В content используй HTML: h2, h3, p, ul/li, ol/li, strong, em — без inline стилей
- Создавай от 8 до 14 блоков
- Пиши деловым, конкретным языком — без воды и клише
- Если информации мало — честно отметь это и предложи что обычно нужно улучшить в таких компаниях
- Валюта — рубли, формат цен примерный

СТРУКТУРА ДОКУМЕНТА:
1. Аудит текущего сайта (проблемы дизайна, UX, мобильной версии)
2. SEO и поисковый потенциал
3. Анализ доверия (сертификаты, кейсы, команда, контакты)
4. Конкурентная ситуация
5. Предлагаемое решение (что делаем, почему это важно)
6. Концепция нового сайта (структура, разделы)
7. Стратегия роста
8. Коммерческое предложение (что входит, стоимость, сроки)`;

// ── Scraper — извлекает текст страницы ────────────────────────────────────
export async function scrapePageText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Konversus-Audit/1.0; +https://konversus.ru)",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Не удалось загрузить страницу: HTTP ${response.status}`);
  }

  const html = await response.text();

  // Удаляем скрипты, стили, SVG
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Ограничиваем до ~6000 символов (хватит для промпта)
  return cleaned.slice(0, 6000);
}

// ── Парсер ответа ────────────────────────────────────────────────────────────
interface RawBlock {
  type: "doc-section" | "doc-text";
  title?: string;
  subtitle?: string;
  content?: string;
}

function parseAuditResponse(raw: string): ProposalBlock[] {
  // Ищем JSON-массив в ответе (модель иногда добавляет markdown-обёртку)
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("ИИ вернул ответ не в JSON-формате. Попробуйте ещё раз.");
  }

  let items: RawBlock[];
  try {
    items = JSON.parse(jsonMatch[0]) as RawBlock[];
  } catch {
    throw new Error("Не удалось распарсить JSON из ответа ИИ.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("ИИ вернул пустой список блоков.");
  }

  return items.map((item, i): ProposalBlock => {
    const id = `ai-${Date.now()}-${i}`;
    const visible = true;

    if (item.type === "doc-section") {
      return {
        id,
        type: "doc-section",
        visible,
        title: item.title ?? "Раздел",
        payload: {
          headline: item.title ?? "Раздел",
          body: item.subtitle ?? "",
        } satisfies ProposalBlockPayload,
      };
    }

    return {
      id,
      type: "doc-text",
      visible,
      title: "Текст",
      payload: {
        richTextHtml: item.content ?? "<p></p>",
      } satisfies ProposalBlockPayload,
    };
  });
}

// ── Основная функция ─────────────────────────────────────────────────────────
export interface AuditGeneratorOptions {
  sourceUrl: string;
  /** Дополнительные указания (опционально) */
  extraContext?: string;
  /** API-ключ из переменной окружения OPENROUTER_API_KEY */
  apiKey: string;
  /** Модель. По умолчанию google/gemini-flash-1.5 */
  model?: string;
}

export interface AuditGeneratorResult {
  blocks: ProposalBlock[];
  usage: { promptTokens: number; completionTokens: number };
  model: string;
}

export async function generateAuditBlocks(
  options: AuditGeneratorOptions
): Promise<AuditGeneratorResult> {
  const { sourceUrl, extraContext, apiKey, model } = options;

  // 1. Скачиваем текст страницы
  let pageText: string;
  try {
    pageText = await scrapePageText(sourceUrl);
  } catch (err) {
    throw new Error(`Не удалось загрузить страницу: ${String(err)}`);
  }

  // 2. Формируем промпт
  const userMessage = [
    `Анализируй компанию по сайту.`,
    `URL: ${sourceUrl}`,
    "",
    `Текст страницы (фрагмент):`,
    pageText,
    extraContext ? `\nДополнительный контекст от менеджера:\n${extraContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // 3. Запрос к OpenRouter
  const result = await callOpenRouter(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    { apiKey, model: model ?? "google/gemini-flash-1.5", maxTokens: 6000 }
  );

  // 4. Парсим ответ в блоки
  const blocks = parseAuditResponse(result.content);

  return { blocks, usage: result.usage, model: result.model };
}
