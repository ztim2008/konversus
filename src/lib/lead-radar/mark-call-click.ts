/**
 * Клик «Позвонить» из письма → БД + Telegram (атрибуция лида).
 */
import "server-only";
import {
  bumpBatchCounter,
  getSiteById,
  markCallClicked,
  markReplied,
} from "@/lib/data/lead-radar";
import { getAllSettings } from "@/lib/data/settings";
import { sendReplyNotification } from "@/lib/lead-radar/telegram-digest";
import type { MarkReplyResult } from "@/lib/lead-radar/mark-replied";

function toBatchDate(value: unknown): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const raw = String(value);
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return new Date().toISOString().slice(0, 10);
}

export type MarkCallClickResult = MarkReplyResult & {
  callClickNew?: boolean;
  name?: string;
  phone?: string | null;
  email?: string | null;
  platform?: string | null;
};

export async function markLeadCallClick(params: {
  siteId: string;
  skipTelegram?: boolean;
}): Promise<MarkCallClickResult> {
  const site = await getSiteById(params.siteId);
  if (!site) {
    return { ok: false, error: "site_not_found", status: 404 };
  }

  const callClickNew = await markCallClicked(site.id);
  if (callClickNew) {
    const batchDate = toBatchDate(site.batch_date);
    await bumpBatchCounter(batchDate, "call_click_count");

    const alreadyReplied = site.status === "replied" || site.status === "won";
    if (!alreadyReplied) {
      await markReplied(site.id);
      if (site.batch_date) {
        await bumpBatchCounter(batchDate, "replied_count");
      }
    }
  }

  let telegram: { ok: boolean; error?: string } = { ok: true };
  if (!params.skipTelegram && callClickNew) {
    const settings = await getAllSettings();
    const publicOrigin =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://konversus.ru";
    telegram = await sendReplyNotification({
      botToken: settings.telegram_bot_token,
      chatId: settings.telegram_chat_id,
      name: site.name,
      domain: site.domain,
      platform: site.platform,
      email: site.email,
      source: "call",
      screenshotUrl: site.screenshot_url,
      screenshotPath: site.screenshot_path,
      publicOrigin,
      adminUrl: `${publicOrigin.replace(/\/$/, "")}/dashboard/secret-shopper`,
    });
  }

  return {
    ok: true,
    siteId: site.id,
    domain: site.domain,
    name: site.name,
    email: site.email,
    platform: site.platform,
    callClickNew,
    already: !callClickNew,
    telegram,
  };
}
