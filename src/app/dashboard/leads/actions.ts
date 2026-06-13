"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentAdmin } from "@/lib/auth/session";
import { deleteLead, updateLead, type LeadStatus, type LeadPriority } from "@/lib/data/leads";

export async function updateLeadStatusAction(id: string, status: LeadStatus) {
  await requireCurrentAdmin();
  await updateLead(id, { status });
  revalidatePath("/dashboard/leads");
}

export async function updateLeadPriorityAction(id: string, priority: LeadPriority) {
  await requireCurrentAdmin();
  await updateLead(id, { priority });
  revalidatePath("/dashboard/leads");
}

export async function deleteLeadAction(id: string) {
  await requireCurrentAdmin();
  await deleteLead(id);
  revalidatePath("/dashboard/leads");
}
