// Портировано с Python gmaps-lead-finder/website_checker.py
// Проверяет сайт на проблемы: SSL, mobile, copyright, speed, status

export interface WebsiteResult {
  url: string;
  reachable: boolean;
  ssl: boolean;
  copyrightYear: number | null;
  hasViewport: boolean;
  responseTime: number;
  statusCode: number;
  issues: string[];
  score: number; // 0 = отлично, чем выше = хуже
}

const CURRENT_YEAR = new Date().getFullYear();
const OUTDATED_CUTOFF = CURRENT_YEAR - 2;
const SLOW_THRESHOLD = 5.0; // секунд

export async function checkWebsite(url: string): Promise<WebsiteResult> {
  const result: WebsiteResult = {
    url,
    reachable: true,
    ssl: false,
    copyrightYear: null,
    hasViewport: true,
    responseTime: 0,
    statusCode: 0,
    issues: [],
    score: 0,
  };

  if (!url || !url.trim()) {
    result.reachable = false;
    result.issues.push("нет URL");
    result.score += 5;
    return result;
  }

  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = "https://" + cleanUrl;
  }

  result.ssl = cleanUrl.startsWith("https://");
  if (!result.ssl) {
    result.issues.push("нет HTTPS");
    result.score += 2;
  }

  try {
    const t0 = Date.now();
    const resp = await fetch(cleanUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KonversusLeadRadar/1.0)" },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    result.responseTime = (Date.now() - t0) / 1000;
    result.statusCode = resp.status;

    if (resp.status >= 400) {
      result.reachable = false;
      result.issues.push(`HTTP ${resp.status}`);
      result.score += 3;
      return result;
    }

    const html = await resp.text();

    // Проверка мобильной версии
    if (!/<meta[^>]*name=["']viewport["'][^>]*>/i.test(html)) {
      result.hasViewport = false;
      result.issues.push("не адаптирован под мобильные");
      result.score += 2;
    }

    // Проверка года в копирайте
    const yearMatches = html.matchAll(/©\s*(\d{4})|[Cc]opyright\s+(\d{4})/g);
    const years: number[] = [];
    for (const m of yearMatches) {
      const yr = parseInt(m[1] || m[2]);
      if (yr >= 2000 && yr <= CURRENT_YEAR) years.push(yr);
    }
    if (years.length > 0) {
      result.copyrightYear = Math.max(...years);
      if (result.copyrightYear <= OUTDATED_CUTOFF) {
        result.issues.push(`копирайт ${result.copyrightYear} г. (устарел)`);
        result.score += 2;
      }
    }

    // Проверка скорости
    if (result.responseTime > SLOW_THRESHOLD) {
      result.issues.push(`медленный (${result.responseTime.toFixed(1)}с)`);
      result.score += 1;
    }

    // Проверка наличия телефона
    if (!/\+7|8\s*\(?\d{3}\)?[\s-]?\d{3}/.test(html)) {
      result.issues.push("нет телефона на сайте");
      result.score += 1;
    }

  } catch (err: any) {
    result.reachable = false;
    if (err.name === "TimeoutError" || err.code === "ETIMEDOUT") {
      result.issues.push("таймаут");
      result.score += 3;
    } else if (err.cause?.code === "ECONNREFUSED") {
      result.issues.push("сайт недоступен");
      result.score += 3;
    } else if (err.message?.includes("SSL") || err.message?.includes("certificate")) {
      result.issues.push("ошибка SSL");
      result.score += 2;
    } else {
      result.issues.push("ошибка соединения");
      result.score += 2;
    }
  }

  return result;
}

// Конвертация score в человеческую оценку
export function scoreToGrade(score: number): { grade: string; color: string; label: string } {
  if (score === 0) return { grade: "A+", color: "#10b981", label: "Отлично" };
  if (score <= 2) return { grade: "A", color: "#10b981", label: "Хорошо" };
  if (score <= 4) return { grade: "B", color: "#f59e0b", label: "Средне" };
  if (score <= 6) return { grade: "C", color: "#f59e0b", label: "Плохо" };
  return { grade: "D", color: "#ef4444", label: "Критично" };
}

// Нормализация в 0-100 для отображения
export function scoreToPercent(score: number): number {
  return Math.max(0, 100 - score * 12);
}
