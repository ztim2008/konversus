"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { PortfolioMedia } from "@/lib/portfolio-timeline/types";

export function Lightbox({
  media,
  index,
  onClose,
  onIndex,
}: {
  media: PortfolioMedia[];
  index: number;
  onClose: () => void;
  onIndex: (index: number) => void;
}) {
  const item = media[index];
  const startX = useRef<number | null>(null);
  const [dragX, setDragX] = useState(0);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onIndex((index + 1) % media.length);
      if (event.key === "ArrowLeft") onIndex((index - 1 + media.length) % media.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [index, media.length, onClose, onIndex]);

  if (!item || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр изображения"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/92 px-4 py-16"
      onClick={onClose}
      onPointerDown={(event) => {
        startX.current = event.clientX;
      }}
      onPointerMove={(event) => {
        if (startX.current === null) return;
        setDragX(event.clientX - startX.current);
      }}
      onPointerUp={() => {
        if (dragX > 48) onIndex((index - 1 + media.length) % media.length);
        if (dragX < -48) onIndex((index + 1) % media.length);
        startX.current = null;
        setDragX(0);
      }}
    >
      <p className="absolute top-5 left-5 z-20 text-sm text-white/80">
        {index + 1} / {media.length}
      </p>
      {media.length > 1 ? (
        <>
          <button
            type="button"
            className="absolute top-1/2 left-3 -translate-y-1/2 px-3 py-2 text-2xl text-white"
            aria-label="Предыдущее изображение"
            onClick={(event) => {
              event.stopPropagation();
              onIndex((index - 1 + media.length) % media.length);
            }}
          >
            ←
          </button>
          <button
            type="button"
            className="absolute top-1/2 right-3 -translate-y-1/2 px-3 py-2 text-2xl text-white"
            aria-label="Следующее изображение"
            onClick={(event) => {
              event.stopPropagation();
              onIndex((index + 1) % media.length);
            }}
          >
            →
          </button>
        </>
      ) : null}
      <img
        src={item.lightboxUrl}
        alt={item.alt}
        width={item.width}
        height={item.height}
        className="z-0 min-h-0 min-w-0 max-h-[86vh] max-w-[92vw] object-contain"
        onClick={(event) => event.stopPropagation()}
        draggable={false}
      />
      <button
        type="button"
        className="absolute top-5 right-5 z-20 flex h-12 w-12 items-center justify-center bg-black text-3xl leading-none text-white"
        aria-label="Закрыть"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        ×
      </button>
    </div>,
    document.body,
  );
}
