import { NextRequest, NextResponse } from "next/server";
import {
  listRadars,
  createRadar,
  deleteRadar,
  saveRadarSites,
  listRadarSites,
  updateRadarLastCheck,
  updateSiteStatus,
  deleteSite,
  listAllSites,
  listQueuedSites,
  countQueuedForDate,
  upsertBatchPlan,
  getBatchByDate,
} from "@/lib/data/lead-radar";

const DAILY_SEND_LIMIT = 20;

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

  if (body.action === "list-all-sites") {
    const sites = await listAllSites();
    return NextResponse.json({ sites });
  }

  if (body.action === "list-queue") {
    const batchDate = body.batchDate as string | undefined;
    const sites = await listQueuedSites(batchDate);
    const queuedCount = await countQueuedForDate(batchDate);
    const batch = batchDate
      ? await getBatchByDate(batchDate)
      : await getBatchByDate(new Date().toISOString().slice(0, 10));
    return NextResponse.json({
      sites,
      queuedCount,
      limit: DAILY_SEND_LIMIT,
      remaining: Math.max(0, DAILY_SEND_LIMIT - queuedCount),
      batch,
    });
  }

  if (body.action === "skip-site") {
    await updateSiteStatus(body.siteId, "skipped");
    return NextResponse.json({ ok: true });
  }

  if (body.action === "queue-site") {
    const queuedCount = await countQueuedForDate(body.batchDate);
    if (queuedCount >= DAILY_SEND_LIMIT) {
      return NextResponse.json(
        { error: "daily_limit", limit: DAILY_SEND_LIMIT, queuedCount },
        { status: 409 }
      );
    }
    await updateSiteStatus(body.siteId, "queued");
    const batchDate = body.batchDate || new Date().toISOString().slice(0, 10);
    const nextCount = await countQueuedForDate(batchDate);
    await upsertBatchPlan({ batchDate, queuedCount: nextCount });
    return NextResponse.json({ ok: true, queuedCount: nextCount, limit: DAILY_SEND_LIMIT });
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
