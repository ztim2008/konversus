"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentAdmin } from "@/lib/auth/session";
import { checkProjectNow } from "@/lib/seo-positions/check";
import {
  addKeywords,
  addNote,
  createProject,
  deleteKeyword,
  deleteNote,
  deleteProject,
  getProject,
  saveReportPlan,
  setProjectActive,
} from "@/lib/seo-positions/data";
import { normalizeDomain } from "@/lib/seo-positions/domain";
import { isMonth } from "@/lib/seo-positions/tz";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function requireProject(formData: FormData) {
  await requireCurrentAdmin();
  const project = await getProject(str(formData, "projectId"));
  if (!project) redirect("/positions?error=" + encodeURIComponent("Проект не найден"));
  return project;
}

function parseKeywords(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const k = line.replace(/\s+/g, " ").trim().slice(0, 300);
    const key = k.toLowerCase();
    if (k && !seen.has(key)) {
      seen.add(key);
      out.push(k);
    }
  }
  return out;
}

export async function createProjectAction(formData: FormData) {
  await requireCurrentAdmin();
  const domain = normalizeDomain(str(formData, "domain"));
  const gl = str(formData, "gl").toLowerCase();
  const hl = str(formData, "hl").toLowerCase();
  const location = str(formData, "location");
  const maxPages = Number(str(formData, "maxPages"));

  if (!domain) redirect("/positions?error=" + encodeURIComponent("Домен не распознан"));
  if (!/^[a-z]{2}$/.test(gl) || !/^[a-z]{2}(-[a-z]{2})?$/.test(hl)) {
    redirect("/positions?error=" + encodeURIComponent("Страна и язык — двухбуквенные коды, например uz и ru"));
  }
  if (!location || location.length > 200 || /[<>]/.test(location)) {
    redirect("/positions?error=" + encodeURIComponent("Укажите город, например Tashkent, Uzbekistan"));
  }

  const id = await createProject({
    name: str(formData, "name").slice(0, 200) || domain,
    domain,
    gl,
    hl,
    location,
    maxPages: [3, 5, 10].includes(maxPages) ? maxPages : 5,
  });

  const keywords = parseKeywords(str(formData, "keywords"));
  if (keywords.length) await addKeywords(id, keywords);

  redirect(`/positions/${id}`);
}

export async function addKeywordsAction(formData: FormData) {
  const project = await requireProject(formData);
  await addKeywords(project.id, parseKeywords(str(formData, "keywords")));
  revalidatePath(`/positions/${project.id}`);
}

export async function deleteKeywordAction(formData: FormData) {
  const project = await requireProject(formData);
  await deleteKeyword(project.id, str(formData, "keywordId"));
  revalidatePath(`/positions/${project.id}`);
}

export async function checkNowAction(formData: FormData) {
  const project = await requireProject(formData);
  const keywordId = str(formData, "keywordId") || undefined;
  after(async () => {
    try {
      await checkProjectNow(project, keywordId);
    } catch (err) {
      console.error("[seo-positions] check failed", err);
    }
  });
  redirect(`/positions/${project.id}?checking=${Date.now()}${keywordId ? `&kw=${keywordId}` : ""}`);
}

export async function addNoteAction(formData: FormData) {
  const project = await requireProject(formData);
  const date = str(formData, "date");
  const text = str(formData, "text").replace(/\s+/g, " ").slice(0, 300);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && text) {
    await addNote(project.id, { keywordId: str(formData, "keywordId") || null, date, text });
  }
  revalidatePath(`/positions/${project.id}`);
}

export async function deleteNoteAction(formData: FormData) {
  const project = await requireProject(formData);
  await deleteNote(project.id, str(formData, "noteId"));
  revalidatePath(`/positions/${project.id}`);
}

export async function saveReportPlanAction(formData: FormData) {
  const project = await requireProject(formData);
  const month = str(formData, "month");
  if (!isMonth(month)) redirect(`/positions/${project.id}`);
  await saveReportPlan(project.id, month, str(formData, "plan").slice(0, 4000));
  revalidatePath(`/positions/s/${project.shareSlug}/report`);
  redirect(`/positions/s/${project.shareSlug}/report?month=${month}`);
}

export async function toggleProjectAction(formData: FormData) {
  const project = await requireProject(formData);
  await setProjectActive(project.id, !project.isActive);
  revalidatePath(`/positions/${project.id}`);
}

export async function deleteProjectAction(formData: FormData) {
  const project = await requireProject(formData);
  await deleteProject(project.id);
  redirect("/positions");
}
