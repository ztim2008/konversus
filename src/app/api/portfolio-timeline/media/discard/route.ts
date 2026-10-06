import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/auth/session";
import { discardUnattachedMedia } from "@/lib/portfolio-timeline/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Нужна сессия" }, { status: 401 });

  let ids: unknown;
  try {
    const body = (await request.json()) as { ids?: unknown };
    ids = body.ids;
  } catch {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "Некорректные изображения" }, { status: 400 });
  }

  await discardUnattachedMedia(ids);
  return NextResponse.json({ ok: true });
}
