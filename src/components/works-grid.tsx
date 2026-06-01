"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";

const FALLBACK_COLORS = [
  "linear-gradient(135deg,#0d1116,#1a2130)",
  "linear-gradient(135deg,#101820,#0a1420)",
  "linear-gradient(135deg,#12100e,#1c1510)",
  "linear-gradient(135deg,#0e1218,#101c28)",
  "linear-gradient(135deg,#0a0e12,#181e26)",
];

const BENTO_PATTERN: Array<"large" | "wide" | "tall" | "normal"> = [
  "large",
  "normal",
  "normal",
  "tall",
  "wide",
];

function getTileClass(index: number) {
  const pattern = BENTO_PATTERN[index % BENTO_PATTERN.length];
  switch (pattern) {
    case "large": return "col-span-2 row-span-2";
    case "wide":  return "col-span-2 row-span-1";
    case "tall":  return "col-span-1 row-span-2";
    default:      return "col-span-1 row-span-1";
  }
}

export type WorkItem = {
  id: string;
  title: string;
  headline: string | null;
  cover: string | null;
  href: string;
};

type Props = {
  initialItems: WorkItem[];
  initialTotal: number;
};

export function WorksGrid({ initialItems, initialTotal }: Props) {
  const [items, setItems] = useState<WorkItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [isPending, startTransition] = useTransition();

  const hasMore = items.length < total;

  const loadMore = useCallback(() => {
    startTransition(async () => {
      const res = await fetch(`/api/works?offset=${items.length}`);
      const data = await res.json();
      setItems((prev) => [...prev, ...data.items]);
      setTotal(data.total);
    });
  }, [items.length]);

  return (
    <>
      <div className="grid auto-rows-[280px] grid-cols-2 gap-0 sm:auto-rows-[320px] lg:grid-cols-4 lg:auto-rows-[300px]">
        {items.map(({ id, title, headline, cover, href }, index) => {
          const bgStyle = cover
            ? { backgroundImage: `linear-gradient(180deg, rgba(8,12,18,0.10) 0%, rgba(8,12,18,0.72) 100%), url(${JSON.stringify(cover)})` }
            : { background: FALLBACK_COLORS[index % FALLBACK_COLORS.length] };

          return (
            <Link
              key={id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${getTileClass(index)} group relative overflow-hidden border border-white/[0.07] bg-black/30`}
            >
              {/* Фон */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={bgStyle}
              />
              {/* Оверлей при hover */}
              <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
              {/* Нижний градиент */}
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent" />

              {/* Контент */}
              <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6">
                <div className="relative z-10">
                  <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-amber-300/70">
                    Концепт
                  </div>
                  <h2 className="text-base font-bold leading-tight text-white sm:text-lg">
                    {title}
                  </h2>
                  {headline && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                      {headline}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500 transition-colors duration-200 group-hover:text-amber-300/80">
                    <span>Открыть</span>
                    <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 10L10 2M10 2H5M10 2v5" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Показать ещё ── */}
      {hasMore && (
        <div className="mt-0 flex items-center justify-center border border-white/[0.07] border-t-0 py-8">
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            className="flex items-center gap-2 border border-white/15 bg-white/5 px-8 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-300 transition hover:border-amber-200/30 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            {isPending ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 8A6 6 0 1 1 8 2" />
                  <polyline points="14 2 14 8 8 8" />
                </svg>
                Загрузка…
              </>
            ) : (
              <>
                Показать ещё
                <span className="text-amber-300/60">· {total - items.length}</span>
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}
