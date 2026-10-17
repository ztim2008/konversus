import "server-only";

import type { Browser, BrowserContext, Page } from "playwright";

import type { AuditInput } from "@/lib/seo-positions/audit";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const METRIKA_RE = /mc\.yandex\.[a-z]+\/(watch|metrika)/i;
const EXTRA_PAGES = 5;

type DesktopProbe = {
  logo: boolean;
  logoLink: boolean;
  phoneInHeader: boolean;
  telLinks: number;
  ctaText: string | null;
  forms: number;
  maxRequired: number;
  telInputs: number;
  mask: boolean;
  reviews: boolean;
  certs: boolean;
  social: string[];
  links: string[];
};

/** Выполняется в браузере: только встроенные API, без внешних ссылок. */
function probeDesktop(): DesktopProbe {
  const vis = (el: Element) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };
  const attrs = (el: Element) =>
    [el.id, el.getAttribute("class") || "", el.getAttribute("alt") || "", el.getAttribute("src") || "", el.getAttribute("aria-label") || ""].join(" ");

  const logo = [...document.querySelectorAll("img, svg, a, div, span, picture")].find(
    (el) => /logo|логотип/i.test(attrs(el)) && vis(el) && el.getBoundingClientRect().top < 250
  );
  const logoLink = !!logo && !!(logo.closest("a[href]") || logo.querySelector("a[href]"));

  const phoneRe = /(\+?\d[\d\s\-()]{8,}\d)/;
  const phoneInHeader = [...document.querySelectorAll("a, span, div, p, b, strong, li")].some((el) => {
    if (el.childElementCount > 2 || !vis(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.top > 180) return false;
    return (el.getAttribute("href") || "").startsWith("tel:") || phoneRe.test((el as HTMLElement).innerText || "");
  });

  const ctaRe = /заказ|заявк|позвон|звонок|вызв|консульт|рассчит|расч[её]т|получить|записат|оставить|связаться|напишите|buyurtma/i;
  const cta = [...document.querySelectorAll("a, button, input[type=submit]")].find((el) => {
    if (!vis(el) || el.getBoundingClientRect().top > innerHeight) return false;
    const isButton =
      el.tagName !== "A" || /btn|button|cta/i.test(el.getAttribute("class") || "") || /^(tel:|https?:\/\/(wa\.me|t\.me))/.test(el.getAttribute("href") || "");
    if (!isButton) return false;
    const text = (el as HTMLElement).innerText || (el as HTMLInputElement).value || "";
    return ctaRe.test(text);
  });

  const forms = [...document.querySelectorAll("form")].filter((f) => f.querySelector("input:not([type=hidden]), textarea"));
  const maxRequired = Math.max(
    0,
    ...forms.map(
      (f) =>
        f.querySelectorAll(
          "input[required]:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea[required], select[required], [aria-required=true]:not([type=checkbox])"
        ).length
    )
  );
  const telInputs = [...document.querySelectorAll("input")].filter(
    (i) => i.type === "tel" || /phone|tel|телефон/i.test(`${i.name} ${i.placeholder} ${i.id}`)
  );
  const w = window as unknown as Record<string, unknown> & { jQuery?: { fn?: Record<string, unknown> } };
  const mask =
    telInputs.some(
      (i) =>
        i.getAttribute("pattern") ||
        i.getAttribute("data-mask") ||
        i.getAttribute("data-inputmask") ||
        i.getAttribute("data-phonemask") ||
        /_|\(\s*\d*\s*\)|x{2,}/i.test(i.placeholder)
    ) ||
    !!w.Inputmask ||
    !!w.IMask ||
    !!w.jQuery?.fn?.mask ||
    !!w.jQuery?.fn?.inputmask ||
    [...document.scripts].some((s) => /mask|cleave/i.test(s.src));

  const text = document.body?.innerText || "";
  const hrefs = [...document.querySelectorAll("a[href]")].map((a) => (a as HTMLAnchorElement).href);
  const socialRe = /t\.me\/|telegram\.me|wa\.me|whatsapp\.com|instagram\.com|vk\.com|facebook\.com|youtube\.com|ok\.ru|tiktok\.com|^viber:/i;
  const social = [...new Set(hrefs.filter((h) => socialRe.test(h)).map((h) => (h.startsWith("viber:") ? "viber" : new URL(h).hostname.replace(/^www\./, ""))))];

  const here = location.href.split("#")[0];
  const links = [
    ...new Set(
      hrefs
        .map((h) => h.split("#")[0])
        .filter((h) => {
          try {
            const u = new URL(h);
            return u.origin === location.origin && h !== here && !/\.(jpe?g|png|webp|svg|gif|pdf|zip|docx?|xlsx?)$/i.test(u.pathname);
          } catch {
            return false;
          }
        })
    ),
  ];

  return {
    logo: !!logo,
    logoLink,
    phoneInHeader,
    telLinks: document.querySelectorAll('a[href^="tel:"]').length,
    ctaText: cta ? ((cta as HTMLElement).innerText || (cta as HTMLInputElement).value || "").trim().slice(0, 40) : null,
    forms: forms.length,
    maxRequired,
    telInputs: telInputs.length,
    mask,
    reviews: /отзыв/i.test(text) || hrefs.some((h) => /review|otzyv|otziv/i.test(h)),
    certs: /сертификат|лиценз|диплом|свидетельств/i.test(text),
    social,
    links,
  };
}

