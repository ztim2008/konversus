"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentAdmin } from "@/lib/auth/session";
import { getCompany } from "@/lib/data/companies";
import { deleteProposal, getProposal, updateProposal } from "@/lib/data/proposals";
import { getSharePath, publishShareLink } from "@/lib/data/share-links";
import {
  createProposalBlock,
  proposalBlockTemplates,
} from "@/lib/proposal-builder";
import { getProposalPalette } from "@/lib/proposal-palettes";
import {
  proposalStatuses,
  type ContactItem,
  type CommercialCard,
  type GalleryPhoto,
  type ProposalMetric,
  type ProposalStatus,
  type TimelineStep,
} from "@/types/domain";

function buildRedirect(path: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();

  return query ? `${path}?${query}` : path;
}

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getPanelValue(formData: FormData) {
  const panel = getStringValue(formData, "panel");
  return panel || undefined;
}

function getSidebarValue(formData: FormData) {
  const sidebar = getStringValue(formData, "sidebar");
  return sidebar || undefined;
}

function parseLineList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseMetrics(value: string): ProposalMetric[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(":");
      return {
        label: label?.trim() ?? "",
        value: rest.join(":").trim(),
      };
    })
    .filter((metric) => metric.label && metric.value);
}

// Формат: index | title | body
function parseTimelineSteps(value: string): TimelineStep[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        index: parts[0] ?? "",
        title: parts[1] ?? "",
        body: parts[2] || undefined,
      };
    })
    .filter((s) => s.index || s.title);
}

// Формат: label | price | meta | featured
function parseCommercialCards(value: string): CommercialCard[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        label: parts[0] ?? "",
        price: parts[1] || undefined,
        meta: parts[2] || undefined,
        featured: parts[3]?.toLowerCase() === "featured" || parts[3]?.toLowerCase() === "да",
      };
    })
    .filter((c) => c.label);
}

// Формат: label | value | href
function parseContacts(value: string): ContactItem[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        label: parts[0] ?? "",
        value: parts[1] ?? "",
        href: parts[2] || undefined,
      };
    })
    .filter((c) => c.label && c.value);
}

// Формат: url | meta | caption
function parsePhotos(value: string): GalleryPhoto[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        url: parts[0] || undefined,
        meta: parts[1] || undefined,
        caption: parts[2] || undefined,
      };
    })
    .filter((p) => p.url);
}

function getEditorPath(proposalId: string) {
  return `/dashboard/proposals/${proposalId}`;
}

export async function updateProposalMetaAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const title = getStringValue(formData, "title");
  const headline = getStringValue(formData, "headline");
  const subheadline = getStringValue(formData, "subheadline");
  const ctaLabel = getStringValue(formData, "ctaLabel");
  const status = getStringValue(formData, "status");
  const panel = getPanelValue(formData);
  const sidebar = getSidebarValue(formData);

  if (!proposalId || !title) {
    redirect(buildRedirect("/dashboard", { error: "Не удалось обновить метаданные концепта." }));
  }

  if (!proposalStatuses.includes(status as ProposalStatus)) {
    redirect(buildRedirect(getEditorPath(proposalId), { error: "Указан неизвестный статус концепта.", panel, sidebar }));
  }

  await updateProposal(proposalId, {
    title,
    headline: headline || null,
    subheadline: subheadline || null,
    ctaLabel: ctaLabel || null,
    status: status as ProposalStatus,
  });

  revalidatePath("/dashboard");
  revalidatePath(getEditorPath(proposalId));
  redirect(buildRedirect(getEditorPath(proposalId), { message: "Метаданные концепта сохранены.", panel, sidebar }));
}

export async function addProposalBlockAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const blockType = getStringValue(formData, "blockType");
  const insertAfterIndexRaw = getStringValue(formData, "insertAfterIndex");
  const panel = getPanelValue(formData);
  const sidebar = getSidebarValue(formData);
  const proposal = await getProposal(proposalId);

  if (!proposalId || !proposal) {
    redirect(buildRedirect("/dashboard", { error: "Концепт не найден." }));
  }

  if (!proposalBlockTemplates.some((template) => template.type === blockType)) {
    redirect(buildRedirect(getEditorPath(proposalId), { error: "Неизвестный тип блока.", panel, sidebar }));
  }

  const nextBlock = createProposalBlock(blockType as typeof proposalBlockTemplates[number]["type"]);
  const insertAfterIndex = insertAfterIndexRaw ? Number.parseInt(insertAfterIndexRaw, 10) : Number.NaN;
  const shouldInsertByIndex = Number.isInteger(insertAfterIndex);
  const structure = [...proposal.structure];

  if (shouldInsertByIndex) {
    const targetIndex = Math.min(Math.max(insertAfterIndex + 1, 0), structure.length);
    structure.splice(targetIndex, 0, nextBlock);
  } else {
    structure.push(nextBlock);
  }

  await updateProposal(proposalId, {
    status: proposal.status === "draft" ? "sent" : proposal.status,
    structure,
  });

  revalidatePath(getEditorPath(proposalId));
  redirect(buildRedirect(getEditorPath(proposalId), {
    message: "Блок добавлен в структуру концепта.",
    block: nextBlock.id,
    panel: panel ?? "block",
    sidebar,
  }));
}

