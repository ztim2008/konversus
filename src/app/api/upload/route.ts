import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { requireCurrentAdmin } from "@/lib/auth/session";

const UPLOAD_ROOT = path.join(process.cwd(), "sales-doc", "uploads");
const MAX_PX = 2000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;   // 8 МБ
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 МБ
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]);
const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "video/x-msvideo": "avi",
};

export async function POST(request: Request) {
  try {
    await requireCurrentAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Поле image обязательно" }, { status: 400 });
  }

  const isVideo = ALLOWED_VIDEO_MIME.has(file.type);
  const isImage = ALLOWED_IMAGE_MIME.has(file.type);

  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Только JPG, PNG, WebP, GIF или MP4/WebM/MOV" }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (buffer.byteLength > maxBytes) {
    return NextResponse.json({ error: `Файл слишком большой (максимум ${isVideo ? "200" : "8"} МБ)` }, { status: 413 });
  }

  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const dir = path.join(UPLOAD_ROOT, year, month);
  await mkdir(dir, { recursive: true });

  if (isVideo) {
    const ext = VIDEO_EXT[file.type] ?? "mp4";
    const filename = `${randomBytes(12).toString("hex")}.${ext}`;
    const filePath = path.join(dir, filename);
    await writeFile(filePath, buffer);
    const url = `/sales-doc/uploads/${year}/${month}/${filename}`;
    return NextResponse.json({ url, kind: "video" });
  }

  // Ресайз через sharp если шире/выше MAX_PX
  let processed: Buffer;
  try {
    processed = await sharp(buffer)
      .resize(MAX_PX, MAX_PX, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "Не удалось обработать изображение" }, { status: 422 });
  }

  const filename = `${randomBytes(12).toString("hex")}.jpg`;
  const filePath = path.join(dir, filename);
  await writeFile(filePath, processed);

  const url = `/sales-doc/uploads/${year}/${month}/${filename}`;
  return NextResponse.json({ url, kind: "image" });
}
