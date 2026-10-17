import Link from "next/link";

import {
  addKeywordsAction,
  addNoteAction,
  checkNowAction,
  deleteKeywordAction,
  deleteNoteAction,
  deleteProjectAction,
  toggleProjectAction,
} from "@/app/positions/actions";
import { DeleteConfirmButton } from "@/components/dashboard/delete-confirm-button";
import { AutoRefresh } from "@/components/seo-positions/auto-refresh";
import { PositionChart, type ChartMark } from "@/components/seo-positions/position-chart";
import type { SeoNote, SeoProject } from "@/lib/seo-positions/data";
import { timeZoneFor } from "@/lib/seo-positions/tz";
import { depthLabel, type KeywordRow } from "@/lib/seo-positions/view";

export const PERIODS = [7, 30, 90] as const;

function formatter(project: SeoProject) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZoneFor(project.gl),
  });
}

const changeClass: Record<string, string> = {
  up: "text-[var(--accent)]",
  appeared: "text-[var(--accent)]",
  down: "text-[var(--accent-warm)]",
  dropped: "text-[var(--accent-warm)]",
  same: "text-[var(--muted)]",
};

function PositionCell({ row, depth }: { row: KeywordRow; depth: string }) {
  if (row.keyword.checkingSince) return <span className="text-[var(--muted)]">проверяется…</span>;
  if (!row.last) return <span className="text-[var(--muted)]">ещё не проверяли</span>;
  if (row.last.status === "error") {
    return (
      <span className="text-[var(--accent-warm)]" title={row.last.errorText ?? undefined}>
        ошибка проверки
      </span>
    );
  }
  if (row.last.status === "not_found") return <span className="text-[var(--muted)]">нет в {depth}</span>;
  return <span className="font-mono text-base text-[var(--foreground)]">{row.last.position}</span>;
}

type Props = {
  project: SeoProject;
  rows: KeywordRow[];
  notes: SeoNote[];
  selectedId: string | null;
  days: number;
  basePath: string;
  /** Админ или маркетолог с доступом к проекту. */
  canEdit: boolean;
  /** Только админ: удаление, пауза расписания. */
  isOwner: boolean;
  checkingRequested: boolean;
  shareUrl?: string;
};

