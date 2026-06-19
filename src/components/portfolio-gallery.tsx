"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, RefreshCw } from "lucide-react";

export function PortfolioGallery() {
  const [images, setImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio?t=" + Date.now());
      const data = await res.json();
      if (Array.isArray(data.images) && data.images.length > 0) {
        setImages(data.images);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") setLightboxIndex(i => i !== null ? (i - 1 + images.length) % images.length : null);
      if (e.key === "ArrowRight") setLightboxIndex(i => i !== null ? (i + 1) % images.length : null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, images.length]);

  if (images.length === 0) return null;

  return (
    <>
      {/* Сетка */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 border border-white/[0.06] rounded-xl overflow-hidden">
        {images.map((img, i) => (
          <button
            key={img}
            onClick={() => setLightboxIndex(i)}
            className={`block border-white/[0.06] bg-black/20 overflow-hidden group relative ${
              (i + 1) % 2 !== 0 ? "sm:[&:not(:nth-child(3n))]:border-r" : ""
            } ${i < images.length - 2 ? "border-b" : ""}`}
          >
            <img
              src={`/portfolio/${encodeURIComponent(img)}`}
              alt={img.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")}
              className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* Кнопка обновить */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchImages}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-400 hover:border-white/20 hover:text-white transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Загрузка..." : "Показать другие работы"}
        </button>
      </div>

      {/* Лайтбокс */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Закрыть */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X size={24} />
          </button>

          {/* Счётчик */}
          <div className="absolute top-4 left-4 z-20 text-sm text-white/60 font-mono">
            {lightboxIndex + 1} / {images.length}
          </div>

          {/* Назад */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? (i - 1 + images.length) % images.length : null); }}
            className="absolute left-4 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <ChevronLeft size={28} />
          </button>

          {/* Изображение */}
          <img
            src={`/portfolio/${encodeURIComponent(images[lightboxIndex])}`}
            alt={images[lightboxIndex]}
            className="max-w-[90vw] max-h-[85vh] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Вперёд */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? (i + 1) % images.length : null); }}
            className="absolute right-4 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      )}
    </>
  );
}