/** Есть ли прижатая к верху полоса на всю ширину (после прокрутки). */
function probeSticky(): boolean {
  return [...document.querySelectorAll("body *")].some((el) => {
    const s = getComputedStyle(el);
    if (s.position !== "fixed" && s.position !== "sticky") return false;
    if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    return r.top <= 10 && r.bottom > 0 && r.height >= 30 && r.height <= Math.min(260, innerHeight * 0.4) && r.width >= innerWidth * 0.6;
  });
}

function probeMobile(): { viewport: string; overflow: number; burger: boolean } {
  const vis = (el: Element) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };
  const re = /burger|hamburger|menu-?toggle|nav-?toggle|navbar-toggler|mobile-?menu|menu-?btn|menu-?button|toggle-?menu|menu-?icon|mob-?menu|open-?menu|menu-?open|menu-?trigger/i;
  const burger = [...document.querySelectorAll("button, a, div, span, label, i")].some((el) => {
    if (!vis(el) || el.getBoundingClientRect().top > 150) return false;
    const a = [el.id, el.getAttribute("class") || "", el.getAttribute("aria-label") || ""].join(" ");
    return re.test(a) || /^(меню|menu)$/i.test(el.getAttribute("aria-label") || "");
  });
  return {
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "",
    overflow: document.documentElement.scrollWidth - innerWidth,
    burger,
  };
}

function probeUpButton(): boolean {
  const re = /to-?top|scroll-?top|back-?to-?top|go-?top|up-?btn|btn-?up|button-?up|scroll-?up|arrow-?up|наверх|вверх/i;
  return [...document.querySelectorAll("a, button, div, span, i")].some((el) => {
    const s = getComputedStyle(el);
    if (s.position !== "fixed" || s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    return re.test([el.id, el.getAttribute("class") || "", el.getAttribute("aria-label") || "", el.getAttribute("title") || ""].join(" "));
  });
}

async function open(context: BrowserContext, url: string, metrika: Set<string>): Promise<Page> {
  const page = await context.newPage();
  page.on("request", (req) => {
    if (METRIKA_RE.test(req.url())) metrika.add(req.url());
  });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2500);
  return page;
}

async function scrollAndCheck<T>(page: Page, fn: () => T): Promise<T> {
  await page.evaluate(() => window.scrollTo(0, Math.min(1500, document.documentElement.scrollHeight / 2)));
  await page.waitForTimeout(900);
  return page.evaluate(fn);
}

function counterId(urls: Set<string>): string | null {
  for (const u of urls) {
    const m = u.match(/\/watch\/(\d+)/);
    if (m) return m[1];
  }
  return null;
}

export type AutoAuditResult = { url: string; inputs: AuditInput[] };

