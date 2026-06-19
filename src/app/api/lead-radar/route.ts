import { NextRequest, NextResponse } from "next/server";
import { listRadars, createRadar, deleteRadar, saveRadarSites, listRadarSites, updateRadarLastCheck, updateSiteStatus, deleteSite } from "@/lib/data/lead-radar";

// Список радаров
export async function GET() {
  const radars = await listRadars();
  return NextResponse.json({ radars });
}

// Создать / удалить радар
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "create") {
    const id = await createRadar({ city: body.city, niche: body.niche, filters: body.filters || [] });
    return NextResponse.json({ ok: true, id });
  }

  if (body.action === "delete") {
    await deleteRadar(body.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "save-sites") {
    const count = await saveRadarSites(body.radarId, body.sites);
    await updateRadarLastCheck(body.radarId, count);
    return NextResponse.json({ ok: true, count });
  }

  if (body.action === "update-check") {
    await updateRadarLastCheck(body.radarId, 0);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete-site") {
    await deleteSite(body.siteId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update-status") {
    await updateSiteStatus(body.siteId, body.status);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "list-sites") {
    const sites = await listRadarSites(body.radarId);
    return NextResponse.json({ sites });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
