import "server-only";

interface ScanResult {
  url: string;
  scannedAt: string;
  problems: Problem[];
  score: number;
}

interface Problem {
  id: string;
  severity: "critical" | "warning" | "ok";
  category: string;
  title: string;
  description: string;
  detail?: string;
  priceFrom?: number;
  priceTo?: number;
  loss?: string;
}

export async function scanWebsite(rawUrl: string): Promise<ScanResult> {
  let url = rawUrl.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  const parsed = new URL(url);
  const domain = parsed.hostname;
  const problems: Problem[] = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Konversus-AI-Auditor/1.0" },
    });
    clearTimeout(timeout);

    const html = await res.text();

    // Title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || "";
    if (!title) {
      problems.push({ id: "seo-title", severity: "critical", category: "SEO", title: "Отсутствует Title", description: "Заголовок страницы не заполнен. Поисковики не понимают о чём сайт.", detail: "Title должен быть 50-70 символов.", priceFrom: 3000, priceTo: 5000, loss: "Вы теряете до 60% поискового трафика." });
    } else if (title.length < 30) {
      problems.push({ id: "seo-title-short", severity: "warning", category: "SEO", title: "Title слишком короткий", description: `Текущий: «${title}» (${title.length} симв.). Минимум 50.`, priceFrom: 3000, priceTo: 5000, loss: "Снижение CTR на 20-30%." });
    } else {
      problems.push({ id: "seo-title-ok", severity: "ok", category: "SEO", title: "Title в порядке", description: `«${title}» — ${title.length} символов.` });
    }

    // H1
    const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
    const h1 = h1Match?.[1]?.trim() || "";
    if (!h1) {
      problems.push({ id: "seo-h1", severity: "critical", category: "SEO", title: "Отсутствует H1", description: "Главный заголовок не найден. Как книга без названия.", detail: "H1 должен быть один, 20-70 символов.", priceFrom: 2000, priceTo: 4000, loss: "Поисковики понижают релевантность." });
    } else if (h1.length > 100) {
      problems.push({ id: "seo-h1-long", severity: "warning", category: "SEO", title: "H1 слишком длинный", description: `«${h1.slice(0, 80)}...» — ${h1.length} симв. Норма: 20-70.`, priceFrom: 2000, priceTo: 3000 });
    } else {
      problems.push({ id: "seo-h1-ok", severity: "ok", category: "SEO", title: "H1 в порядке", description: `«${h1}» — хорошо.` });
    }

    // Meta Description
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i) || html.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"[^>]*>/i);
    const desc = descMatch?.[1]?.trim() || "";
    if (!desc) {
      problems.push({ id: "seo-desc", severity: "warning", category: "SEO", title: "Нет Meta Description", description: "Описание не задано. В поиске будет случайный текст.", priceFrom: 2000, priceTo: 4000, loss: "Снижение CTR на 15-25%." });
    }

    // SSL
    if (!url.startsWith("https")) {
      problems.push({ id: "ssl-missing", severity: "critical", category: "Безопасность", title: "Сайт без HTTPS", description: "Браузеры показывают «Небезопасно».", priceFrom: 1500, priceTo: 3000, loss: "До 70% посетителей уходят." });
    } else {
      problems.push({ id: "ssl-ok", severity: "ok", category: "Безопасность", title: "SSL в порядке", description: "HTTPS включён, соединение защищено." });
    }

    // Размер страницы
    const sizeKB = Math.round(html.length / 1024);
    if (sizeKB > 500) {
      problems.push({ id: "perf-size", severity: "warning", category: "Скорость", title: "Тяжёлая страница", description: `HTML: ${sizeKB} КБ. Может грузиться > 5 сек.`, priceFrom: 8000, priceTo: 20000, loss: "53% посетителей уходят при загрузке > 3с." });
    } else {
      problems.push({ id: "perf-size-ok", severity: "ok", category: "Скорость", title: "Размер в норме", description: `HTML: ${sizeKB} КБ — быстро.` });
    }

    // Viewport
    if (!html.includes("viewport")) {
      problems.push({ id: "mobile-viewport", severity: "critical", category: "Мобильность", title: "Не адаптирован под телефон", description: "Нет Viewport. 60%+ мобильного трафика видят ПК-версию.", priceFrom: 10000, priceTo: 25000, loss: "Потеря мобильных клиентов." });
    } else {
      problems.push({ id: "mobile-ok", severity: "ok", category: "Мобильность", title: "Адаптивность в порядке", description: "Viewport присутствует." });
    }

    // Alt у картинок
    const imgMatches = html.match(/<img[^>]*>/gi) || [];
    const imgsWithoutAlt = imgMatches.filter(img => !/alt\s*=\s*["']/.test(img));
    if (imgsWithoutAlt.length > imgMatches.length * 0.5 && imgMatches.length > 0) {
      problems.push({ id: "seo-alt", severity: "warning", category: "SEO", title: "Картинки без Alt", description: `${imgsWithoutAlt.length} из ${imgMatches.length} без описания.`, priceFrom: 3000, priceTo: 8000, loss: "Потеря трафика Google Картинки." });
    }

  } catch (err: any) {
    problems.push({ id: "error", severity: "critical", category: "Ошибка", title: "Не удалось проверить", description: err.message?.slice(0, 150) || "Сайт недоступен" });
  }

  const critical = problems.filter(p => p.severity === "critical").length;
  const warnings = problems.filter(p => p.severity === "warning").length;
  const score = Math.max(0, 100 - critical * 20 - warnings * 8);

  return { url: domain, scannedAt: new Date().toISOString(), problems, score };
}
