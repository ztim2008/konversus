"use client";

import { useEffect, useRef, useState } from "react";

import { formatPortfolioDate } from "@/lib/portfolio-timeline/dates";
import type { PortfolioEntry, PortfolioPage } from "@/lib/portfolio-timeline/types";

import { BentoGrid } from "./bento";
import { EntryPanel } from "./entry-panel";
import { Lightbox } from "./lightbox";

export function TimelineView({
  isAdmin,
  initial,
  loadError,
}: {
  isAdmin: boolean;
  initial: PortfolioPage;
  loadError: boolean;
}) {
  const [entries, setEntries] = useState(initial.entries);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const loadingLock = useRef(false);
  const [panel, setPanel] = useState<PortfolioEntry | null | "new">(null);
  const [lightbox, setLightbox] = useState<{ entryId: string; index: number } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!cursor) return;
    const node = document.getElementById("portfolio-timeline-more");
    if (!node) return;

    const observer = new IntersectionObserver(
      (records) => {
        if (loadingLock.current || !records.some((record) => record.isIntersecting)) return;
        loadingLock.current = true;
        setLoading(true);
        const params = new URLSearchParams({ cursor });
        fetch(`/api/portfolio-timeline?${params.toString()}`)
          .then(async (response) => {
            if (!response.ok) throw new Error("load");
            return (await response.json()) as PortfolioPage;
          })
          .then((page) => {
            setEntries((current) => {
              const seen = new Set(current.map((entry) => entry.id));
              return [...current, ...page.entries.filter((entry) => !seen.has(entry.id))];
            });
            setCursor(page.nextCursor);
          })
          .catch(() => setCursor(null))
          .finally(() => {
            loadingLock.current = false;
            setLoading(false);
          });
      },
      { rootMargin: "400px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor]);

  function saveEntry(entry: PortfolioEntry, isNew: boolean) {
    setEntries((current) => (isNew ? [entry, ...current] : current.map((item) => (item.id === entry.id ? entry : item))));
    setPanel(null);
  }

  async function removeEntry(id: string) {
    const response = await fetch(`/api/portfolio-timeline/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setEntries((current) => current.filter((entry) => entry.id !== id));
    setPendingDelete(null);
    if (panel && panel !== "new" && panel.id === id) setPanel(null);
  }

  const openEntry = lightbox ? entries.find((entry) => entry.id === lightbox.entryId) : null;

  return (
    <div className="min-w-0 flex-1 px-5 py-8 sm:px-8">
      <style>{`
        .pt-copy p { margin: 0 0 0.7em; }
        .pt-copy p:last-child { margin-bottom: 0; }
        .pt-copy a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
      `}</style>

      {isAdmin ? (
        <div className="sticky top-16 z-20 -mx-5 mb-6 flex justify-end bg-[var(--background)] px-5 py-2 sm:-mx-8 sm:px-8">
          <button
            type="button"
            className="border border-[var(--foreground)] px-3 py-2 text-sm text-[var(--foreground)]"
            onClick={() => setPanel("new")}
          >
            + Добавить работу
          </button>
        </div>
      ) : null}

      {isAdmin && panel !== null ? (
        <EntryPanel
          key={panel === "new" ? "new" : panel.id}
          initial={panel === "new" ? null : panel}
          onClose={() => setPanel(null)}
          onSaved={(entry) => saveEntry(entry, panel === "new")}
        />
      ) : null}

      {loadError ? <p className="text-sm text-[var(--muted)]">Лента временно недоступна.</p> : null}

      {!loadError && entries.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Работы появятся здесь.</p>
      ) : null}

      <ol className="space-y-14">
        {entries.map((entry, entryIndex) => (
          <li key={entry.id} className="relative border-l border-[var(--line)] pl-6">
            <span className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full bg-[var(--foreground)]" aria-hidden="true" />
            <p className="text-xs text-[var(--muted)]">{formatPortfolioDate(entry.createdAt)}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{entry.title}</h2>
              {!entry.published ? <span className="text-xs text-[var(--muted)]">Черновик</span> : null}
            </div>
            {entry.description ? (
              <div className="pt-copy mt-3 max-w-[66ch] text-[15px] leading-relaxed text-[var(--muted)]" dangerouslySetInnerHTML={{ __html: entry.description }} />
            ) : null}
            {entry.media.length > 0 ? (
              <div className="mt-5">
                <BentoGrid
                  media={entry.media}
                  priority={entryIndex === 0}
                  onOpen={(index) => setLightbox({ entryId: entry.id, index })}
                />
              </div>
            ) : null}
            {isAdmin ? (
              <div className="mt-3 flex gap-4 text-sm">
                <button type="button" className="text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-4" onClick={() => setPanel(entry)}>
                  Изменить
                </button>
                {pendingDelete === entry.id ? (
                  <>
                    <span className="text-[var(--muted)]">Удалить эту работу?</span>
                    <button type="button" className="text-[var(--foreground)]" onClick={() => void removeEntry(entry.id)}>
                      Да, удалить
                    </button>
                    <button type="button" className="text-[var(--muted)]" onClick={() => setPendingDelete(null)}>
                      Отмена
                    </button>
                  </>
                ) : (
                  <button type="button" className="text-[var(--muted)]" onClick={() => setPendingDelete(entry.id)}>
                    Удалить
                  </button>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      {cursor ? (
        <div id="portfolio-timeline-more" className="h-8">
          {loading ? <p className="pt-4 text-sm text-[var(--muted)]">…</p> : null}
        </div>
      ) : null}

      {openEntry && lightbox ? (
        <Lightbox
          media={openEntry.media}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndex={(index) => setLightbox({ entryId: openEntry.id, index })}
        />
      ) : null}
    </div>
  );
}
