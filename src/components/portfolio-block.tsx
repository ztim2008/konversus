"use client";

import { useCallback, useState, useTransition } from "react";

type Props = {
  initialImages: string[];
};

export function PortfolioBlock({ initialImages }: Props) {
  const [images, setImages] = useState(initialImages);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/portfolio?t=" + Date.now());
        const data = await res.json();
        if (Array.isArray(data.images) && data.images.length > 0) {
          setImages(data.images);
        }
      } catch {
        // нет сети — оставляем текущие
      }
    });
  }, []);

  if (images.length === 0) return null;

  return (
    <section className="mt-0 border border-white/10 bg-black/20 p-7 sm:p-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">Портфолио</div>
          <div className="mt-1 text-2xl font-bold text-white">Последние клиенты</div>
          <a
            href="/portfolio"
            className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-400 transition hover:text-indigo-300"
          >
            Сервисы и сайты со скриншотами →
          </a>
        </div>
        <div className="flex items-center gap-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300/60">Более 250+ клиентов</div>
          <button
            type="button"
            onClick={refresh}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 transition hover:border-white/30 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <svg
              className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 8A6 6 0 1 1 8 2" />
              <polyline points="14 2 14 8 8 8" />
            </svg>
            {isPending ? "Загрузка…" : "Обновить"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-0 sm:grid-cols-4">
        {images.map((file) => (
          <div key={file} className="group relative overflow-hidden border border-white/[0.06] bg-black/20">
            <img
              src={`/portfolio/${encodeURIComponent(file)}`}
              alt={file.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")}
              className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
