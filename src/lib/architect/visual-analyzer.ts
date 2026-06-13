/**
 * Visual Analyzer — скриншот через Playwright + оценка через GPT-4o Vision.
 * Запускается как отдельный stage после data-collector.
 */

import type { VisualAnalysis } from "@/lib/architect/types";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const VISION_SYSTEM = `Ты — UX/UI эксперт
Отвечай СТРОГО валидным JSON без markdown-обёртки.

JSON-схема:
{
  "design_score": <число 0-100>,
  "trust_score": <число 0-100>,
  "clarity_score": <число 0-100>,
  "overall_impression": "2-3 предложения об общем впечатлении",
  "design_strengths": ["что визуально хорошо сделано, 2-4 пункта"],
  "design_issues": ["визуальные проблемы и недостатки, 2-5 пунктов"],
  "above_fold_assessment": "оценка первого экрана — понятно ли с первых секунд что это и для кого",
  "cta_visibility": "visible|weak|missing",
  "mobile_readiness": "good|medium|poor"
}

Шкалы:
- design_score: 0-40 плохой дизайн, 41-65 средний, 66-80 хороший, 81-100 отличный
- trust_score: насколько сайт вызывает доверие (профессиональный вид, контакты, отзывы)
- clarity_score: сразу ли понятно кто это и что продаёт
- Все ответы строго на русском языке`;

async function callVisionApi(
  imageBase64: string,
  url: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://konversus.ru",
      "X-Title": "Konversus Visual Analyzer",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o",
      max_tokens: 1000,
      messages: [
        { role: "system", content: VISION_SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: `Анализируй скриншот главной страницы: ${url}\nДай экспертную оценку по JSON-схеме.`,
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const txt = await response.text().catch(() => "");
    throw new Error(`Vision API ${response.status}: ${txt.slice(0, 200)}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

export async function analyzeVisual(
  url: string,
  apiKey: string,
  projectId?: string
): Promise<VisualAnalysis> {
  let browser;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    // Блокируем тяжёлые медиа-ресурсы и внешние трекеры для ускорения загрузки
    await page.route("**", (route) => {
      const url = route.request().url();
      const resourceType = route.request().resourceType();

      // Блокируем медиа файлы
      if (/\.(mp4|webm|woff|woff2|ttf|eot|otf|mp3|wav|avi|mov)(\?|$)/i.test(url)) {
        return route.abort();
      }
      // Блокируем внешние трекеры и аналитику (не нужны для скриншота)
      if (
        resourceType === "media" ||
        /google-analytics\.com|googletagmanager\.com|facebook\.net|doubleclick\.net|mc\.yandex\.ru\/watch/i.test(url)
      ) {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: 25_000 });
    // Небольшая пауза для финальных CSS-анимаций
    await page.waitForTimeout(500);

    // Скриншот первого экрана
    const screenshotBuffer = await page.screenshot({
      type: "jpeg",
      quality: 75,
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });

    const base64 = screenshotBuffer.toString("base64");

    // Сохраняем скриншот на диск если передан projectId
    let screenshotPath: string | undefined;
    if (projectId) {
      try {
        const screenshotsDir = join(process.cwd(), "public", "screenshots");
        await mkdir(screenshotsDir, { recursive: true });
        const filename = `${projectId}.jpg`;
        await writeFile(join(screenshotsDir, filename), screenshotBuffer);
        screenshotPath = `/screenshots/${filename}`;
      } catch (saveErr) {
        console.warn("[visual-analyzer] failed to save screenshot:", saveErr);
      }
    }

    const raw = await callVisionApi(base64, url, apiKey);
    const parsed = parseJsonSafe(raw);

    return {
      screenshot_taken: true,
      screenshot_path: screenshotPath,
      design_score: clamp(parsed?.design_score as number ?? 50, 0, 100),
      trust_score: clamp(parsed?.trust_score as number ?? 50, 0, 100),
      clarity_score: clamp(parsed?.clarity_score as number ?? 50, 0, 100),
      overall_impression: (parsed?.overall_impression as string) ?? "",
      design_strengths: (parsed?.design_strengths as string[]) ?? [],
      design_issues: (parsed?.design_issues as string[]) ?? [],
      above_fold_assessment: (parsed?.above_fold_assessment as string) ?? "",
      cta_visibility: (parsed?.cta_visibility as VisualAnalysis["cta_visibility"]) ?? "weak",
      mobile_readiness: (parsed?.mobile_readiness as VisualAnalysis["mobile_readiness"]) ?? "medium",
    };
  } catch (err) {
    console.error("[visual-analyzer] error:", err);
    return {
      screenshot_taken: false,
      design_score: 0,
      trust_score: 0,
      clarity_score: 0,
      overall_impression: "",
      design_strengths: [],
      design_issues: [],
      above_fold_assessment: "",
      cta_visibility: "weak",
      mobile_readiness: "medium",
    };
  } finally {
    if (browser) await browser.close();
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parseJsonSafe(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