export async function updateProposalBlockAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const blockId = getStringValue(formData, "blockId");
  const title = getStringValue(formData, "title");
  const eyebrow = getStringValue(formData, "eyebrow");
  const headline = getStringValue(formData, "headline");
  const body = getStringValue(formData, "body");
  const bullets = parseLineList(getStringValue(formData, "bullets"));
  const metrics = parseMetrics(getStringValue(formData, "metrics"));
  const ctaLabel = getStringValue(formData, "ctaLabel");
  const ctaHref = getStringValue(formData, "ctaHref");
  const ctaLabelSecondary = getStringValue(formData, "ctaLabelSecondary");
  const ctaHrefSecondary = getStringValue(formData, "ctaHrefSecondary");
  const visible = formData.get("visible") === "on";

  // Цвета
  const backgroundColor = getStringValue(formData, "backgroundColor") || undefined;
  const textColor = getStringValue(formData, "textColor") || undefined;

  // Медиа
  const videoUrl = getStringValue(formData, "videoUrl") || undefined;
  const videoPoster = getStringValue(formData, "videoPoster") || undefined;
  const photoUrl = getStringValue(formData, "photoUrl") || undefined;
  const backgroundImageUrl = getStringValue(formData, "backgroundImageUrl") || undefined;

  // Hero
  const heroVariantRaw = getStringValue(formData, "heroVariant");
  const heroVariant = (["image-split", "color-photo-right", "color-photo-left"].includes(heroVariantRaw) ? heroVariantRaw : undefined) as "image-split" | "color-photo-right" | "color-photo-left" | undefined;
  const overlayOpacityRaw = getStringValue(formData, "overlayOpacity");
  const overlayOpacity = overlayOpacityRaw ? Math.min(92, Math.max(0, parseInt(overlayOpacityRaw, 10))) : undefined;
  const headlineDesktopSizeRaw = getStringValue(formData, "headlineDesktopSize");
  const headlineDesktopSize = headlineDesktopSizeRaw ? parseInt(headlineDesktopSizeRaw, 10) : undefined;
  const headlineMobileSizeRaw = getStringValue(formData, "headlineMobileSize");
  const headlineMobileSize = headlineMobileSizeRaw ? parseInt(headlineMobileSizeRaw, 10) : undefined;

  // Section Heading
  const headingAlignRaw = getStringValue(formData, "headingAlign");
  const headingAlign = (["left", "center", "right"].includes(headingAlignRaw) ? headingAlignRaw : undefined) as "left" | "center" | "right" | undefined;
  const subheadlineDesktopSizeRaw = getStringValue(formData, "subheadlineDesktopSize");
  const subheadlineDesktopSize = subheadlineDesktopSizeRaw ? parseInt(subheadlineDesktopSizeRaw, 10) : undefined;
  const subheadlineMobileSizeRaw = getStringValue(formData, "subheadlineMobileSize");
  const subheadlineMobileSize = subheadlineMobileSizeRaw ? parseInt(subheadlineMobileSizeRaw, 10) : undefined;
  const captionDesktopSizeRaw = getStringValue(formData, "captionDesktopSize");
  const captionDesktopSize = captionDesktopSizeRaw ? parseInt(captionDesktopSizeRaw, 10) : undefined;
  const captionMobileSizeRaw = getStringValue(formData, "captionMobileSize");
  const captionMobileSize = captionMobileSizeRaw ? parseInt(captionMobileSizeRaw, 10) : undefined;

  // Before/After
  const beforeTitle = getStringValue(formData, "beforeTitle") || undefined;
  const afterTitle = getStringValue(formData, "afterTitle") || undefined;
  const beforeItems = parseLineList(getStringValue(formData, "beforeItems"));
  const afterItems = parseLineList(getStringValue(formData, "afterItems"));

  // Массивы
  const timelineStepsRaw = getStringValue(formData, "timelineSteps");
  const timelineSteps = timelineStepsRaw ? parseTimelineSteps(timelineStepsRaw) : undefined;
  const commercialCardsRaw = getStringValue(formData, "commercialCards");
  const commercialCards = commercialCardsRaw ? parseCommercialCards(commercialCardsRaw) : undefined;
  const contactsRaw = getStringValue(formData, "contacts");
  const contacts = contactsRaw ? parseContacts(contactsRaw) : undefined;
  const photosRaw = getStringValue(formData, "photos");
  const photos = photosRaw ? parsePhotos(photosRaw) : undefined;

  const customHtml = getStringValue(formData, "customHtml") || undefined;
  const richTextHtml = getStringValue(formData, "richTextHtml") || undefined;

  // doc-agency-pitch
  const agencyName = getStringValue(formData, "agencyName") || undefined;
  const pitchSectionsRaw = getStringValue(formData, "pitchSections");
  const pitchSections = pitchSectionsRaw ? JSON.parse(pitchSectionsRaw) as string[] : undefined;
  const pitchStatsRaw = getStringValue(formData, "pitchStats");
  const pitchStats = pitchStatsRaw ? JSON.parse(pitchStatsRaw) : undefined;
  const pitchItemsRaw = getStringValue(formData, "pitchItems");
  const pitchItems = pitchItemsRaw ? JSON.parse(pitchItemsRaw) : undefined;
  const pitchBulletsRaw = getStringValue(formData, "pitchBullets");
  const pitchBullets = pitchBulletsRaw ? JSON.parse(pitchBulletsRaw) : undefined;
  const faqItemsRaw = getStringValue(formData, "faqItems");
  const faqItems = faqItemsRaw ? JSON.parse(faqItemsRaw) : undefined;
  const pitchCtaUrl = getStringValue(formData, "pitchCtaUrl") || undefined;
  const pitchCtaContact = getStringValue(formData, "pitchCtaContact") || undefined;
  const pitchBrandColor = getStringValue(formData, "pitchBrandColor") || undefined;

  const panel = getPanelValue(formData);
  const sidebar = getSidebarValue(formData);

  const proposal = await getProposal(proposalId);

  if (!proposal) {
    redirect(buildRedirect("/dashboard", { error: "Концепт не найден." }));
  }

  const structure = proposal.structure.map((block) => {
    if (block.id !== blockId) {
      return block;
    }

    return {
      ...block,
      title,
      visible,
      payload: {
        ...block.payload,
        eyebrow,
        headline,
        body,
        bullets,
        metrics,
        ctaLabel,
        ctaHref,
        ...(ctaLabelSecondary !== undefined && { ctaLabelSecondary: ctaLabelSecondary || undefined }),
        ...(ctaHrefSecondary !== undefined && { ctaHrefSecondary: ctaHrefSecondary || undefined }),
        backgroundColor,
        textColor,
        ...(videoUrl !== undefined && { videoUrl }),
        ...(videoPoster !== undefined && { videoPoster }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(backgroundImageUrl !== undefined && { backgroundImageUrl }),
        ...(heroVariant !== undefined && { heroVariant }),
        ...(overlayOpacity !== undefined && { overlayOpacity }),
        ...(headlineDesktopSize !== undefined && { headlineDesktopSize }),
        ...(headlineMobileSize !== undefined && { headlineMobileSize }),
        ...(beforeTitle !== undefined && { beforeTitle }),
        ...(afterTitle !== undefined && { afterTitle }),
        ...(beforeItems.length > 0 && { beforeItems }),
        ...(afterItems.length > 0 && { afterItems }),
        ...(timelineSteps !== undefined && { timelineSteps }),
        ...(commercialCards !== undefined && { commercialCards }),
        ...(contacts !== undefined && { contacts }),
        ...(photos !== undefined && { photos }),
        ...(customHtml !== undefined && { customHtml }),
        ...(richTextHtml !== undefined && { richTextHtml }),
        ...(headingAlign !== undefined && { headingAlign }),
        ...(subheadlineDesktopSize !== undefined && { subheadlineDesktopSize }),
        ...(subheadlineMobileSize !== undefined && { subheadlineMobileSize }),
        ...(captionDesktopSize !== undefined && { captionDesktopSize }),
        ...(captionMobileSize !== undefined && { captionMobileSize }),
        ...(agencyName !== undefined && { agencyName }),
        ...(pitchSections !== undefined && { pitchSections }),
        ...(pitchStats !== undefined && { pitchStats }),
        ...(pitchItems !== undefined && { pitchItems }),
        ...(pitchBullets !== undefined && { pitchBullets }),
        ...(faqItems !== undefined && { faqItems }),
        ...(pitchCtaUrl !== undefined && { pitchCtaUrl }),
        ...(pitchCtaContact !== undefined && { pitchCtaContact }),
        ...(pitchBrandColor !== undefined && { pitchBrandColor }),
      },
    };
  });

  await updateProposal(proposalId, {
    status: proposal.status === "draft" ? "sent" : proposal.status,
    structure,
  });

  revalidatePath(getEditorPath(proposalId));
  redirect(buildRedirect(getEditorPath(proposalId), {
    message: "Блок сохранен.",
    block: blockId,
    panel: panel ?? "block",
    sidebar,
  }));
}

