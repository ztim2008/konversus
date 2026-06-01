import { NextRequest, NextResponse } from "next/server";

import { listProposals } from "@/lib/data/proposals";
import { getShareLinksForProposals, getSharePath } from "@/lib/data/share-links";
import type { ProposalBlock, ProposalBlockPayload } from "@/types/domain";

const PAGE_SIZE = 12;

function extractCoverImage(structure: ProposalBlock[]): string | null {
  for (const block of structure) {
    const p = block.payload as ProposalBlockPayload | undefined;
    if (!p) continue;
    if (p.backgroundImageUrl) return p.backgroundImageUrl;
    if (p.photoUrl) return p.photoUrl;
    if (Array.isArray(p.photos) && p.photos.length > 0) return p.photos[0]?.url ?? null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? 0));

  const proposals = await listProposals();
  const shareMap = await getShareLinksForProposals(proposals.map((p) => p.id));

  const visible = proposals.filter((p) => {
    const sl = shareMap[p.id];
    return sl && sl.status === "active";
  });

  const total = visible.length;
  const slice = visible.slice(offset, offset + PAGE_SIZE);

  const items = slice.map((p) => ({
    id: p.id,
    title: p.title,
    headline: p.headline ?? null,
    cover: extractCoverImage(p.structure as ProposalBlock[]),
    href: getSharePath(shareMap[p.id]),
  }));

  return NextResponse.json({ items, total, offset, hasMore: offset + PAGE_SIZE < total });
}
