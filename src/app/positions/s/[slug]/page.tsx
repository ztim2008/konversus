import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectView } from "@/components/seo-positions/project-view";
import { getProjectBySlug } from "@/lib/seo-positions/data";
import { loadProjectPage } from "@/lib/seo-positions/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Позиции сайта в Google",
  robots: { index: false, follow: false },
};

export default async function SeoSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const data = await loadProjectPage(project, await searchParams);
  return <ProjectView project={project} {...data} basePath={`/positions/s/${slug}`} canEdit={false} isOwner={false} />;
}
