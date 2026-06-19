import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get("siteId");
  if (siteId) {
    try {
      const db = getDbPool();
      await db.query("UPDATE lead_follow_ups SET opened_at = NOW() WHERE site_id = ? AND opened_at IS NULL ORDER BY sent_at DESC LIMIT 1", [siteId]);
    } catch {}
  }
  // Возвращаем прозрачный пиксель
  return new NextResponse(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"), {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-cache" },
  });
}
