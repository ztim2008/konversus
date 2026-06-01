import { readdirSync } from "node:fs";

import { NextResponse } from "next/server";

const PORTFOLIO_DIR = "/var/www/www-root/data/www/konversus.ru/portfolio";
const COUNT = 8;

export function GET() {
  try {
    const files = readdirSync(PORTFOLIO_DIR).filter((f) =>
      /\.(jpg|jpeg|png|webp)$/i.test(f)
    );
    for (let i = files.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [files[i], files[j]] = [files[j], files[i]];
    }
    return NextResponse.json({ images: files.slice(0, COUNT) });
  } catch {
    return NextResponse.json({ images: [] });
  }
}
