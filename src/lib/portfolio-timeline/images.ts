import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { PortfolioInputError, cleanupOrphanMedia, insertUploadedMedia } from "./queries";

const UPLOAD_ROOT = path.join(process.cwd(), "sales-doc", "uploads");
const ORIGINALS_ROOT = path.join(process.cwd(), "sales-doc", "portfolio-originals");
const MAX_BYTES = 30 * 1024 * 1024;
const MAX_PIXELS = 120_000_000;
const WEBP_MAX = 16383;
const JPEG_MAX = 65000;
const PREVIEW_WIDTH = 1920;
const LIGHTBOX_WIDTH = 3840;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_FORMAT = new Set(["jpeg", "png", "webp"]);

function publicUrl(year: string, month: string, filename: string) {
  return `/sales-doc/uploads/${year}/${month}/${filename}`;
}

function fitToWidth(srcW: number, srcH: number, maxWidth: number) {
  let width = Math.min(srcW, maxWidth);
  let height = Math.max(1, Math.round((srcH * width) / srcW));
  let format: "webp" | "jpeg" = "webp";
  if (width > WEBP_MAX || height > WEBP_MAX) {
    format = "jpeg";
    if (height > JPEG_MAX) {
      width = Math.max(1, Math.round((width * JPEG_MAX) / height));
      height = JPEG_MAX;
    }
  }
  return { width, height, format };
}

async function writeWidthVariant(buffer: Buffer, maxWidth: number, filePath: string, quality: number) {
  const meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).rotate().metadata();
  const fitted = fitToWidth(meta.width || maxWidth, meta.height || maxWidth, maxWidth);
  const pipeline = sharp(buffer, { limitInputPixels: MAX_PIXELS })
    .rotate()
    .resize(fitted.width, fitted.height, { fit: "fill", withoutEnlargement: true });
  const output =
    fitted.format === "jpeg"
      ? await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer()
      : await pipeline.webp({ quality }).toBuffer();
  const ext = fitted.format === "jpeg" ? "jpg" : "webp";
  const finalPath = filePath.replace(/\.webp$/, `.${ext}`);
  await writeFile(finalPath, output);
  return path.basename(finalPath);
}

async function writeThumb(buffer: Buffer, filePath: string) {
  const output = await sharp(buffer, { limitInputPixels: MAX_PIXELS })
    .rotate()
    .resize(480, 480, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  await writeFile(filePath, output);
}

export async function storePortfolioImage(file: File) {
  await cleanupOrphanMedia();

  if (!ALLOWED_MIME.has(file.type)) {
    throw new PortfolioInputError("Нужен JPG, PNG или WebP");
  }
  if (file.size > MAX_BYTES) {
    throw new PortfolioInputError("Файл больше 30 МБ");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) throw new PortfolioInputError("Файл больше 30 МБ");

  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(buffer).rotate().metadata();
    if (!meta.format || !ALLOWED_FORMAT.has(meta.format) || !meta.width || !meta.height) {
      throw new PortfolioInputError("Файл не является изображением");
    }
    width = meta.width;
    height = meta.height;
    if (width * height > MAX_PIXELS) {
      throw new PortfolioInputError("Слишком длинное изображение");
    }
  } catch (error) {
    if (error instanceof PortfolioInputError) throw error;
    throw new PortfolioInputError("Не удалось прочитать изображение");
  }

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const stamp = randomBytes(12).toString("hex");
  const publicDir = path.join(UPLOAD_ROOT, year, month);
  const originalDir = path.join(ORIGINALS_ROOT, year, month);
  await mkdir(publicDir, { recursive: true });
  await mkdir(originalDir, { recursive: true });

  const thumbName = `${stamp}-thumb.webp`;
  const originalName = `${stamp}-orig`;
  const originalExt = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const originalRelative = path.join(year, month, `${originalName}.${originalExt}`);
  const created = [path.join(ORIGINALS_ROOT, originalRelative), path.join(publicDir, thumbName)];

  try {
    await writeFile(created[0], buffer);
    const previewFile = await writeWidthVariant(buffer, PREVIEW_WIDTH, path.join(publicDir, `${stamp}-preview.webp`), 86);
    created.push(path.join(publicDir, previewFile));
    const lightboxFile = await writeWidthVariant(buffer, LIGHTBOX_WIDTH, path.join(publicDir, `${stamp}-lightbox.webp`), 90);
    created.push(path.join(publicDir, lightboxFile));
    await writeThumb(buffer, created[1]);

    return await insertUploadedMedia({
      url: publicUrl(year, month, previewFile),
      lightboxUrl: publicUrl(year, month, lightboxFile),
      thumbUrl: publicUrl(year, month, thumbName),
      originalPath: originalRelative.split(path.sep).join("/"),
      width,
      height,
    });
  } catch (error) {
    await Promise.allSettled(created.map((filePath) => unlink(filePath)));
    throw error;
  }
}
