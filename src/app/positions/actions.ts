"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
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
  setKeywordTargetUrl,
  setProjectActive,
} from "@/lib/seo-positions/data";
import { normalizeDomain, urlMatchesDomain } from "@/lib/seo-positions/domain";
import { ADS_FLASH_COOKIE, createAdsToken } from "@/lib/seo-positions/ads";
import { saveAudit } from "@/lib/seo-positions/audit";
import { runAutoAudit } from "@/lib/seo-positions/audit-check";
import { AUDIT_ITEMS, isAuditValue, PAGE_ITEMS } from "@/lib/seo-positions/audit-items";
import { runCrawl } from "@/lib/seo-positions/crawl";
import { MAX_AUDIT_PAGES, normalizeUrl } from "@/lib/seo-positions/pages";
import { checkLandingPages, loadAuditPages } from "@/lib/seo-positions/pages-data";
import { startBackgroundRun } from "@/lib/seo-positions/runs";
import { currentMonth, isMonth } from "@/lib/seo-positions/tz";
import {
  canAccessProject,
  createUser,
  deleteUser,
  generatePassword,
  loginMarketer,
  logoutMarketer,
  normalizeLogin,
  PASSWORD_FLASH_COOKIE,
  requireViewer,
  resetUserPassword,
  setUserActive,
  setUserProjects,
} from "@/lib/seo-positions/users";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Админ — любой проект; маркетолог — только выданный ему. Чужой проект выглядит как несуществующий. */
async function requireProject(formData: FormData, opts: { adminOnly?: boolean } = {}) {
  const viewer = opts.adminOnly ? (await requireCurrentAdmin(), null) : await requireViewer();
  const projectId = str(formData, "projectId");
  const project = await getProject(projectId);
  if (!project || (viewer && !canAccessProject(viewer, project.id))) {
    redirect("/positions?error=" + encodeURIComponent("Проект не найден"));
  }
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
  const project = await requireProject(formData, { adminOnly: true });
  await deleteKeyword(project.id, str(formData, "keywordId"));
  revalidatePath(`/positions/${project.id}`);
}

export async function checkNowAction(formData: FormData) {
  const project = await requireProject(formData);
  const keywordId = str(formData, "keywordId") || undefined;
  await startBackgroundRun(project.id, "positions", currentMonth(project.gl), (progress) => checkProjectNow(project, keywordId, progress));
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

function auditRedirect(slug: string, month: string, anchor = "audit"): never {
  redirect(`/positions/s/${slug}/report?month=${month}#${anchor}`);
}

export async function saveAuditAction(formData: FormData) {
  const project = await requireProject(formData);
  const month = str(formData, "month");
  if (!isMonth(month)) redirect(`/positions/${project.id}`);
  const read = (suffix: string, pageUrl: string) => (item: { no: number }) => {
    const v = str(formData, `v_${suffix}${item.no}`);
    return { itemNo: item.no, value: isAuditValue(v) ? v : null, comment: str(formData, `c_${suffix}${item.no}`), pageUrl };
  };
  const inputs = AUDIT_ITEMS.map(read("", ""));
  for (let i = 1; i < MAX_AUDIT_PAGES; i++) {
    const url = str(formData, `page_${i}`);
    if (url && urlMatchesDomain(url, project.domain)) inputs.push(...PAGE_ITEMS.map(read(`${i}_`, normalizeUrl(url))));
  }
  await saveAudit(project.id, month, inputs, "manual");
  auditRedirect(project.shareSlug, month);
}

export async function autoAuditAction(formData: FormData) {
  const project = await requireProject(formData);
  const month = currentMonth(project.gl);
  await startBackgroundRun(project.id, "checklist", month, async (progress) => {
    await progress(0, 0, "Выбираю страницы");
    const pageUrls = await loadAuditPages(project, month);
    const { inputs } = await runAutoAudit(project.domain, progress, pageUrls);
    await saveAudit(project.id, month, inputs, "auto", { keepManual: true });
    const rated = inputs.filter((i) => i.value !== null).length;
    const pages = pageUrls.length ? `, страниц кроме главной: ${pageUrls.length}` : "";
    return `оценено ${rated} из ${inputs.length} автопунктов${rated < inputs.length ? `, проверить вручную: ${inputs.length - rated}` : ""}${pages}`;
  });
  auditRedirect(project.shareSlug, month);
}

export async function checkPagesAction(formData: FormData) {
  const project = await requireProject(formData);
  const month = currentMonth(project.gl);
  await startBackgroundRun(project.id, "pages", month, (progress) => checkLandingPages(project, month, progress));
  auditRedirect(project.shareSlug, month, "pages");
}

export async function crawlSiteAction(formData: FormData) {
  const project = await requireProject(formData);
  const month = currentMonth(project.gl);
  await startBackgroundRun(project.id, "crawl", month, (progress) => runCrawl(project, month, progress));
  auditRedirect(project.shareSlug, month, "tech");
}

/** Ключ скрипта Google Ads показывается только в httpOnly-cookie страницы «Реклама» на 10 минут: в базе лишь хеш. */
export async function createAdsTokenAction(formData: FormData) {
  const project = await requireProject(formData);
  const token = await createAdsToken(project.id, "google");
  (await cookies()).set(ADS_FLASH_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: `/positions/${project.id}/ads`,
    maxAge: 600,
  });
  redirect(`/positions/${project.id}/ads`);
}