export async function runAutoAudit(domain: string): Promise<AutoAuditResult> {
  const { chromium } = await import("playwright");
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });

    const desktopCtx = await browser.newContext({ viewport: { width: 1366, height: 800 }, userAgent: DESKTOP_UA, locale: "ru-RU" });
    const mainMetrika = new Set<string>();
    let page: Page;
    try {
      page = await open(desktopCtx, `https://${domain}/`, mainMetrika);
    } catch (err) {
      throw new Error(`Сайт не открылся: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
    }
    const url = page.url();
    const d = await page.evaluate(probeDesktop);
    const desktopSticky = await scrollAndCheck(page, probeSticky);
    const desktopUp = await page.evaluate(probeUpButton);

    const pages: { url: string; ok: boolean }[] = [];
    if (mainMetrika.size) {
      for (const link of d.links.slice(0, EXTRA_PAGES)) {
        const seen = new Set<string>();
        try {
          const p = await open(desktopCtx, link, seen);
          await p.close();
          pages.push({ url: link, ok: seen.size > 0 });
        } catch {
          /* страница не открылась — не считаем */
        }
      }
    }
    await desktopCtx.close();

    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: MOBILE_UA,
      locale: "ru-RU",
    });
    const mPage = await open(mobileCtx, url, new Set());
    const m = await mPage.evaluate(probeMobile);
    const mobileSticky = await scrollAndCheck(mPage, probeSticky);
    const mobileUp = await mPage.evaluate(probeUpButton);
    await mobileCtx.close();

    const r = (itemNo: number, value: "1" | "0" | null, comment: string): AuditInput => ({ itemNo, value, comment });
    const id = counterId(mainMetrika);
    const missing = pages.filter((p) => !p.ok).map((p) => new URL(p.url).pathname);
    const adaptive = /width\s*=\s*device-width/i.test(m.viewport) && m.overflow <= 5;

    const inputs: AuditInput[] = [
      d.logo ? r(1, "1", "") : r(1, null, "Не нашёл по признакам, проверьте"),
      d.logo ? r(2, d.logoLink ? "1" : "0", d.logoLink ? "" : "Логотип не ссылка на главную") : r(2, null, ""),
      r(4, d.phoneInHeader ? "1" : "0", d.phoneInHeader ? "" : "В верхней части страницы телефона нет"),
      r(6, desktopSticky ? "1" : "0", ""),
      d.ctaText ? r(10, "1", `Кнопка «${d.ctaText}»`) : r(10, null, "На первом экране кнопку не нашёл, проверьте"),
      d.forms
        ? r(18, d.maxRequired <= 3 ? "1" : "0", `Обязательных полей по разметке, без галочек согласия: до ${d.maxRequired}`)
        : r(18, null, "Формы на главной нет"),
      d.telInputs ? r(19, d.mask ? "1" : "0", d.mask ? "" : "Маски на поле телефона не нашёл") : r(19, null, "Поля телефона на главной нет"),
      r(20, d.reviews ? "1" : "0", d.reviews ? "" : "На главной нет отзывов и ссылки на них"),
      d.certs ? r(21, "1", "") : r(21, null, "Слов «сертификат», «лицензия» на главной нет, проверьте"),
      r(
        24,
        adaptive ? "1" : "0",
        adaptive ? "" : !m.viewport ? "Нет meta viewport" : m.overflow > 5 ? `На телефоне страница шире экрана на ${m.overflow}px` : "meta viewport без width=device-width"
      ),
      m.burger ? r(25, "1", "") : r(25, null, "Кнопку меню не нашёл, проверьте"),
      mobileUp ? r(27, "1", "") : desktopUp ? r(27, "1", "Есть на компьютере, на телефоне не нашёл") : r(27, null, "Не нашёл, проверьте"),
      r(28, d.telLinks ? "1" : "0", d.telLinks ? "" : "Нет ссылок tel:"),
      r(29, d.social.length ? "1" : "0", d.social.slice(0, 5).join(", ")),
      r(30, mobileSticky ? "1" : "0", ""),
      r(31, mainMetrika.size ? "1" : "0", id ? `Счётчик ${id}` : mainMetrika.size ? "" : "Запросов к Метрике на главной нет"),
      !mainMetrika.size
        ? r(32, "0", "Счётчика нет")
        : pages.length === 0
          ? r(32, null, "Других страниц не нашёл, проверьте")
          : r(32, missing.length ? "0" : "1", missing.length ? `Нет на: ${missing.join(", ")}` : `Проверено страниц: ${pages.length + 1}`),
    ];
    return { url, inputs };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
