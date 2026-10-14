import type { PortfolioVideo } from "@/lib/portfolio-timeline/video";

export function VideoFrame({ video }: { video: PortfolioVideo }) {
  const tall = video.layout === "tall";

  return (
    <div
      className={`relative w-full overflow-hidden bg-[var(--surface)] ${tall ? "max-w-[22rem]" : ""}`}
      style={{ aspectRatio: tall ? "9 / 16" : "16 / 9" }}
    >
      <iframe
        src={video.embedUrl}
        title="Видео"
        className="absolute inset-0 h-full w-full border-0"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
