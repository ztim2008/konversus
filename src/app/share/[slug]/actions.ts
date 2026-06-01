"use server";

import { revalidatePath } from "next/cache";

import { createFeedback } from "@/lib/data/feedback";
import { getShareLinkBySlugOrToken } from "@/lib/data/share-links";

export async function submitFeedbackAction(formData: FormData) {
  const slug = (formData.get("slug") as string | null)?.trim() ?? "";
  const ratingRaw = (formData.get("rating") as string | null)?.trim() ?? "";
  const comment = (formData.get("comment") as string | null)?.trim() ?? "";
  const authorName = (formData.get("authorName") as string | null)?.trim() ?? "";

  if (!slug) {
    return { success: false, error: "Некорректная ссылка." };
  }

  const shareLink = await getShareLinkBySlugOrToken(slug);
  if (!shareLink || shareLink.status === "revoked" || shareLink.status === "expired") {
    return { success: false, error: "Ссылка недоступна." };
  }

  const rating = ratingRaw ? Number.parseInt(ratingRaw, 10) : undefined;
  if (rating !== undefined && (Number.isNaN(rating) || rating < 1 || rating > 5)) {
    return { success: false, error: "Оценка должна быть от 1 до 5." };
  }

  if (!rating && !comment) {
    return { success: false, error: "Напишите комментарий или выберите оценку звёздами." };
  }

  await createFeedback({
    proposalId: shareLink.proposalId,
    shareLinkId: shareLink.id,
    authorName: authorName || undefined,
    rating,
    comment: comment || undefined,
  });

  revalidatePath(`/share/${slug}`);
  return { success: true };
}