export async function removeProposalBlockAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const blockId = getStringValue(formData, "blockId");
  const panel = getPanelValue(formData);
  const sidebar = getSidebarValue(formData);
  const proposal = await getProposal(proposalId);

  if (!proposal) {
    redirect(buildRedirect("/dashboard", { error: "Концепт не найден." }));
  }

  await updateProposal(proposalId, {
    structure: proposal.structure.filter((block) => block.id !== blockId),
  });

  revalidatePath(getEditorPath(proposalId));
  redirect(buildRedirect(getEditorPath(proposalId), {
    message: "Блок удален.",
    panel: panel === "publish" ? "publish" : "concept",
    sidebar,
  }));
}

export async function moveProposalBlockAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const blockId = getStringValue(formData, "blockId");
  const direction = getStringValue(formData, "direction");
  const panel = getPanelValue(formData);
  const sidebar = getSidebarValue(formData);
  const proposal = await getProposal(proposalId);

  if (!proposal) {
    redirect(buildRedirect("/dashboard", { error: "Концепт не найден." }));
  }

  const index = proposal.structure.findIndex((block) => block.id === blockId);

  if (index === -1) {
    redirect(buildRedirect(getEditorPath(proposalId), { error: "Блок не найден.", panel, sidebar }));
  }

  const nextIndex = direction === "up" ? index - 1 : index + 1;

  if (nextIndex < 0 || nextIndex >= proposal.structure.length) {
    redirect(buildRedirect(getEditorPath(proposalId), {
      error: "Блок уже находится на крайней позиции.",
      block: blockId,
      panel,
      sidebar,
    }));
  }

  const structure = [...proposal.structure];
  const [movedBlock] = structure.splice(index, 1);
  structure.splice(nextIndex, 0, movedBlock);

  await updateProposal(proposalId, { structure });

  revalidatePath(getEditorPath(proposalId));
  redirect(buildRedirect(getEditorPath(proposalId), {
    message: "Порядок блоков обновлен.",
    block: blockId,
    panel: panel ?? "block",
    sidebar,
  }));
}

