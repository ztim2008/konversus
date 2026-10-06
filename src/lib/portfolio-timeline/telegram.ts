import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { getAllSettings } from "@/lib/data/settings";

import { claimTelegramAnnounce, releaseTelegramAnnounce } from "./queries";
import type { PortfolioEntry } from "./types";

const GROUP_CHAT_ID = "@avito_dizain";
const SITE = "https://konversus.ru/portfolio/timeline";
const ALBUM_LIMIT = 10;
const CAPTION_LIMIT = 1024;

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function htmlToPlain(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function captionFor(entry: PortfolioEntry) {
  const title = `<b>${escapeHtml(entry.title)}</b>`;
  const link = `${SITE}#${entry.id}`;
  const plain = entry.description ? htmlToPlain(entry.description) : "";
  const extra = entry.media.length > ALBUM_LIMIT ? `Ещё ${entry.media.length - ALBUM_LIMIT} фото на сайте.` : "";
  const overhead = title.length + link.length + extra.length + 4;
  let body = plain ? escapeHtml(plain) : "";
  if (body && overhead + body.length > CAPTION_LIMIT) {
    body = `${body.slice(0, Math.max(0, CAPTION_LIMIT - overhead - 1)).trimEnd()}…`;
  }
  return [title, body, extra.trim(), link].filter(Boolean).join("\n\n");
}

function uploadAbsolute(publicPath: string) {
  const prefix = "/sales-doc/uploads/";
  if (!publicPath.startsWith(prefix) || publicPath.includes("..")) return null;
  const relative = publicPath.slice(prefix.length);
  const root = path.resolve(process.cwd(), "sales-doc", "uploads");
  const full = path.resolve(root, relative);
  if (full !== root && !full.startsWith(`${root}${path.sep}`)) return null;
  return full;
}

async function jpegFor(publicPath: string) {
  const filePath = uploadAbsolute(publicPath);
  if (!filePath) return null;
  try {
    const source = await readFile(filePath);
    return await sharp(source).rotate().jpeg({ quality: 82 }).toBuffer();
  } catch (error) {
    console.error("portfolio telegram image", error instanceof Error ? error.message : "read");
    return null;
  }
}

function humanError(description: string) {
  const text = description.toLowerCase();
  if (text.includes("chat not found")) return "Бот не видит группу @avito_dizain";
  if (text.includes("not enough rights") || text.includes("have no rights")) return "У бота нет права писать в группу";
  if (text.includes("kicked") || text.includes("not a member") || text.includes("bot was blocked")) {
    return "Бот из настроек сайта не состоит в @avito_dizain";
  }
  return "Telegram не принял пост";
}

async function telegramPost(token: string, method: string, body: BodyInit, timeoutMs: number, json = false) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: json ? { "Content-Type": "application/json" } : undefined,
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
  if (!response.ok || !data?.ok) {
    const description = data?.description || `HTTP ${response.status}`;
    console.error("portfolio telegram", method, description);
    return { ok: false as const, error: humanError(description) };
  }
  return { ok: true as const };
}

async function sendAlbum(token: string, entry: PortfolioEntry) {
  const files: Buffer[] = [];
  for (const item of entry.media.slice(0, ALBUM_LIMIT)) {
    const jpeg = await jpegFor(item.url);
    if (jpeg) files.push(jpeg);
  }

  const caption = captionFor(entry);
  if (files.length === 0) {
    return telegramPost(
      token,
      "sendMessage",
      JSON.stringify({
        chat_id: GROUP_CHAT_ID,
        text: caption,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
      20_000,
      true,
    );
  }

  if (files.length === 1) {
    const form = new FormData();
    form.append("chat_id", GROUP_CHAT_ID);
    form.append("caption", caption);
    form.append("parse_mode", "HTML");
    form.append("photo", new Blob([new Uint8Array(files[0])], { type: "image/jpeg" }), "photo.jpg");
    return telegramPost(token, "sendPhoto", form, 30_000);
  }

  const form = new FormData();
  form.append("chat_id", GROUP_CHAT_ID);
  form.append(
    "media",
    JSON.stringify(
      files.map((_, index) => ({
        type: "photo",
        media: `attach://file${index}`,
        ...(index === 0 ? { caption, parse_mode: "HTML" } : {}),
      })),
    ),
  );
  files.forEach((file, index) => {
    form.append(`file${index}`, new Blob([new Uint8Array(file)], { type: "image/jpeg" }), `photo${index}.jpg`);
  });
  return telegramPost(token, "sendMediaGroup", form, 60_000);
}

/** Публикация уходит в @avito_dizain один раз. Черновик и правка уже отправленной работы молчат. */
export async function notifyGroupOnPublish(entry: PortfolioEntry) {
  if (!entry.published) return null;

  const settings = await getAllSettings();
  const token = settings.telegram_bot_token?.trim();
  if (!token) return { ok: false as const, error: "Бот не настроен" };

  const claimed = await claimTelegramAnnounce(entry.id);
  if (!claimed) return null;

  try {
    const result = await sendAlbum(token, entry);
    if (!result.ok) await releaseTelegramAnnounce(entry.id);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    console.error("portfolio telegram", message.replace(/bot\d+:[A-Za-z0-9_-]+/g, "bot***"));
    await releaseTelegramAnnounce(entry.id);
    return { ok: false as const, error: "Telegram не принял пост" };
  }
}
