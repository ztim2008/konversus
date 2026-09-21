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
import { enqueueUrlToQueue } from "@/lib/lead-radar/enqueue-url";
import { collectDayFacts } from "@/lib/lead-radar/daily-report";
import {
  DAILY_QUEUE_LIMIT,
  DAILY_REPORT_HOUR_MSK,
  estimateUsd,
  formatBatchDateRu,
  getDailyQueueLimit,
  getDailySendLimit,
  getAutoSendEnabled,
  getAutoSendIntervalMin,
  getCollectPerTick,
  getManualRespectsLimit,
  countSentForBatchDate,
  saveRadarRuntimeSettings,
} from "@/lib/lead-radar/config";
import { getRouletteAdminState } from "@/lib/lead-radar/day-picker";
import {
  GEO_CITIES_V1,
  findCityByName,
  getVertical,
} from "@/lib/lead-radar-geo";
import { getSetting } from "@/lib/data/settings";

export const maxDuration = 300;

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
    const limit = await getDailyQueueLimit();
    const sendLimit = await getDailySendLimit();
    const autoSendEnabled = await getAutoSendEnabled();
    const today = new Date().toISOString().slice(0, 10);
    const dateKey = batchDate || today;
    const batch = await getBatchByDate(dateKey);
    const sentToday = await countSentForBatchDate(dateKey);
    const lastCityId = await getSetting("lead_radar_last_city_id");
    const lastNiche = await getSetting("lead_radar_last_niche");
    const lastVertical = await getSetting("lead_radar_last_vertical");
    const cityFromSettings =
      GEO_CITIES_V1.find((c) => c.id === lastCityId)?.name ||
      findCityByName(lastCityId)?.name ||
      "";
    const first = sites[0] as
      | { radar_city?: string; radar_niche?: string }
      | undefined;
    const verticalLabel = getVertical(lastVertical)?.labelRu || "";
    return NextResponse.json({
      sites,
      queuedCount,
      limit,
      sendLimit,
      sentToday,
      autoSendEnabled,
      remaining: Math.max(0, limit - queuedCount),
      remainingSend: Math.max(0, sendLimit - sentToday),
      batch,
      batchDate: dateKey,
      dayPlan: {
        city: first?.radar_city || cityFromSettings || "",
        niche: first?.radar_niche || lastNiche || "",
        vertical: verticalLabel,
        verticalId: lastVertical || "",
      },
    });
  }

  if (body.action === "list-batches") {
    const limit = typeof body.limit === "number" ? body.limit : 30;
    const batches = await listBatches(limit);
    const tokensAll = await sumBatchTokens();
    const today = new Date().toISOString().slice(0, 10);
    const live = await collectDayFacts(body.batchDate || today);
    const dailyQueueLimit = await getDailyQueueLimit();
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
        dailyQueueLimit,
        dailySendLimit: await getDailySendLimit(),
        autoSendEnabled: await getAutoSendEnabled(),
        dailyReportHourMsk: DAILY_REPORT_HOUR_MSK,
        defaultDailyQueueLimit: DAILY_QUEUE_LIMIT,
      },
    });
  }

  if (body.action === "get-roulette-settings") {
    const [
      state,
      dailyQueueLimit,
      dailySendLimit,
      autoSendEnabled,
      manualRespectsLimit,
      autoSendIntervalMin,
      collectPerTick,
    ] = await Promise.all([
      getRouletteAdminState(),
      getDailyQueueLimit(),
      getDailySendLimit(),
      getAutoSendEnabled(),
      getManualRespectsLimit(),
      getAutoSendIntervalMin(),
      getCollectPerTick(),
    ]);
    return NextResponse.json({
      ok: true,
      dailyQueueLimit,
      dailySendLimit,
      autoSendEnabled,
      manualRespectsLimit,
      autoSendIntervalMin,
      collectPerTick,
      cities: GEO_CITIES_V1,
      ...state,
      help: {
        skipFreesSlot: true,
        sendFreesSlot: true,
        note:
          "Спокойный темп: сбор ~2 КП / 30 мин (DeepSeek) · отправка 1 / 15 или 30 мин · окно 09–21 МСК. Лимит 40 — потолок.",
      },
    });
  }

  if (body.action === "save-roulette-settings") {
    const weights =
      body.weights && typeof body.weights === "object"
        ? (body.weights as Record<string, number>)
        : undefined;
    const saved = await saveRadarRuntimeSettings({
      dailyQueueLimit:
        typeof body.dailyQueueLimit === "number"
          ? body.dailyQueueLimit
          : undefined,
      dailySendLimit:
        typeof body.dailySendLimit === "number"
          ? body.dailySendLimit
          : undefined,
      autoSendEnabled:
        typeof body.autoSendEnabled === "boolean"
          ? body.autoSendEnabled
          : undefined,
      manualRespectsLimit:
        typeof body.manualRespectsLimit === "boolean"
          ? body.manualRespectsLimit
          : undefined,
      autoSendIntervalMin:
        typeof body.autoSendIntervalMin === "number"
          ? body.autoSendIntervalMin
          : undefined,
      collectPerTick:
        typeof body.collectPerTick === "number"
          ? body.collectPerTick
          : undefined,
      weights,
    });
    const state = await getRouletteAdminState();
    return NextResponse.json({ ok: true, ...saved, ...state });
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
    const result = await skipQueuedLead({
      siteId: body.siteId,
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

  if (body.action === "enqueue-url") {
    const url = typeof body.url === "string" ? body.url : "";
    if (!url.trim()) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }
    const result = await enqueueUrlToQueue({
      url,
      city: typeof body.city === "string" ? body.city : undefined,
      niche: typeof body.niche === "string" ? body.niche : undefined,
      name: typeof body.name === "string" ? body.name : undefined,
      force: !!body.force,
      skipTelegram: !!body.skipTelegram,
      skipScreenshot: !!body.skipScreenshot,
    });
    if (!result.ok) {
      const status =
        result.reason === "duplicate"
          ? 409
          : result.reason === "bad_url"
            ? 400
            : 422;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  if (body.action === "queue-site") {
    const limit = await getDailyQueueLimit();
    const queuedCount = await countQueuedForDate(body.batchDate);
    if (queuedCount >= limit) {
      return NextResponse.json(
        { error: "daily_limit", limit, queuedCount },
        { status: 409 }
      );
    }
    await updateSiteStatus(body.siteId, "queued");
    const batchDate = body.batchDate || new Date().toISOString().slice(0, 10);
    const nextCount = await countQueuedForDate(batchDate);
    await upsertBatchPlan({ batchDate, queuedCount: nextCount });
    return NextResponse.json({ ok: true, queuedCount: nextCount, limit });
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
