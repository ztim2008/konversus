import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/auth/session";
import { getCompany } from "@/lib/data/companies";
import { getProposal } from "@/lib/data/proposals";
import { getShareLinkForProposal, getSharePath } from "@/lib/data/share-links";
import { normalizeProposalBlocks } from "@/lib/proposal-builder";

export async function GET(
  request: Request,
  context: { params: Promise<{ proposalId: string }> }
) {
  try {
    // В API Route Handler используем getCurrentAdmin() без redirect(),
    // иначе NEXT_REDIRECT перехватывается catch и возвращает 500 вместо редиректа.
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proposalId } = await context.params;
    const proposal = await getProposal(proposalId);

    if (!proposal) {
      return NextResponse.json({ error: "Концепт не найден" }, { status: 404 });
    }

    const company = await getCompany(proposal.companyId);
    if (!company) {
      return NextResponse.json({ error: "Компания не найдена" }, { status: 404 });
    }

    const shareLink = await getShareLinkForProposal(proposal.id);
    const shareUrl = shareLink ? getSharePath(shareLink) : null;
    const shareActive = shareLink?.status === "active";

    const blocks = normalizeProposalBlocks(proposal.structure);

    return NextResponse.json({
      proposalId,
      proposal,
      company,
      blocks,
      shareUrl,
      shareActive,
      isLoading: false,
      error: null,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

