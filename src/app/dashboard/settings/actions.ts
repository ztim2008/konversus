"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentAdmin } from "@/lib/auth/session";
import { SETTING_DEFAULTS, setManySetting } from "@/lib/data/settings";

export async function saveSettingsAction(formData: FormData) {
  await requireCurrentAdmin();

  const data: Record<string, string> = {};
  for (const key of Object.keys(SETTING_DEFAULTS)) {
    const val = formData.get(key);
    if (typeof val === "string") {
      data[key] = val;
    }
  }

  await setManySetting(data);

  revalidatePath("/");
  revalidatePath("/dashboard/settings");
}
