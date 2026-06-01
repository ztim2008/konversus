import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { Dirent } from "node:fs";

import { NextResponse } from "next/server";

type MediaKind = "image" | "video";

type MediaItem = {
  id: string;
  kind: MediaKind;
  name: string;
  url: string;
  createdAt: number;
};

const mediaRoot = path.join(process.cwd(), "sales-doc", "uploads");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const videoExtensions = new Set([".mp4", ".webm", ".mov", ".m4v"]);

async function collectMediaFiles(dir: string, publicPrefix: string): Promise<MediaItem[]> {
  let entries: Dirent[] = [];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(dir, entry.name);
    const publicPath = `${publicPrefix}/${entry.name}`;

    if (entry.isDirectory()) {
      return collectMediaFiles(absolutePath, publicPath);
    }

    if (!entry.isFile()) return [];

    const extension = path.extname(entry.name).toLowerCase();
    let kind: MediaKind | null = null;
    if (imageExtensions.has(extension)) kind = "image";
    if (videoExtensions.has(extension)) kind = "video";
    if (!kind) return [];

    const fileStat = await stat(absolutePath);
    return [{
      id: publicPath,
      kind,
      name: entry.name,
      url: publicPath,
      createdAt: fileStat.mtimeMs,
    }];
  }));

  return items.flat();
}

export async function GET() {
  const items = await collectMediaFiles(mediaRoot, "/sales-doc/uploads");

  return NextResponse.json({
    items: items
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 80),
  });
}