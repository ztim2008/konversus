"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentAdmin } from "@/lib/auth/session";
import { deleteArchitectProject } from "@/lib/data/architect";

export async function deleteAnalysis(id: string) {
  await requireCurrentAdmin();
  await deleteArchitectProject(id);
  revalidatePath("/dashboard/architect");
}
