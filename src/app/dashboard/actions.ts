"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentAdmin } from "@/lib/auth/session";
import { createCompany, deleteCompany, getCompany, updateCompany } from "@/lib/data/companies";
import { createProposal, deleteProposal, duplicateProposal, getProposal, listProposals, updateProposal } from "@/lib/data/proposals";
import {
  companyStatuses,
  designPresets,
  proposalStatuses,
  type CompanyStatus,
  type DesignPreset,
  type ProposalStatus,
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

function parseCompanyContacts(formData: FormData) {
  const responsible = getStringValue(formData, "responsible");
  const nextStep = getStringValue(formData, "nextStep");
  const contactDeadline = getStringValue(formData, "contactDeadline");
  const leadSource = getStringValue(formData, "leadSource");

  return {
    responsible: responsible || undefined,
    nextStep: nextStep || undefined,
    contactDeadline: contactDeadline || undefined,
    leadSource: leadSource || undefined,
  };
}

function isValidRedirectTarget(value: string) {
  return value.startsWith("/") ? value : "/dashboard";
}

export async function createCompanyAction(formData: FormData) {
  await requireCurrentAdmin();

  const name = getStringValue(formData, "name");
  const websiteUrl = getStringValue(formData, "websiteUrl");
  const industry = getStringValue(formData, "industry");
  const shortDescription = getStringValue(formData, "shortDescription");
  const contacts = parseCompanyContacts(formData);
  const notes = getStringValue(formData, "notes");
  const previewImageUrl = getStringValue(formData, "previewImageUrl") || null;

  if (!name) {
    redirect(buildRedirect("/dashboard", { error: "Название компании обязательно." }));
  }

  try {
    await createCompany({
      name,
      websiteUrl,
      industry,
      shortDescription,
      contacts,
      notes,
      previewImageUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось создать компанию.";
    redirect(buildRedirect("/dashboard", { error: message }));
  }

  revalidatePath("/dashboard");
  redirect(buildRedirect("/dashboard", { message: "Компания добавлена." }));
}

export async function createProposalAction(formData: FormData) {
  await requireCurrentAdmin();

  const companyId = getStringValue(formData, "companyId");
  const title = getStringValue(formData, "title");
  const presetValue = getStringValue(formData, "preset");
  const headline = getStringValue(formData, "headline");
  const subheadline = getStringValue(formData, "subheadline");
  const ctaLabel = getStringValue(formData, "ctaLabel");

  if (!companyId || !title || !presetValue) {
    redirect(buildRedirect("/dashboard", { error: "Для концепта нужны компания, название и пресет." }));
  }

  if (!designPresets.includes(presetValue as DesignPreset)) {
    redirect(buildRedirect("/dashboard", { error: "Выбран неизвестный пресет." }));
  }

  const preset = presetValue as DesignPreset;

  const company = await getCompany(companyId);

  if (!company) {
    redirect(buildRedirect("/dashboard", { error: "Выбранная компания не найдена." }));
  }

  let proposalId = "";

  try {
    const proposal = await createProposal({
      companyId,
      title,
      preset,
      headline,
      subheadline,
      ctaLabel,
    });

    proposalId = proposal.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось создать концепт.";
    redirect(buildRedirect("/dashboard", { error: message }));
  }

  revalidatePath("/dashboard");
  redirect(buildRedirect(`/dashboard/proposals/${proposalId}`, { message: "Концепт создан. Теперь можно собрать структуру и выпустить клиентскую страницу." }));
}

export async function openCompanyEditorAction(formData: FormData) {
  await requireCurrentAdmin();

  const companyId = getStringValue(formData, "companyId");
  const presetValue = getStringValue(formData, "editorPreset");
  const selectedPreset = designPresets.includes(presetValue as DesignPreset)
    ? (presetValue as DesignPreset)
    : "industrial-dark";

  if (!companyId) {
    redirect(buildRedirect("/dashboard", { error: "Компания не выбрана." }));
  }

  const company = await getCompany(companyId);

  if (!company) {
    redirect(buildRedirect("/dashboard", { error: "Компания не найдена." }));
  }

  const proposals = await listProposals();
  const latestProposal = proposals.find((proposal) => proposal.companyId === companyId) ?? null;

  if (latestProposal) {
    redirect(`/dashboard/proposals/${latestProposal.id}`);
  }

  let proposalId = "";

  try {
    const proposal = await createProposal({
      companyId,
      title: `${company.name} — коммерческий концепт`,
      preset: selectedPreset,
      headline: company.shortDescription ?? `Коммерческий концепт для компании ${company.name}`,
      subheadline: "Собираем структуру, контент и визуал прямо в редакторе из админки компании.",
      ctaLabel: "Обсудить проект",
    });

    proposalId = proposal.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось создать концепт для компании.";
    redirect(buildRedirect("/dashboard", { error: message }));
  }

  revalidatePath("/dashboard");
  redirect(buildRedirect(`/dashboard/proposals/${proposalId}`, { message: "Концепт создан автоматически. Открыт редактор компании." }));
}

export async function updateCompanyCrmAction(formData: FormData) {
  await requireCurrentAdmin();


  const companyId = getStringValue(formData, "companyId");
  const name = getStringValue(formData, "name");
  const status = getStringValue(formData, "status");
  const websiteUrl = getStringValue(formData, "websiteUrl");
  const industry = getStringValue(formData, "industry");
  const shortDescription = getStringValue(formData, "shortDescription");
  const notes = getStringValue(formData, "notes");
  const contacts = parseCompanyContacts(formData);
  const previewImageUrl = getStringValue(formData, "previewImageUrl") || null;
  const returnTo = isValidRedirectTarget(getStringValue(formData, "returnTo"));


  if (!companyId || !name || !companyStatuses.includes(status as CompanyStatus)) {
    redirect(buildRedirect(returnTo, { error: "Не удалось сохранить CRM-поля компании. (Проверьте название)" }));
  }


  try {
    await updateCompany(companyId, {
      name,
      status: status as CompanyStatus,
      websiteUrl: websiteUrl || null,
      industry: industry || null,
      shortDescription: shortDescription || null,
      notes: notes || null,
      contacts,
      previewImageUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось сохранить CRM-поля компании.";
    redirect(buildRedirect(returnTo, { error: message }));
  }

  revalidatePath("/dashboard");
  redirect(buildRedirect(returnTo, { message: "CRM-поля компании сохранены." }));
}

export async function updateCompanyStatusAction(formData: FormData) {
  await requireCurrentAdmin();

  const companyId = getStringValue(formData, "companyId");
  const status = getStringValue(formData, "status");
  const returnTo = isValidRedirectTarget(getStringValue(formData, "returnTo"));

  if (!companyId || !companyStatuses.includes(status as CompanyStatus)) {
    redirect(buildRedirect(returnTo, { error: "Не удалось обновить статус компании." }));
  }

  try {
    await updateCompany(companyId, { status: status as CompanyStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось обновить статус компании.";
    redirect(buildRedirect(returnTo, { error: message }));
  }

  revalidatePath("/dashboard");
  redirect(buildRedirect(returnTo, { message: "Статус компании обновлен." }));
}

export async function updateProposalStatusAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const status = getStringValue(formData, "status");
  const returnTo = isValidRedirectTarget(getStringValue(formData, "returnTo"));

  if (!proposalId || !proposalStatuses.includes(status as ProposalStatus)) {
    redirect(buildRedirect(returnTo, { error: "Не удалось обновить статус концепта." }));
  }

  const proposal = await getProposal(proposalId);

  if (!proposal) {
    redirect(buildRedirect(returnTo, { error: "Концепт не найден." }));
  }

  try {
    await updateProposal(proposalId, { status: status as ProposalStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось обновить статус концепта.";
    redirect(buildRedirect(returnTo, { error: message }));
  }

  revalidatePath("/dashboard");
  redirect(buildRedirect(returnTo, { message: `Статус концепта «${proposal.title}» обновлен.` }));
}

export async function deleteProposalAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const returnTo = isValidRedirectTarget(getStringValue(formData, "returnTo"));

  const proposal = await getProposal(proposalId);
  if (!proposal) {
    redirect(buildRedirect(returnTo, { error: "Концепт не найден." }));
  }

  try {
    await deleteProposal(proposalId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось удалить концепт.";
    redirect(buildRedirect(returnTo, { error: message }));
  }

  revalidatePath("/dashboard");
  redirect(buildRedirect(returnTo, { message: `Концепт «${proposal.title}» удалён.` }));
}

export async function deleteCompanyAction(formData: FormData) {
  await requireCurrentAdmin();

  const companyId = getStringValue(formData, "companyId");
  const returnTo = isValidRedirectTarget(getStringValue(formData, "returnTo"));

  const company = await getCompany(companyId);
  if (!company) {
    redirect(buildRedirect(returnTo, { error: "Компания не найдена." }));
  }

  try {
    await deleteCompany(companyId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось удалить компанию.";
    redirect(buildRedirect(returnTo, { error: message }));
  }

  revalidatePath("/dashboard");
  redirect(buildRedirect(returnTo, { message: `Компания «${company.name}» и все её концепты удалены.` }));
}

export async function archiveCompanyAction(formData: FormData) {
  await requireCurrentAdmin();

  const companyId = getStringValue(formData, "companyId");
  const returnTo = isValidRedirectTarget(getStringValue(formData, "returnTo"));

  const company = await getCompany(companyId);
  if (!company) {
    redirect(buildRedirect(returnTo, { error: "Компания не найдена." }));
  }

  try {
    await updateCompany(companyId, { status: "archived" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось архивировать компанию.";
    redirect(buildRedirect(returnTo, { error: message }));
  }

  revalidatePath("/dashboard");
  redirect(buildRedirect(returnTo, { message: `Компания «${company.name}» перемещена в архив.` }));
}

export async function unarchiveCompanyAction(formData: FormData) {
  await requireCurrentAdmin();

  const companyId = getStringValue(formData, "companyId");
  const returnTo = isValidRedirectTarget(getStringValue(formData, "returnTo"));

  const company = await getCompany(companyId);
  if (!company) {
    redirect(buildRedirect(returnTo, { error: "Компания не найдена." }));
  }

  try {
    await updateCompany(companyId, { status: "draft" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось восстановить компанию.";
    redirect(buildRedirect(returnTo, { error: message }));
  }

  revalidatePath("/dashboard");
  redirect(buildRedirect(returnTo, { message: `Компания «${company.name}» восстановлена.` }));
}

export async function duplicateProposalAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const targetCompanyId = getStringValue(formData, "targetCompanyId");
  const newTitle = getStringValue(formData, "newTitle");

  if (!proposalId || !targetCompanyId || !newTitle) {
    redirect("/dashboard");
  }

  const newProposal = await duplicateProposal(proposalId, {
    companyId: targetCompanyId,
    title: newTitle,
  });

  redirect(`/dashboard/proposals/${newProposal.id}`);
}

export async function archiveProposalAction(formData: FormData) {
  await requireCurrentAdmin();

  const proposalId = getStringValue(formData, "proposalId");
  const returnTo = isValidRedirectTarget(getStringValue(formData, "returnTo"));

  const proposal = await getProposal(proposalId);
  if (!proposal) {
    redirect(buildRedirect(returnTo, { error: "Концепт не найден." }));
  }

  try {
    await updateProposal(proposalId, { status: "archived" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось архивировать концепт.";
    redirect(buildRedirect(returnTo, { error: message }));
  }

  revalidatePath("/dashboard");
  redirect(buildRedirect(returnTo, { message: `Концепт «${proposal.title}» перемещён в архив.` }));
}