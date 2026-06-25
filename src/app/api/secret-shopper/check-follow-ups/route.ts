import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const pool = getDbPool();
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const [rows] = await pool.execute(
      `SELECT id, domain, name, url, email, phone, status, 
              contacted_at, COALESCE(follow_up_count, 0) as follow_ups
       FROM radar_sites 
       WHERE status = 'contacted' 
         AND contacted_at IS NOT NULL 
         AND contacted_at < ?
       ORDER BY contacted_at ASC`,
      [fiveDaysAgo]
    );

    const overdue = (rows as any[]).map((s: any) => {
      const days = Math.floor((now.getTime() - new Date(s.contacted_at).getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...s,
        daysSinceContact: days,
        needsFollowUp: true,
        followUpTemplate: getFollowUpTemplate(days, s.follow_ups || 0),
      };
    });

    return NextResponse.json({ overdue, count: overdue.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, overdue: [], count: 0 });
  }
}

function getFollowUpTemplate(days: number, count: number): string {
  if (count === 0 && days >= 5 && days < 10) {
    return `Здравствуйте!\n\nХотел уточнить — удалось ли ознакомиться с аудитом сайта?\n\nЕсли нужны уточнения или готовы обсудить — напишите в Telegram @bilarius или позвоните +7 921 201-32-52.\n\nАлексей Тимофеев`;
  }
  if (days >= 10) {
    return `Здравствуйте!\n\nПодготовил новые кейсы по вашей нише — возможно будет интересно.\n\nТакже напоминаю про аудит сайта. Готов обсудить в удобное время.\n\n@bilarius | +7 921 201-32-52\nАлексей Тимофеев`;
  }
  return `Здравствуйте!\n\nНапоминаю о себе. Если актуально — буду рад помочь.\n\n@bilarius | +7 921 201-32-52`;
}
