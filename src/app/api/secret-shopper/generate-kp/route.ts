import { NextRequest, NextResponse } from "next/server";
import { generatePersonalizedKP } from "@/lib/lead-agent/ai-composer";

export async function POST(req: NextRequest) {
  const { domain, issues, niche, city, contactName, cms } = await req.json();
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });

  try {
    const kp = await generatePersonalizedKP({
      domain,
      niche: niche || "бизнес",
      cms: cms || "",
      city: city || "",
      issues: issues || [],
      contactName: contactName || "",
    });

    return NextResponse.json({ kp, source: "ai" });
  } catch (err: any) {
    console.error("[generate-kp] AI error:", err.message);

    // Fallback: шаблонное КП если AI недоступен
    return NextResponse.json({
      kp: `Здравствуйте!\n\nПроверил ваш сайт ${domain}. Нашёл: ${(issues || []).join(", ") || "мелкие недочёты"}.\n\nГотов исправить за 2-3 дня. Портфолио: behance.net/timofeev_aleksey\n\n@bilarius | +7 921 201-32-52`,
      source: "fallback",
    });
  }
}
