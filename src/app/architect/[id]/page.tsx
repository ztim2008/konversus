import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getArchitectProject } from "@/lib/data/architect";
import ArchitectResultClient from "@/components/architect/result-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = await getArchitectProject(id);
  if (!project) return { title: "Анализ не найден" };

  const title = `Анализ бизнеса · ${project.url.replace(/^https?:\/\//, "").slice(0, 40)}`;
  const description = project.result_json?.verdict ?? "AI-анализ бизнеса от Konversus";

  // Используем скриншот сайта как OG-изображение (если был сделан), иначе дефолтный
  const screenshotPath = project.snapshot_json?.visual_analysis?.screenshot_path;
  const ogImageUrl = screenshotPath
    ? `https://konversus.ru${screenshotPath}`
    : "https://konversus.ru/og-architect.jpg";

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      title,
      description,
      images: [{ url: ogImageUrl, width: 1440, height: 900, alt: `Анализ сайта ${project.url}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ArchitectResultPage({ params }: Props) {
  const { id } = await params;
  const project = await getArchitectProject(id);

  if (!project) return notFound();

  // Формируем snapshotMeta на сервере (аналогично /api/architect/[id])
  // чтобы технические секции рендерились сразу, без ожидания polling
  const initialSnapshotMeta = project.snapshot_json
    ? {
        title: project.snapshot_json.title ?? null,
        cms: project.snapshot_json.cms ?? null,
        h1: project.snapshot_json.h1 ?? null,
        description: project.snapshot_json.description ?? null,
        word_count: project.snapshot_json.word_count ?? null,
        image_count: project.snapshot_json.image_count ?? null,
        link_count: project.snapshot_json.link_count ?? null,
        external_scripts_count: project.snapshot_json.external_scripts_count ?? null,
        inline_styles_bytes: project.snapshot_json.inline_styles_bytes ?? null,
        has_resource_hints: project.snapshot_json.has_resource_hints ?? null,
        has_schema_org: project.snapshot_json.has_schema_org ?? false,
        headings: project.snapshot_json.headings ?? null,
        phones_count: project.snapshot_json.contacts_found?.phones?.length ?? 0,
        emails_count: project.snapshot_json.contacts_found?.emails?.length ?? 0,
        socials_count: project.snapshot_json.contacts_found?.socials?.length ?? 0,
        contacts_found: project.snapshot_json.contacts_found ?? null,
        avito_api: project.snapshot_json.avito_api ?? null,
        seo_metrics: project.snapshot_json.seo_metrics ?? null,
        tech_metrics: project.snapshot_json.tech_metrics ?? null,
        visual_analysis: project.snapshot_json.visual_analysis ?? null,
        ru_blocking: project.snapshot_json.ru_blocking ?? null,
        speed_audit: project.snapshot_json.speed_audit ?? null,
      }
    : null;

  return (
    <ArchitectResultClient
      id={project.id}
      initialStatus={project.status}
      initialResult={project.result_json}
      initialSnapshotMeta={initialSnapshotMeta}
      url={project.url}
    />
  );
}
