import { NextRequest, NextResponse } from "next/server";
import { getArchitectProject } from "@/lib/data/architect";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await getArchitectProject(id);
  if (!project) {
    return NextResponse.json(
      { error: "Проект не найден" },
      { status: 404, headers: CORS }
    );
  }

  return NextResponse.json(
    {
      id: project.id,
      url: project.url,
      source_type: project.source_type,
      status: project.status,
      result: project.result_json,
      error: project.error_message,
      created_at: project.created_at,
      // Метаданные снимка для прогресс-шагов (когда status=analyzing/done)
      snapshot_meta: project.snapshot_json
        ? {
            title: project.snapshot_json.title ?? null,
            cms: project.snapshot_json.cms ?? null,
            h1: project.snapshot_json.h1 ?? null,
            word_count: project.snapshot_json.word_count ?? null,
            image_count: project.snapshot_json.image_count ?? null,
            has_schema_org: project.snapshot_json.has_schema_org ?? false,
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
        : null,
    },
    { headers: CORS }
  );
}
