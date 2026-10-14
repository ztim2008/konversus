import { BookOpen, FileText } from "lucide-react";

import type { PortfolioDay, PortfolioMonth } from "@/lib/portfolio-timeline/types";

import { ActivityBar } from "./activity-bar";
import { PROFILE_PHOTO } from "./profile";

export function PortfolioSidebar({
  months,
  monthKey,
  days,
  pendingKey,
  onMonth,
  onDay,
}: {
  months: PortfolioMonth[];
  monthKey: string | null;
  days: PortfolioDay[];
  pendingKey: string | null;
  onMonth: (key: string) => void;
  onDay: (date: string) => void;
}) {
  return (
    <aside className="border-b border-[var(--line)] px-5 py-8 min-[900px]:sticky min-[900px]:top-16 min-[900px]:max-h-[calc(100dvh-4rem)] min-[900px]:w-[280px] min-[900px]:shrink-0 min-[900px]:self-start min-[900px]:overflow-y-auto min-[900px]:border-b-0 min-[900px]:border-r min-[900px]:px-5 min-[900px]:py-4">
      <img
        src={PROFILE_PHOTO}
        alt="Алексей Тимофеев"
        width={640}
        height={640}
        className="mx-auto block h-28 w-28 object-cover min-[900px]:h-24 min-[900px]:w-24"
      />
      <div className="mx-auto mt-4 flex w-full max-w-[220px] flex-col gap-2 min-[900px]:mt-3">
        <a
          href="/resume/aleksey-timofeev.pdf"
          download="Алексей-Тимофеев-резюме.pdf"
          className="flex items-center justify-center gap-2 border border-[var(--foreground)] px-3 py-2 text-[13px] text-[var(--foreground)] min-[900px]:text-[12px]"
        >
          <FileText size={15} strokeWidth={1.75} aria-hidden="true" />
          Скачать
        </a>
        <a
          href="/portfolio/resume"
          className="flex items-center justify-center gap-2 border border-[var(--foreground)] px-3 py-2 text-[13px] text-[var(--foreground)] min-[900px]:text-[12px]"
        >
          <BookOpen size={15} strokeWidth={1.75} aria-hidden="true" />
          Читать
        </a>
      </div>
      <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight text-[var(--foreground)] min-[900px]:mt-3 min-[900px]:text-lg">
        Алексей Тимофеев
      </h1>
      <p className="mt-3 text-center text-sm leading-snug text-[var(--foreground)] min-[900px]:mt-1.5 min-[900px]:text-[12px] min-[900px]:leading-snug">
        AI Engineer / AI Developer
        <br />
        Дизайнер цифровых продуктов и визуального контента
      </p>
      <p className="mx-auto mt-4 max-w-[28ch] text-center text-sm leading-relaxed text-[var(--muted)] min-[900px]:mt-2 min-[900px]:text-[11px] min-[900px]:leading-snug">
        AI, сайты, автоматизация и визуальный контент. Создаю цифровые решения от идеи и архитектуры до работающего продукта.
      </p>
      <a
        href="https://t.me/bilarius"
        className="mt-4 block text-center text-sm text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-4 min-[900px]:mt-2 min-[900px]:text-[12px]"
      >
        Telegram
      </a>

      <div className="mt-6 border-t border-[var(--line)] pt-4">
        <ActivityBar months={months} monthKey={monthKey} days={days} pendingKey={pendingKey} onMonth={onMonth} onDay={onDay} />
      </div>
    </aside>
  );
}
