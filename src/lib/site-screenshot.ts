/**
 * Скриншот above-the-fold через Playwright.
 *
 * Файлы: public/uploads/lead-screenshots/
 * Публичный URL: /uploads/lead-screenshots/...
 *
 * Важно: nginx root = корень проекта (не public/), а Next кэширует
 * список public/ при старте. Поэтому держим symlink uploads → public/uploads,
 * чтобы jpg сразу отдавались nginx без рестарта Next (иначе TG 404).
 */
import "server-only";
import { mkdir, writeFile, lstat, symlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export type ScreenshotResult = {
  ok: boolean;
  path?: string;
  url?: string;
  error?: string;
};

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "lead-screenshots");
const PUBLIC_PREFIX = "/uploads/lead-screenshots";

/** Nginx try_files ищет $root/uploads/..., не public/uploads/... */
async function ensureUploadsSymlinkForNginx(): Promise<void> {
  const linkPath = join(process.cwd(), "uploads");
  try {
    const st = await lstat(linkPath);
    if (st.isSymbolicLink() || st.isDirectory()) return;
  } catch {
    /* нет — создаём */
  }
  try {
    await symlink("public/uploads", linkPath);
  } catch {
    /* гонка / нет прав — не валим скриншот */
  }
}

export async function captureSiteScreenshot(params: {
  pageUrl: string;
  siteId?: string;
}): Promise<ScreenshotResult> {
  let browser: import("playwright").Browser | null = null;
  try {
    const { chromium } = await import("playwright");
    await mkdir(UPLOAD_DIR, { recursive: true });
    await ensureUploadsSymlinkForNginx();

    const id = (params.siteId || randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || randomUUID();
    const filename = `${id}-${Date.now()}.jpg`;
    const filePath = join(UPLOAD_DIR, filename);
    const publicUrl = `${PUBLIC_PREFIX}/${filename}`;

    const target = params.pageUrl.startsWith("http")
      ? params.pageUrl
      : `https://${params.pageUrl}`;

    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      userAgent:
        "Mozilla/5.0 (compatible; KonversusLeadRadar/1.0; +https://konversus.ru)",
    });

    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 25_000 });
    // дать дорисовать баннеры/шрифты
    await page.waitForTimeout(1200);

    const buf = await page.screenshot({
      type: "jpeg",
      quality: 72,
      fullPage: false,
    });
    await writeFile(filePath, buf);

    return { ok: true, path: filePath, url: publicUrl };
  } catch (err: any) {
    return { ok: false, error: err?.message || "screenshot failed" };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
  }
}
