import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/auth/session";
import { storePortfolioImage } from "@/lib/portfolio-timeline/images";
import { PortfolioInputError } from "@/lib/portfolio-timeline/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Нужна сессия" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const files = formData
    .getAll("files")
    .concat(formData.getAll("file"))
    .filter((item): item is File => item instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "Выберите изображение" }, { status: 400 });
  }
  if (files.length > 12) {
    return NextResponse.json({ error: "Не больше 12 изображений за раз" }, { status: 400 });
  }

  try {
    const media = [];
    for (const file of files) {
      media.push(await storePortfolioImage(file));
    }
    return NextResponse.json({ media });
  } catch (error) {
    if (error instanceof PortfolioInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("portfolio-timeline upload", error instanceof Error ? error.message : "error");
    return NextResponse.json({ error: "Не удалось загрузить изображение" }, { status: 500 });
  }
}
