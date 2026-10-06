import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/auth/session";
import { deleteEntry, PortfolioInputError, updateEntry } from "@/lib/portfolio-timeline/queries";
import { notifyGroupOnPublish } from "@/lib/portfolio-timeline/telegram";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof PortfolioInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error("portfolio-timeline", error instanceof Error ? error.message : "error");
  return NextResponse.json({ error: "Не получилось выполнить запрос" }, { status: 500 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Нужна сессия" }, { status: 401 });

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: unknown;
      description?: unknown;
      published?: unknown;
      mediaIds?: unknown;
    };
    const entry = await updateEntry(id, body);
    if (!entry) return NextResponse.json({ error: "Работа не найдена" }, { status: 404 });
    const telegram = await notifyGroupOnPublish(entry);
    return NextResponse.json({ entry, telegram });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Нужна сессия" }, { status: 401 });

  try {
    const { id } = await context.params;
    const removed = await deleteEntry(id);
    if (!removed) return NextResponse.json({ error: "Работа не найдена" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
