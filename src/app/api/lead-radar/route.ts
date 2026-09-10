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
  listBatches,
  sumBatchTokens,
} from "@/lib/data/lead-radar";
import { sendQueuedLead, skipQueuedLead } from "@/lib/lead-radar/send-queued";
import { markLeadReplied } from "@/lib/lead-radar/mark-replied";
import { collectDayFacts } from "@/lib/lead-radar/daily-report";
import {
  DAILY_QUEUE_LIMIT,
  DAILY_REPORT_HOUR_MSK,
  estimateUsd,
  formatBatchDateRu,
} from "@/lib/lead-radar/config";

const DAILY_SEND_LIMIT = DAILY_QUEUE_LIMIT;

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
    const today = new Date().toISOString().slice(0, 10);
    const batch = await getBatchByDate(batchDate || today);
    return NextResponse.json({
      sites,
      queuedCount,
      limit: DAILY_SEND_LIMIT,
      remaining: Math.max(0, DAILY_SEND_LIMIT - queuedCount),
      batch,
      batchDate: batchDate || today,
    });
  }

  if (body.action === "list-batches") {
    const limit = typeof body.limit === "number" ? body.limit : 30;
    const batches = await listBatches(limit);
    const tokensAll = await sumBatchTokens();
    const today = new Date().toISOString().slice(0, 10);
    const live = await collectDayFacts(body.batchDate || today);
    const rows = batches.map((b: any) => {
      let dateIso: string;
      if (b.batch_date instanceof Date) {
        const d = b.batch_date;
        dateIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      } else {
        dateIso = String(b.batch_date).slice(0, 10);
      }
      const tokens = Number(b.tokens_total || 0);
      return {
        ...b,
        batch_date: dateIso,
        batch_date_ru: formatBatchDateRu(dateIso),
        tokens_total: tokens,
        usd_estimate: estimateUsd(tokens),
        report_sent: !!b.report_sent_at,
      };
    });
    return NextResponse.json({
      ok: true,
      batches: rows,
      tokensAll,
      usdAll: estimateUsd(tokensAll),
      live,
      liveUsd: estimateUsd(live.tokens),
      config: {
        dailyQueueLimit: DAILY_QUEUE_LIMIT,
        dailyReportHourMsk: DAILY_REPORT_HOUR_MSK,
      },
    });
  }

  if (body.action === "send-queued") {
    if (!body.siteId) {
      return NextResponse.json({ error: "siteId required" }, { status: 400 });
    }
    const result = await sendQueuedLead({
      siteId: body.siteId,
      testMode: !!body.testMode,
      skipTelegram: !!body.skipTelegram,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      );
    }
    return NextResponse.json(result);
  }

  if (body.action === "skip-site") {
    if (!body.siteId) {
      return NextResponse.json({ error: "siteId required" }, { status: 400 });
    }
    const result = await skipQueuedLead(body.siteId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      );
    }
    return NextResponse.json(result);
  }

  if (body.action === "mark-replied") {
    if (!body.siteId) {
      return NextResponse.json({ error: "siteId required" }, { status: 400 });
    }
    const result = await markLeadReplied({
      siteId: body.siteId,
      source: "manual",
      skipTelegram: !!body.skipTelegram,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      );
    }
    return NextResponse.json(result);
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