export async function duplicateProposalBlockAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const blockId = getStringValue(formData, "blockId");
  const panel = getPanelValue(formData);
  const sidebar = getSidebarValue(formData);
  const proposal = await getProposal(proposalId);

  if (!proposal) {
    redirect(buildRedirect("/dashboard", { error: "Концепт не найден." }));
  }

  const index = proposal.structure.findIndex((block) => block.id === blockId);

  if (index === -1) {
    redirect(buildRedirect(getEditorPath(proposalId), { error: "Блок не найден.", panel, sidebar }));
  }

  const structure = [...proposal.structure];
  const duplicatedBlock = structuredClone(structure[index]);
  duplicatedBlock.id = randomUUID();
  structure.splice(index + 1, 0, duplicatedBlock);

  await updateProposal(proposalId, {
    status: proposal.status === "draft" ? "sent" : proposal.status,
    structure,
  });

  revalidatePath(getEditorPath(proposalId));
  redirect(buildRedirect(getEditorPath(proposalId), {
    message: "Блок продублирован.",
    block: duplicatedBlock.id,
    panel: panel ?? "block",
    sidebar,
  }));
}

export async function toggleProposalBlockVisibilityAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const blockId = getStringValue(formData, "blockId");
  const panel = getPanelValue(formData);
  const sidebar = getSidebarValue(formData);
  const proposal = await getProposal(proposalId);

  if (!proposal) {
    redirect(buildRedirect("/dashboard", { error: "Концепт не найден." }));
  }

  let wasUpdated = false;
  const structure = proposal.structure.map((block) => {
    if (block.id !== blockId) {
      return block;
    }

    wasUpdated = true;
    return {
      ...block,
      visible: !block.visible,
    };
  });

  if (!wasUpdated) {
    redirect(buildRedirect(getEditorPath(proposalId), { error: "Блок не найден.", panel, sidebar }));
  }

  await updateProposal(proposalId, {
    status: proposal.status === "draft" ? "sent" : proposal.status,
    structure,
  });

  revalidatePath(getEditorPath(proposalId));
  redirect(buildRedirect(getEditorPath(proposalId), {
    message: "Видимость блока обновлена.",
    block: blockId,
    panel: panel ?? "block",
    sidebar,
  }));
}

