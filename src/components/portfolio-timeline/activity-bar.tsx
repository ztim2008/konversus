"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { monthLabel, moscowTodayKey, parseMonthKey, WEEKDAYS, worksLabel } from "@/lib/portfolio-timeline/dates";
import type { PortfolioDay, PortfolioMonth } from "@/lib/portfolio-timeline/types";

function monthGrid(key: string) {
  const parsed = parseMonthKey(key);
  if (!parsed) return null;
  const first = new Date(Date.UTC(parsed.year, parsed.month - 1, 1));
  return {
    lead: (first.getUTCDay() + 6) % 7,
    count: new Date(Date.UTC(parsed.year, parsed.month, 0)).getUTCDate(),
    year: parsed.year,
    month: parsed.month,
  };
}

function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function ActivityBar({
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
  const highlight = pendingKey ?? monthKey;
  const grid = monthKey ? monthGrid(monthKey) : null;
  if (!months.length || !grid || !monthKey) return null;

  const byDate = new Map(days.map((day) => [day.date, day]));
  const monthIndex = months.findIndex((month) => month.key === highlight);
  const newer = monthIndex > 0 ? months[monthIndex - 1] : null;
  const older = monthIndex >= 0 && monthIndex < months.length - 1 ? months[monthIndex + 1] : null;
  const today = moscowTodayKey();
  const cells = [
    ...Array.from({ length: grid.lead }, (_, index) => ({ kind: "pad" as const, key: `pad-${index}` })),
    ...Array.from({ length: grid.count }, (_, index) => ({ kind: "day" as const, day: index + 1, key: `day-${index + 1}` })),
  ];

  return (
    <div className="min-w-0 w-full">
      <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Месяцы">
        {months.map((month) => {
          const selected = month.key === highlight;
          return (
            <button
              key={month.key}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`shrink-0 border px-2.5 py-1 text-[13px] ${selected ? "border-[var(--foreground)] text-[var(--foreground)]" : "border-[var(--line)] text-[var(--muted)]"}`}
              onClick={() => onMonth(month.key)}
            >
              {month.label} · {month.count}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center text-[var(--foreground)] disabled:text-[var(--line)]"
          aria-label="Предыдущий месяц"
          disabled={!older || Boolean(pendingKey)}
          onClick={() => older && onMonth(older.key)}
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
        </button>
        <p className="whitespace-nowrap text-[13px] text-[var(--foreground)]">
          {monthLabel(monthKey)} {grid.year}
        </p>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center text-[var(--foreground)] disabled:text-[var(--line)]"
          aria-label="Следующий месяц"
          disabled={!newer || Boolean(pendingKey)}
          onClick={() => newer && onMonth(newer.key)}
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((label) => (
          <div key={label} className="pb-1 text-center text-[11px] text-[var(--muted)]">
            {label}
          </div>
        ))}
        {cells.map((cell) => {
          if (cell.kind === "pad") return <div key={cell.key} />;
          const date = dayKey(grid.year, grid.month, cell.day);
          const info = byDate.get(date);
          const isToday = date === today;
          if (!info) {
            return (
              <div key={cell.key} className={`flex h-8 items-center justify-center text-[11px] text-[var(--muted)] ${isToday ? "border border-[var(--accent)]" : ""}`}>
                {cell.day}
              </div>
            );
          }
          return (
            <button
              key={cell.key}
              type="button"
              className={`relative flex h-8 items-center justify-center overflow-hidden border text-[11px] text-[var(--foreground)] ${isToday ? "border-[var(--accent)]" : "border-[var(--line)]"}`}
              aria-label={`${cell.day} ${monthLabel(monthKey)}, ${worksLabel(info.count)}`}
              onClick={() => onDay(date)}
            >
              {info.thumbUrl ? <img src={info.thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
              <span className={info.thumbUrl ? "relative bg-[var(--background)]/75 px-1" : "relative"}>{cell.day}</span>
              {info.count > 1 ? <span className="relative ml-0.5 text-[10px] text-[var(--accent)]">{info.count}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
