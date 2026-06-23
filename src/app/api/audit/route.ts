import { NextRequest, NextResponse } from "next/server";
import { scanWebsite } from "@/lib/auditor/scanner";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });
  const result = await scanWebsite(url);
  return NextResponse.json(result);
}