export async function reorderProposalBlocksAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const sourceBlockId = getStringValue(formData, "sourceBlockId");
  const targetBlockId = getStringValue(formData, "targetBlockId");
  const position = getStringValue(formData, "position");
  const panel = getPanelValue(formData);
  const sidebar = getSidebarValue(formData);
  const proposal = await getProposal(proposalId);

  if (!proposal) {
    redirect(buildRedirect("/dashboard", { error: "Концепт не найден." }));
  }

  const sourceIndex = proposal.structure.findIndex((block) => block.id === sourceBlockId);
  const targetIndex = proposal.structure.findIndex((block) => block.id === targetBlockId);

  if (sourceIndex === -1 || targetIndex === -1) {
    redirect(buildRedirect(getEditorPath(proposalId), { error: "Не удалось определить блоки для перестановки.", panel, sidebar }));
  }

  if (sourceBlockId === targetBlockId) {
    redirect(buildRedirect(getEditorPath(proposalId), {
      block: sourceBlockId,
      panel: panel ?? "block",
      sidebar,
    }));
  }

  const structure = [...proposal.structure];
  const [movedBlock] = structure.splice(sourceIndex, 1);
  const normalizedTargetIndex = structure.findIndex((block) => block.id === targetBlockId);
  const nextIndex = position === "after" ? normalizedTargetIndex + 1 : normalizedTargetIndex;

  structure.splice(Math.max(nextIndex, 0), 0, movedBlock);

  await updateProposal(proposalId, { structure });

  revalidatePath(getEditorPath(proposalId));
  redirect(buildRedirect(getEditorPath(proposalId), {
    message: "Порядок блоков обновлен перетаскиванием.",
    block: sourceBlockId,
    panel: panel ?? "block",
    sidebar,
  }));
}

export async function publishShareLinkAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const proposal = await getProposal(proposalId);

  if (!proposal) {
    throw new Error("Концепт не найден.");
  }

  const company = await getCompany(proposal.companyId);

  if (!company) {
    throw new Error("Компания для этого концепта не найдена.");
  }

  const shareLink = await publishShareLink(proposalId, company.name, proposal.title);

  await updateProposal(proposalId, {
    status: proposal.status === "draft" ? "sent" : proposal.status,
  });

  revalidatePath("/dashboard");
  revalidatePath(getEditorPath(proposalId));
  revalidatePath(getSharePath(shareLink));

  return { sharePath: getSharePath(shareLink) };
}

export async function updateProposalBlocksAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const structureJson = getStringValue(formData, "structure");
  
  const proposal = await getProposal(proposalId);
  if (!proposal) {
    throw new Error("Концепт не найден");
  }

  try {
    const structure = JSON.parse(structureJson);
    await updateProposal(proposalId, { structure });
    revalidatePath(getEditorPath(proposalId));
  } catch (error) {
    console.error("Failed to update proposal blocks:", error);
    throw error;
  }
}

export async function updateProposalPaletteAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const palette = getProposalPalette(getStringValue(formData, "palette"));

  const proposal = await getProposal(proposalId);
  if (!proposal) {
    throw new Error("Концепт не найден");
  }

  await updateProposal(proposalId, {
    settings: {
      ...proposal.settings,
      palette,
    },
  });

  revalidatePath(getEditorPath(proposalId));
}

export async function deleteCurrentProposalAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");

  const proposal = await getProposal(proposalId);
  if (!proposal) {
    redirect("/dashboard?error=Концепт+не+найден");
  }

  await deleteProposal(proposalId);

  revalidatePath("/dashboard");
  redirect("/dashboard?mode=proposals&message=Концепт+удалён");
}