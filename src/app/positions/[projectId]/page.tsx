import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectView } from "@/components/seo-positions/project-view";
import { requireCurrentAdmin } from "@/lib/auth/session";
import { getProject } from "@/lib/seo-positions/data";
import { loadProjectPage, publicBaseUrl } from "@/lib/seo-positions/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SEO-позиции",
  robots: { index: false, follow: false },
};

export default async function SeoProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCurrentAdmin();
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  const data = await loadProjectPage(project, await searchParams);
  return (
    <ProjectView
      project={project}
      {...data}
      basePath={`/positions/${project.id}`}
      admin
      shareUrl={`${publicBaseUrl()}/positions/s/${project.shareSlug}`}
    />
  );
}
