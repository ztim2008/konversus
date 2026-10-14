"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { formatPortfolioDate } from "@/lib/portfolio-timeline/dates";
import type { PortfolioEntry, PortfolioPage } from "@/lib/portfolio-timeline/types";

import { BentoGrid } from "./bento";
import { EntryPanel } from "./entry-panel";
import { Lightbox } from "./lightbox";
import { VideoFrame } from "./video-frame";

function WorkBlock({
  entry,
  entryIndex,
  isAdmin,
  pendingDelete,
  onOpen,
  onEdit,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  entry: PortfolioEntry;
  entryIndex: number;
  isAdmin: boolean;
  pendingDelete: string | null;
  onOpen: (index: number) => void;
  onEdit: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [phase, setPhase] = useState<"idle" | "hold" | "in">("idle");
  const [delay, setDelay] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("in");
      return;
    }

    const rise = (stagger: boolean) => {
      if (stagger) {
        const top = node.getBoundingClientRect().top;
        const slot = Math.max(0, Math.min(2, Math.round(top / 280)));
        setDelay(slot * 70);
      }
      setPhase("in");
    };

    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.55 && rect.bottom > 48) {
      rise(true);
      return;
    }

    setPhase("hold");
    const observer = new IntersectionObserver(
      (records) => {
        if (!records.some((record) => record.isIntersecting)) return;
        rise(false);
        observer.disconnect();
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <li
      ref={ref}
      id={entry.id}
      className={`pt-work relative border-l border-[var(--line)] pl-6 ${phase === "hold" ? "is-hold" : ""} ${phase === "in" ? "is-in" : ""}`}
      style={phase === "in" && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <span className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full bg-[var(--foreground)]" aria-hidden="true" />
      <p className="text-xs text-[var(--muted)]">{formatPortfolioDate(entry.createdAt)}</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{entry.title}</h2>
        {!entry.published ? <span className="text-xs text-[var(--muted)]">Черновик</span> : null}
      </div>
      {entry.description ? (
        <div className="pt-copy mt-3 max-w-[66ch] text-[15px] leading-relaxed text-[var(--muted)]" dangerouslySetInnerHTML={{ __html: entry.description }} />
      ) : null}
      {entry.video ? (
        <div className="mt-5">
          <VideoFrame video={entry.video} />
        </div>
      ) : null}
      {entry.media.length > 0 ? (
        <div className="mt-5">
          <BentoGrid media={entry.media} priority={entryIndex === 0} onOpen={onOpen} />
        </div>
      ) : null}
      {isAdmin ? (
        <div className="mt-3 flex gap-4 text-sm">
          <button type="button" className="text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-4" onClick={onEdit}>
            Изменить
          </button>
          {pendingDelete === entry.id ? (
            <>
              <span className="text-[var(--muted)]">Удалить эту работу?</span>
              <button type="button" className="text-[var(--foreground)]" onClick={onConfirmDelete}>
                Да, удалить
              </button>
              <button type="button" className="text-[var(--muted)]" onClick={onCancelDelete}>
                Отмена
              </button>
            </>
          ) : (
            <button type="button" className="text-[var(--muted)]" onClick={onAskDelete}>
              Удалить
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}

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
  const [notice, setNotice] = useState("");

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
        .pt-work.is-hold { opacity: 0; transform: translateY(36px); }
        .pt-work.is-in { animation: pt-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes pt-rise {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pt-work.is-hold, .pt-work.is-in { opacity: 1; transform: none; animation: none; }
        }
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
          onSaved={(entry, telegram) => {
            saveEntry(entry, panel === "new");
            if (telegram?.ok) setNotice("Ушло в канал и в группу");
            else if (telegram && !telegram.ok) {
              setNotice(`${telegram.error || "В группу не отправилось"}. Откройте работу и нажмите «Сохранить» ещё раз.`);
            } else setNotice("");
          }}
        />
      ) : null}

      {notice ? <p className="mb-6 text-sm text-[var(--muted)]">{notice}</p> : null}

      {loadError ? <p className="text-sm text-[var(--muted)]">Лента временно недоступна.</p> : null}

      {!loadError && entries.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Работы появятся здесь.</p>
      ) : null}

      <ol className="space-y-14">
        {entries.map((entry, entryIndex) => (
          <WorkBlock
            key={entry.id}
            entry={entry}
            entryIndex={entryIndex}
            isAdmin={isAdmin}
            pendingDelete={pendingDelete}
            onOpen={(index) => setLightbox({ entryId: entry.id, index })}
            onEdit={() => setPanel(entry)}
            onAskDelete={() => setPendingDelete(entry.id)}
            onConfirmDelete={() => void removeEntry(entry.id)}
            onCancelDelete={() => setPendingDelete(null)}
          />
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