export async function setTargetUrlAction(formData: FormData) {
  const project = await requireProject(formData);
  const raw = str(formData, "targetUrl");
  let target: string | null = null;
  if (raw) {
    const url = raw.startsWith("/") ? `https://${project.domain}${raw}` : /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    if (!urlMatchesDomain(url, project.domain) || url.length > 1000) {
      redirect(`/positions/${project.id}?error=${encodeURIComponent("Целевая страница должна быть на сайте " + project.domain)}`);
    }
    target = normalizeUrl(url);
  }
  await setKeywordTargetUrl(project.id, str(formData, "keywordId"), target);
  redirect(`/positions/${project.id}`);
}

export async function toggleProjectAction(formData: FormData) {
  const project = await requireProject(formData, { adminOnly: true });
  await setProjectActive(project.id, !project.isActive);
  revalidatePath(`/positions/${project.id}`);
}

export async function deleteProjectAction(formData: FormData) {
  const project = await requireProject(formData, { adminOnly: true });
  await deleteProject(project.id);
  redirect("/positions");
}

export async function loginAction(formData: FormData) {
  const result = await loginMarketer(str(formData, "login"), String(formData.get("password") ?? ""));
  if (result === "ok") redirect("/positions");
  const message = result === "locked" ? "Слишком много попыток. Попробуйте через 15 минут" : "Неверный логин или пароль";
  redirect("/positions/login?error=" + encodeURIComponent(message));
}

export async function logoutAction() {
  await logoutMarketer();
  redirect("/positions/login");
}

// ---------- маркетологи (только админ) ----------

function selectedProjects(formData: FormData) {
  return formData.getAll("projectIds").filter((v): v is string => typeof v === "string");
}

function usersRedirect(params: Record<string, string>) {
  redirect(`/positions/users?${new URLSearchParams(params).toString()}`);
}

/** Новый пароль показывается один раз: в httpOnly-cookie на минуту, не в адресе страницы и не в логах. */
async function flashPassword(login: string, password: string) {
  (await cookies()).set(PASSWORD_FLASH_COOKIE, JSON.stringify({ login, password }), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/positions/users",
    maxAge: 60,
  });
  redirect("/positions/users");
}

export async function createUserAction(formData: FormData) {
  await requireCurrentAdmin();
  const login = normalizeLogin(str(formData, "login"));
  if (!login) usersRedirect({ error: "Логин: латиница, цифры, точка, дефис, 3–64 символа" });
  const password = generatePassword();
  const id = await createUser(login!, str(formData, "name").slice(0, 200), password);
  if (!id) usersRedirect({ error: `Логин ${login} уже занят` });
  await setUserProjects(id!, selectedProjects(formData));
  await flashPassword(login!, password);
}

export async function updateUserProjectsAction(formData: FormData) {
  await requireCurrentAdmin();
  await setUserProjects(str(formData, "userId"), selectedProjects(formData));
  revalidatePath("/positions/users");
}

export async function resetUserPasswordAction(formData: FormData) {
  await requireCurrentAdmin();
  const password = generatePassword();
  await resetUserPassword(str(formData, "userId"), password);
  await flashPassword(str(formData, "login"), password);
}

export async function toggleUserAction(formData: FormData) {
  await requireCurrentAdmin();
  await setUserActive(str(formData, "userId"), str(formData, "active") !== "1");
  revalidatePath("/positions/users");
}

export async function deleteUserAction(formData: FormData) {
  await requireCurrentAdmin();
  await deleteUser(str(formData, "userId"));
  revalidatePath("/positions/users");
}
