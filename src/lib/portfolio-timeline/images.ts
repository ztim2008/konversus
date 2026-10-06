import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { PortfolioInputError, cleanupOrphanMedia, insertUploadedMedia } from "./queries";

const UPLOAD_ROOT = path.join(process.cwd(), "sales-doc", "uploads");
const ORIGINALS_ROOT = path.join(process.cwd(), "sales-doc", "portfolio-originals");
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_FORMAT = new Set(["jpeg", "png", "webp"]);

function publicUrl(year: string, month: string, filename: string) {
  return `/sales-doc/uploads/${year}/${month}/${filename}`;
}

async function writeVariant(buffer: Buffer, maxEdge: number, filePath: string) {
  const output = await sharp(buffer)
    .rotate()
    .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  await writeFile(filePath, output);
}

export async function storePortfolioImage(file: File) {
  await cleanupOrphanMedia();

  if (!ALLOWED_MIME.has(file.type)) {
    throw new PortfolioInputError("Нужен JPG, PNG или WebP");
  }
  if (file.size > MAX_BYTES) {
    throw new PortfolioInputError("Файл больше 15 МБ");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) throw new PortfolioInputError("Файл больше 15 МБ");

  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(buffer).rotate().metadata();
    if (!meta.format || !ALLOWED_FORMAT.has(meta.format) || !meta.width || !meta.height) {
      throw new PortfolioInputError("Файл не является изображением");
    }
    width = meta.width;
    height = meta.height;
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

  const previewName = `${stamp}-preview.webp`;
  const lightboxName = `${stamp}-lightbox.webp`;
  const thumbName = `${stamp}-thumb.webp`;
  const originalName = `${stamp}-orig`;
  const originalExt = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const originalRelative = path.join(year, month, `${originalName}.${originalExt}`);
  const written = [
    path.join(publicDir, previewName),
    path.join(publicDir, lightboxName),
    path.join(publicDir, thumbName),
    path.join(ORIGINALS_ROOT, originalRelative),
  ];

  try {
    await writeFile(written[3], buffer);
    await writeVariant(buffer, 1600, written[0]);
    await writeVariant(buffer, 2400, written[1]);
    await writeVariant(buffer, 480, written[2]);

    return await insertUploadedMedia({
      url: publicUrl(year, month, previewName),
      lightboxUrl: publicUrl(year, month, lightboxName),
      thumbUrl: publicUrl(year, month, thumbName),
      originalPath: originalRelative.split(path.sep).join("/"),
      width,
      height,
    });
  } catch (error) {
    await Promise.allSettled(written.map((filePath) => unlink(filePath)));
    throw error;
  }
}
