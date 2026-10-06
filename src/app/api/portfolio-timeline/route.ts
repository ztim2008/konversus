import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/auth/session";
import { createEntry, listEntries, PortfolioInputError } from "@/lib/portfolio-timeline/queries";
import { notifyGroupOnPublish } from "@/lib/portfolio-timeline/telegram";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof PortfolioInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error("portfolio-timeline", error instanceof Error ? error.message : "error");
  return NextResponse.json({ error: "Не получилось выполнить запрос" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin();
    const cursor = new URL(request.url).searchParams.get("cursor");
    const page = await listEntries({ includeDrafts: Boolean(admin), cursor });
    return NextResponse.json(page);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Нужна сессия" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      title?: unknown;
      description?: unknown;
      published?: unknown;
      mediaIds?: unknown;
    };
    const entry = await createEntry(body);
    const telegram = await notifyGroupOnPublish(entry);
    return NextResponse.json({ entry, telegram });
  } catch (error) {
    return errorResponse(error);
  }
}
