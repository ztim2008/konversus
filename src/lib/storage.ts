import "server-only";

import { unlink } from "node:fs/promises";
import path from "node:path";

import type { ProposalBlock, ProposalBlockPayload } from "@/types/domain";

const UPLOAD_URL_PREFIX = "/sales-doc/uploads/";
const UPLOAD_ROOT = path.join(process.cwd(), "sales-doc", "uploads");

/**
 * Собирает все URL загруженных файлов из структуры блоков proposal.
 * Возвращает только пути вида /sales-doc/uploads/...
 */
export function extractUploadUrls(structure: ProposalBlock[]): string[] {
  const urls = new Set<string>();

  function add(url: string | null | undefined) {
    if (url && url.startsWith(UPLOAD_URL_PREFIX)) urls.add(url);
  }

  for (const block of structure) {
    const p = block.payload as ProposalBlockPayload | undefined;
    if (!p) continue;

    add(p.backgroundImageUrl);
    add(p.photoUrl);
    add(p.videoUrl);
    add(p.videoPoster);

    if (Array.isArray(p.photos)) {
      for (const photo of p.photos) add(photo?.url);
    }
  }

  return [...urls];
}

/**
 * Удаляет файлы с диска по URL-путям вида /sales-doc/uploads/...
 * Молча пропускает несуществующие файлы.
 */
export async function deleteUploadedFiles(urls: string[]): Promise<void> {
  await Promise.allSettled(
    urls
      .filter((u) => u.startsWith(UPLOAD_URL_PREFIX))
      .map((url) => {
        const relative = url.slice(UPLOAD_URL_PREFIX.length); // "2026/05/abc.jpg"
        const fullPath = path.join(UPLOAD_ROOT, relative);
        // Защита от path traversal
        if (!fullPath.startsWith(UPLOAD_ROOT + path.sep) && fullPath !== UPLOAD_ROOT) {
          return Promise.resolve();
        }
        return unlink(fullPath);
      }),
  );
}
