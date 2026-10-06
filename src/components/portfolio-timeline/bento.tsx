"use client";

import type { PortfolioMedia } from "@/lib/portfolio-timeline/types";

function clampRatio(width: number, height: number) {
  if (!width || !height) return 1.4;
  return Math.min(1.9, Math.max(0.62, width / height));
}

export function BentoGrid({
  media,
  onOpen,
  priority = false,
}: {
  media: PortfolioMedia[];
  onOpen: (index: number) => void;
  priority?: boolean;
}) {
  const count = media.length;
  const columns = count === 1 ? "grid-cols-1" : count >= 5 ? "grid-cols-2 min-[720px]:grid-cols-4" : "grid-cols-2";

  return (
    <div className={`grid gap-1.5 ${columns}`}>
      {media.map((item, index) => {
        const heroOfThree = count === 3 && index === 0;
        const lead = count >= 5 && index === 0;
        const eager = priority && index === 0;

        return (
          <button
            key={item.id}
            type="button"
            className={`relative block w-full overflow-hidden bg-[var(--surface)] text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${heroOfThree ? "row-span-2 min-h-48" : ""} ${lead ? "col-span-2" : ""}`}
            style={heroOfThree ? undefined : { aspectRatio: String(clampRatio(item.width, item.height)) }}
            onClick={() => onOpen(index)}
          >
            <img
              src={item.url}
              alt={item.alt}
              width={item.width}
              height={item.height}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </button>
        );
      })}
    </div>
  );
}
