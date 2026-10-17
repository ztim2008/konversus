import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectView } from "@/components/seo-positions/project-view";
import { getProject } from "@/lib/seo-positions/data";
import { loadProjectPage, publicBaseUrl } from "@/lib/seo-positions/page-data";
import { canAccessProject, requireViewer } from "@/lib/seo-positions/users";

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
  const viewer = await requireViewer();
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project || !canAccessProject(viewer, project.id)) notFound();

  const data = await loadProjectPage(project, await searchParams);
  return (
    <ProjectView
      project={project}
      {...data}
      basePath={`/positions/${project.id}`}
      canEdit
      isOwner={viewer.role === "admin"}
      shareUrl={`${publicBaseUrl()}/positions/s/${project.shareSlug}`}
    />
  );
}
