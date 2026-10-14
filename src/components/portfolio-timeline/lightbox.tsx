"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ZoomIn, ZoomOut } from "lucide-react";

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
  const [expanded, setExpanded] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const suppressClose = useRef(false);

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

  useEffect(() => {
    setExpanded(false);
    scroller.current?.scrollTo(0, 0);
  }, [index]);

  if (!item || typeof document === "undefined") return null;

  function step(direction: -1 | 1) {
    onIndex((index + direction + media.length) % media.length);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    suppressClose.current = false;
    gesture.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start) return;
    if (Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8) suppressClose.current = true;
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    gesture.current = null;
    if (!start || media.length < 2) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy)) return;
    step(dx > 0 ? -1 : 1);
  }

  function onBackdropClick() {
    if (suppressClose.current) return;
    onClose();
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр изображения"
      className="fixed inset-0 z-[1100] bg-black"
    >
      <div
        ref={scroller}
        className={expanded ? "h-dvh overflow-y-auto overscroll-contain" : "flex h-dvh items-center justify-center overflow-hidden px-4 py-16"}
        onClick={onBackdropClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          gesture.current = null;
        }}
      >
        <div className={expanded ? "flex min-h-full items-center" : "contents"}>
          <img
            src={item.lightboxUrl}
            alt={item.alt}
            width={item.width}
            height={item.height}
            draggable={false}
            className={
              expanded
                ? "block h-auto w-full"
                : "max-h-[calc(100dvh-6rem)] max-w-[calc(100vw-2rem)] object-contain"
            }
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      </div>
      <p className="pointer-events-none fixed top-5 left-5 z-20 text-sm text-white/80">
        {index + 1} / {media.length}
      </p>
      {media.length > 1 ? (
        <>
          <button
            type="button"
            className="fixed top-1/2 left-3 z-20 -translate-y-1/2 px-3 py-2 text-2xl text-white"
            aria-label="Предыдущее изображение"
            onClick={() => step(-1)}
          >
            ←
          </button>
          <button
            type="button"
            className="fixed top-1/2 right-3 z-20 -translate-y-1/2 px-3 py-2 text-2xl text-white"
            aria-label="Следующее изображение"
            onClick={() => step(1)}
          >
            →
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="fixed top-5 right-20 z-20 flex h-12 w-12 items-center justify-center bg-black text-white"
        aria-pressed={expanded}
        aria-label={expanded ? "Показать целиком" : "Смотреть на всю ширину"}
        onClick={() => {
          setExpanded((value) => !value);
          scroller.current?.scrollTo(0, 0);
        }}
      >
        {expanded ? <ZoomOut size={22} strokeWidth={1.75} aria-hidden="true" /> : <ZoomIn size={22} strokeWidth={1.75} aria-hidden="true" />}
      </button>
      <button
        type="button"
        className="fixed top-5 right-5 z-20 flex h-12 w-12 items-center justify-center bg-black text-3xl leading-none text-white"
        aria-label="Закрыть"
        onClick={onClose}
      >
        ×
      </button>
    </div>,
    document.body,
  );
}
