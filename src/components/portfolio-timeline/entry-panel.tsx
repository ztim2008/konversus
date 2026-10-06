"use client";

import { useMemo, useState } from "react";

import type { PortfolioEntry, PortfolioMedia } from "@/lib/portfolio-timeline/types";
import { formatPortfolioDate } from "@/lib/portfolio-timeline/dates";

import { BentoGrid } from "./bento";
import { MiniEditor } from "./mini-editor";

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || "Не получилось сохранить";
}

export function EntryPanel({
  initial,
  onClose,
  onSaved,
}: {
  initial: PortfolioEntry | null;
  onClose: () => void;
  onSaved: (entry: PortfolioEntry) => void;
}) {
  const originalIds = useMemo(() => new Set(initial?.media.map((item) => item.id) ?? []), [initial]);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [media, setMedia] = useState<PortfolioMedia[]>(initial?.media ?? []);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  async function discard(ids: string[]) {
    const pending = ids.filter((id) => !originalIds.has(id));
    if (pending.length === 0) return;
    await fetch("/api/portfolio-timeline/media/discard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: pending }),
    });
  }

  async function uploadFiles(list: FileList | File[]) {
    const files = [...list].filter((file) => file.type.startsWith("image/"));
    const room = 12 - media.length;
    if (room <= 0) {
      setError("Не больше 12 изображений");
      return;
    }
    const batch = files.slice(0, room);
    if (files.length > room) setError("Не больше 12 изображений");
    else setError("");

    setBusy(true);
    try {
      for (const file of batch) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/portfolio-timeline/upload", { method: "POST", body });
        if (!response.ok) throw new Error(await readError(response));
        const payload = (await response.json()) as { media: PortfolioMedia[] };
        const uploaded = payload.media ?? [];
        setMedia((current) => [...current, ...uploaded].slice(0, 12));
        setSessionIds((current) => [...current, ...uploaded.map((item) => item.id)]);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить изображение");
    } finally {
      setBusy(false);
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= media.length || from === to) return;
    setMedia((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function removeAt(index: number) {
    const item = media[index];
    setMedia((current) => current.filter((entry) => entry.id !== item.id));
    if (!originalIds.has(item.id)) {
      setSessionIds((current) => current.filter((id) => id !== item.id));
      await discard([item.id]);
    }
  }

  async function cancel() {
    setBusy(true);
    await discard(sessionIds);
    onClose();
  }

  async function save(published: boolean) {
    setError("");
    if (!title.trim()) {
      setError("Нужен заголовок");
      return;
    }
    if (media.length === 0) {
      setError("Добавьте хотя бы одно изображение");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title,
        description,
        published,
        mediaIds: media.map((item) => item.id),
      };
      const response = await fetch(initial ? `/api/portfolio-timeline/${initial.id}` : "/api/portfolio-timeline", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { entry: PortfolioEntry };
      onSaved(data.entry);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не получилось сохранить");
      setBusy(false);
    }
  }

  return (
    <section className="mb-10 border border-[var(--line)] bg-[var(--background)] p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{initial ? "Правка работы" : "Новая работа"}</h2>
        <p className="text-xs text-[var(--muted)]">{initial ? formatPortfolioDate(initial.createdAt) : "Дата подставится сама"}</p>
      </div>

      <label
        className={`mt-4 block border border-dashed px-4 py-8 text-center text-sm text-[var(--muted)] ${over ? "border-[var(--foreground)]" : "border-[var(--line)]"}`}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          void uploadFiles(event.dataTransfer.files);
        }}
      >
        Перетащите изображения или выберите файлы
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="mt-3 block w-full text-sm text-[var(--foreground)]"
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {media.length > 0 ? (
        <ul className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {media.map((item, index) => (
            <li
              key={item.id}
              draggable
              className="w-24 shrink-0"
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", String(index));
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const from = Number(event.dataTransfer.getData("text/plain"));
                if (!Number.isNaN(from)) move(from, index);
              }}
            >
              <img src={item.thumbUrl || item.url} alt="" width={item.width} height={item.height} className="h-20 w-full object-cover" />
              <div className="mt-1 flex justify-between text-[11px] text-[var(--muted)]">
                <button type="button" aria-label="Сдвинуть раньше" onClick={() => move(index, index - 1)}>
                  ←
                </button>
                <button type="button" onClick={() => void removeAt(index)}>
                  Убрать
                </button>
                <button type="button" aria-label="Сдвинуть позже" onClick={() => move(index, index + 1)}>
                  →
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {media.length > 0 ? (
        <div className="mt-4">
          <BentoGrid media={media.map((item, index) => ({ ...item, alt: title.trim() || `Изображение ${index + 1}` }))} onOpen={() => undefined} />
        </div>
      ) : null}

      <label className="mt-5 block text-sm text-[var(--foreground)]">
        Заголовок
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          className="mt-1 w-full border border-[var(--line)] bg-transparent px-3 py-2 text-[var(--foreground)] outline-none"
        />
      </label>

      <div className="mt-4">
        <p className="mb-1 text-sm text-[var(--foreground)]">Описание</p>
        <MiniEditor value={description} onChange={setDescription} />
      </div>

      {error ? <p className="mt-3 text-sm text-[var(--foreground)]">{error}</p> : null}
      {busy ? <p className="mt-3 text-sm text-[var(--muted)]">Сохраняю изображения…</p> : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {initial?.published ? (
          <button
            type="button"
            disabled={busy}
            className="border border-[var(--foreground)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-40"
            onClick={() => void save(true)}
          >
            Сохранить
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            className="border border-[var(--foreground)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-40"
            onClick={() => void save(true)}
          >
            Опубликовать
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          className="border border-[var(--line)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-40"
          onClick={() => void save(false)}
        >
          {initial?.published ? "Снять с публикации" : "Черновик"}
        </button>
        <button type="button" className="px-3 py-2 text-sm text-[var(--muted)]" onClick={() => void cancel()}>
          Закрыть
        </button>
      </div>
    </section>
  );
}
