"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentAdmin } from "@/lib/auth/session";
import { deleteFeedback } from "@/lib/data/feedback";

export async function deleteFeedbackAction(id: string): Promise<void> {
  await requireCurrentAdmin();
  await deleteFeedback(id);
  revalidatePath("/dashboard/reviews");
  revalidatePath("/reviews");
  revalidatePath("/");
}
