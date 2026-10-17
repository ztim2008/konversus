import type { RunState } from "@/lib/seo-positions/runs";

function duration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} с`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m} мин ${s % 60} с` : `${m} мин`;
}

/** Ход фоновой проверки для того, кто её запускает: шаг, полоса, время; после — итог или ошибка. */
export function RunStatus({ run, timeZone }: { run?: RunState; timeZone: string }) {
  if (!run) return null;
  const time = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone });
  const dateTime = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone });
  const started = run.startedAt.getTime();

  if (run.status === "running") {
    const elapsed = run.elapsedMs;
    const pct = run.total > 0 ? Math.min(100, Math.round((run.done / run.total) * 100)) : 0;
    const left = run.done >= 2 && run.total > run.done ? (elapsed / run.done) * (run.total - run.done) : null;
    return (
      <div className="space-y-1.5 rounded-md border border-[var(--line)] p-3 print:hidden" role="status">
        <div className="flex flex-wrap justify-between gap-2">
          <span className="min-w-0 truncate">{run.step ?? "Готовлюсь…"}</span>
          {run.total > 0 && (
            <span className="tabular-nums text-[var(--muted)]">
              {run.done} из {run.total}
            </span>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className={`h-full rounded-full bg-[var(--accent)] transition-[width] duration-700 ${run.total ? "" : "w-full animate-pulse opacity-40"}`}
            style={run.total ? { width: `${Math.max(pct, 2)}%` } : undefined}
          />
        </div>
        <p className="text-[var(--muted)]">
          Идёт с {time.format(run.startedAt)} · прошло {duration(elapsed)}
          {left !== null && <> · осталось около {duration(left)}</>}
        </p>
      </div>
    );
  }

  const took = run.finishedAt ? duration(run.finishedAt.getTime() - started) : null;
  if (run.status === "error") {
    return (
      <div className="space-y-1 rounded-md border border-[var(--accent-warm)] p-3 print:hidden" role="alert">
        <p className="text-[var(--accent-warm)]">{run.error ?? "Проверка не удалась"}</p>
        <p className="text-[var(--muted)]">
          {run.finishedAt && <>Остановилась {dateTime.format(run.finishedAt)}</>}
          {run.total > 0 && (
            <>
              {" "}
              на шаге {Math.min(run.done + 1, run.total)} из {run.total}
              {run.step && <>: {run.step}</>}
            </>
          )}
          .
        </p>
      </div>
    );
  }

  return (
    <p className="text-[var(--muted)] print:hidden">
      Готово{run.finishedAt && <> {dateTime.format(run.finishedAt)}</>}
      {took && <> за {took}</>}
      {run.result && <>: {run.result}</>}
    </p>
  );
}