export function ProjectView({ project, rows, notes, selectedId, days, basePath, canEdit, isOwner, checkingRequested, shareUrl }: Props) {
  const fmt = formatter(project);
  const depth = depthLabel(project);
  const depthNum = project.maxPages * 10;
  const selected = rows.find((r) => r.keyword.id === selectedId) ?? rows[0] ?? null;
  const anyChecking = rows.some((r) => r.keyword.checkingSince);

  const tz = timeZoneFor(project.gl);
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const dateLabel = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const today = localDate.format(new Date());
  const visibleNotes = selected ? notes.filter((n) => !n.keywordId || n.keywordId === selected.keyword.id) : [];
  const historyDates = selected ? selected.history.map((s) => localDate.format(new Date(s.checkedAt))) : [];
  const marks: ChartMark[] = visibleNotes.flatMap((note, i) => {
    const index = historyDates.findIndex((d) => d >= note.date);
    return index >= 0 ? [{ index, n: i + 1 }] : [];
  });

  const lastChecks = rows.map((r) => r.lastOk?.checkedAt).filter((v): v is string => !!v).sort();
  const lastCheck = lastChecks.at(-1);
  const inTop10 = rows.filter((r) => r.lastOk?.position && r.lastOk.position <= 10).length;
  const found = rows.filter((r) => r.lastOk?.status === "found").length;
  const notFound = rows.filter((r) => r.lastOk?.status === "not_found").length;

  const href = (params: { kw?: string; days?: number }) => {
    const q = new URLSearchParams();
    q.set("days", String(params.days ?? days));
    if (params.kw ?? selected?.keyword.id) q.set("kw", params.kw ?? selected!.keyword.id);
    return `${basePath}?${q.toString()}`;
  };

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-24 text-sm text-[var(--foreground)] md:px-6">
      <AutoRefresh active={anyChecking || checkingRequested} />

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div>
          {canEdit && (
            <Link href="/positions" className="text-[var(--muted)] hover:text-[var(--foreground)]">
              ← Все проекты
            </Link>
          )}
          <h1 className="mt-1 text-2xl font-semibold">{project.name}</h1>
          <p className="mt-1 text-[var(--muted)]">
            <span className="font-mono text-[var(--foreground)]">{project.domain}</span> · Google, {project.location} ·
            язык {project.hl} · глубина {depth}
            {!project.isActive && " · проверки по расписанию на паузе"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/positions/s/${project.shareSlug}/report`}
            className="rounded-md border border-[var(--line)] px-4 py-2 hover:bg-[var(--surface-strong)]"
          >
            Отчёт за месяц
          </Link>
          {canEdit && (
            <>
              <form action={checkNowAction}>
                <input type="hidden" name="projectId" value={project.id} />
                <button
                  className="rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-[var(--background)] disabled:opacity-50"
                  disabled={anyChecking}
                >
                  {anyChecking ? "Проверка идёт…" : "Проверить все сейчас"}
                </button>
              </form>
              {isOwner && (
                <form action={toggleProjectAction}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <button className="rounded-md border border-[var(--line)] px-4 py-2 hover:bg-[var(--surface-strong)]">
                    {project.isActive ? "Пауза расписания" : "Включить расписание"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </header>

      <p className="mt-4 text-[var(--muted)]">
        Ключей <b className="font-mono text-[var(--foreground)]">{rows.length}</b> · найден в {depth}:{" "}
        <b className="font-mono text-[var(--foreground)]">{found}</b> · из них в топ-10:{" "}
        <b className="font-mono text-[var(--foreground)]">{inTop10}</b> · не найден:{" "}
        <b className="font-mono text-[var(--foreground)]">{notFound}</b> · последняя проверка:{" "}
        <b className="font-mono text-[var(--foreground)]">{lastCheck ? fmt.format(new Date(lastCheck)) : "—"}</b>
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Место — номер сайта в обычной выдаче Google (без рекламы) в момент проверки, для города из настроек. У каждого
        человека выдача немного своя, поэтому это ориентир, а не гарантия.
      </p>

      {selected && (
        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">
                «{selected.keyword.keyword}»
                {selected.change && (
                  <span className={`ml-2 font-normal ${changeClass[selected.change.kind]}`}>{selected.change.text}</span>
                )}
              </h2>
              <nav className="flex gap-1">
                {PERIODS.map((d) => (
                  <Link
                    key={d}
                    href={href({ days: d })}
                    className={`rounded px-2 py-1 font-mono ${d === days ? "bg-[var(--surface-strong)] text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                  >
                    {d} дн
                  </Link>
                ))}
              </nav>
            </div>
            <PositionChart
              depth={depthNum}
              timeZone={timeZoneFor(project.gl)}
              marks={marks}
              points={selected.history.map((s) => ({ at: s.checkedAt, position: s.position, status: s.status }))}
            />
            <p className="mt-2 text-xs text-[var(--muted)]">
              Линия — место сайта. Крестик внизу — сайта нет в {depth}. Треугольник — проверка не удалась, это не значит
              «не найден». Пунктир с номером — правка на сайте, стоит у первой проверки после неё.
            </p>

            <div className="mt-4 border-t border-[var(--line)] pt-3">
              <h3 className="mb-2 font-medium">Что меняли на сайте</h3>
              {visibleNotes.length === 0 ? (
                <p className="text-[var(--muted)]">За {days} дн отметок нет</p>
              ) : (
                <ol className="space-y-1">
                  {visibleNotes.map((note, i) => (
                    <li key={note.id} className="flex items-baseline gap-3">
                      <span className="w-5 shrink-0 text-right font-mono text-[var(--muted)]">{i + 1}</span>
                      <span className="shrink-0 font-mono text-[var(--muted)]">{dateLabel.format(new Date(`${note.date}T12:00:00Z`))}</span>
                      <span className="min-w-0 flex-1">
                        {note.text}
                        {!note.keywordId && <span className="text-[var(--muted)]"> · все запросы</span>}
                      </span>
                      {canEdit && (
                        <form action={deleteNoteAction}>
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="noteId" value={note.id} />
                          <button className="text-[var(--muted)] hover:text-[var(--accent-warm)]">Удалить</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {canEdit && (
                <form action={addNoteAction} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="projectId" value={project.id} />
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={today}
                    className="rounded-md border border-[var(--line)] bg-[var(--background)] px-2 py-1.5 font-mono"
                  />
                  <select name="keywordId" defaultValue="" className="rounded-md border border-[var(--line)] bg-[var(--background)] px-2 py-1.5">
                    <option value="">все запросы</option>
                    <option value={selected.keyword.id}>только «{selected.keyword.keyword}»</option>
                  </select>
                  <input
                    name="text"
                    required
                    maxLength={300}
                    placeholder="Переписали главную, добавили цены"
                    className="min-w-[220px] flex-1 rounded-md border border-[var(--line)] bg-[var(--background)] px-2 py-1.5"
                  />
                  <button className="rounded-md border border-[var(--line)] px-3 py-1.5 hover:bg-[var(--surface-strong)]">
                    Добавить отметку
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
            <h2 className="mb-3 font-medium">
              Первая десятка
              {selected.lastOk && (
                <span className="ml-2 font-normal text-[var(--muted)]">{fmt.format(new Date(selected.lastOk.checkedAt))}</span>
              )}
            </h2>
            {selected.lastOk?.top.length ? (
              <ol className="space-y-1">
                {selected.lastOk.top.map((t) => {
                  const own = t.host === project.domain || t.host.endsWith(`.${project.domain}`);
                  return (
                    <li key={t.position} className="flex gap-3">
                      <span className="w-6 shrink-0 text-right font-mono text-[var(--muted)]">{t.position}</span>
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        title={t.title}
                        className={`truncate ${own ? "font-semibold text-[var(--accent)]" : "hover:text-[var(--accent)]"}`}
                      >
                        {t.host}
                      </a>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-[var(--muted)]">Нет данных</p>
            )}
            {selected.lastOk?.status === "found" && selected.lastOk.position! > 10 && (
              <p className="mt-3 border-t border-[var(--line)] pt-3">
                <span className="font-mono text-[var(--muted)]">{selected.lastOk.position}</span>{" "}
                <span className="font-semibold text-[var(--accent)]">{project.domain}</span>{" "}
                <span className="text-[var(--muted)]">· страница {selected.lastOk.page}</span>
              </p>
            )}
          </div>
        </section>
      )}

      <section className="mt-6 overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
              <th className="px-3 py-2 font-medium">Запрос</th>
              <th className="px-3 py-2 text-right font-medium">Место</th>
              <th className="px-3 py-2 text-right font-medium">Стр.</th>
              <th className="px-3 py-2 font-medium">Изменение</th>
              <th className="px-3 py-2 text-right font-medium">Лучшее за {days} дн</th>
              <th className="px-3 py-2 font-medium">Проверено</th>
              <th className="px-3 py-2 font-medium">Страница сайта</th>
              {canEdit && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 8 : 7} className="px-3 py-6 text-center text-[var(--muted)]">
                  Ключей пока нет
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const isSelected = row.keyword.id === selected?.keyword.id;
              return (
                <tr
                  key={row.keyword.id}
                  className={`h-11 border-b border-[var(--line)] last:border-0 ${isSelected ? "bg-[var(--surface-strong)]" : ""}`}
                >
                  <td className="px-3">
                    <Link href={href({ kw: row.keyword.id })} className="hover:text-[var(--accent)]">
                      {row.keyword.keyword}
                    </Link>
                  </td>
                  <td className="px-3 text-right">
                    <PositionCell row={row} depth={depth} />
                  </td>
                  <td className="px-3 text-right font-mono text-[var(--muted)]">{row.last?.page ?? "—"}</td>
                  <td className={`px-3 ${row.change ? changeClass[row.change.kind] : "text-[var(--muted)]"}`}>
                    {row.change?.text ?? "—"}
                  </td>
                  <td className="px-3 text-right font-mono">{row.best ?? "—"}</td>
                  <td className="px-3 font-mono text-[var(--muted)]">
                    {row.last ? fmt.format(new Date(row.last.checkedAt)) : "—"}
                  </td>
                  <td className="max-w-[260px] truncate px-3 text-[var(--muted)]">
                    {row.last?.matchedUrl ? (
                      <a href={row.last.matchedUrl} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-[var(--foreground)]">
                        {row.last.matchedUrl.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  {canEdit && (
                    <td className="whitespace-nowrap px-3 text-right">
                      <form action={checkNowAction} className="inline">
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="keywordId" value={row.keyword.id} />
                        <button className="px-2 text-[var(--muted)] hover:text-[var(--foreground)]" disabled={!!row.keyword.checkingSince}>
                          Проверить
                        </button>
                      </form>
                      {isOwner && (
                        <form action={deleteKeywordAction} className="inline">
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="keywordId" value={row.keyword.id} />
                          <button className="px-2 text-[var(--muted)] hover:text-[var(--accent-warm)]">Удалить</button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {canEdit && (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <form action={addKeywordsAction} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
            <input type="hidden" name="projectId" value={project.id} />
            <label className="mb-2 block font-medium" htmlFor="keywords">
              Добавить запросы, по одному в строке
            </label>
            <textarea
              id="keywords"
              name="keywords"
              rows={4}
              className="w-full rounded-md border border-[var(--line)] bg-[var(--background)] p-2"
              placeholder="ремонт газового котла Ташкент"
            />
            <button className="mt-2 rounded-md border border-[var(--line)] px-4 py-2 hover:bg-[var(--surface-strong)]">
              Добавить
            </button>
          </form>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
            <h2 className="mb-2 font-medium">Ссылка для клиента</h2>
            <p className="text-[var(--muted)]">Только просмотр, без входа. Управление и удаление клиенту не видны.</p>
            {shareUrl && (
              <input
                readOnly
                value={shareUrl}
                className="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--background)] p-2 font-mono text-xs"
              />
            )}
            <p className="mt-4 text-[var(--muted)]">
              Одна проверка ключа — от 1 до {project.maxPages} запросов к Serper: листаем по 10, пока не найдём сайт.
              Расписание — раз в сутки утром.
            </p>
            {isOwner && (
              <div className="mt-4">
                <DeleteConfirmButton
                  action={deleteProjectAction}
                  idName="projectId"
                  idValue={project.id}
                  label="Удалить проект со всей историей"
                  confirmMessage={`Удалить ${project.domain} и всю историю проверок?`}
                  className="text-[var(--muted)] hover:text-[var(--accent-warm)]"
                />
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
