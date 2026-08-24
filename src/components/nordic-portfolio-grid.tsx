"use client";

import { useMemo, useState } from "react";
import { ExternalLink, X, ArrowLeft, ArrowRight } from "lucide-react";
import type { NordicPortfolioItem } from "@/data/nordic-portfolio";

type Filter = "all" | "product" | "site";

export function NordicPortfolioGrid({ items }: { items: NordicPortfolioItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  const open = lightbox != null ? filtered[lightbox] : null;

  function move(delta: number) {
    if (lightbox == null || filtered.length === 0) return;
    setLightbox((lightbox + delta + filtered.length) % filtered.length);
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {(
          [
            { id: "all", label: "Все" },
            { id: "product", label: "Продукты" },
            { id: "site", label: "Сайты на Nordic" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFilter(f.id);
              setLightbox(null);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === f.id
                ? "bg-indigo-600 text-white"
                : "border border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {filtered.map((item, idx) => (
          <article
            key={item.id}
            className="group overflow-hidden rounded-xl border border-white/[0.06] bg-[#0f172a] transition-colors hover:border-indigo-500/30"
          >
            <button
              type="button"
              onClick={() => setLightbox(idx)}
              className="relative block w-full overflow-hidden border-b border-white/[0.06] text-left"
              aria-label={`Открыть скриншот: ${item.title}`}
            >
              <div className="aspect-[16/10] bg-[#0a0e13]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              </div>
              <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 backdrop-blur">
                {item.tag}
              </span>
            </button>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold leading-snug text-white sm:text-lg">{item.title}</h3>
                <a
                  href={item.url}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-indigo-500/40 hover:text-indigo-300"
                >
                  Открыть <ExternalLink size={12} />
                </a>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.description}</p>
              <p className="mt-3 truncate font-mono text-[11px] text-gray-600">{item.url}</p>
            </div>
          </article>
        ))}
      </div>

      {open && lightbox != null && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          tabIndex={0}
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightbox(null);
            if (e.key === "ArrowRight") move(1);
            if (e.key === "ArrowLeft") move(-1);
          }}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-[#0a0e13]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">{open.title}</p>
                <p className="text-xs text-gray-500">{open.tag}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => move(-1)}
                  className="rounded-lg border border-white/10 p-2 text-gray-300 hover:bg-white/5"
                  aria-label="Предыдущий"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  className="rounded-lg border border-white/10 p-2 text-gray-300 hover:bg-white/5"
                  aria-label="Следующий"
                >
                  <ArrowRight size={16} />
                </button>
                <a
                  href={open.url}
                  target={open.external ? "_blank" : undefined}
                  rel={open.external ? "noopener noreferrer" : undefined}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Сайт
                </a>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="rounded-lg border border-white/10 p-2 text-gray-300 hover:bg-white/5"
                  aria-label="Закрыть"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.image} alt={open.title} className="max-h-[78vh] w-full object-contain object-top" />
          </div>
        </div>
      )}
    </div>
  );
}
