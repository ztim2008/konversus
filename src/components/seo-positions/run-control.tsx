import { PendingButton } from "@/components/seo-positions/pending-button";
import type { RunState } from "@/lib/seo-positions/runs";

type Props = {
  action: (formData: FormData) => Promise<void>;
  projectId: string;
  run?: RunState;
  label: string;
  hint: string;
  timeZone: string;
};

export function RunControl({ action, projectId, run, label, hint, timeZone }: Props) {
  const fmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone });
  const running = run?.status === "running";
  return (
    <div className="space-y-2">
      {run?.status === "error" && run.error && (
        <p className="rounded-md border border-[var(--accent-warm)] p-3 text-[var(--accent-warm)]">{run.error}</p>
      )}
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="projectId" value={projectId} />
        {running ? (
          <span className="rounded-md border border-[var(--line)] px-4 py-2 text-[var(--muted)]">
            Идёт проверка с {fmt.format(run.startedAt).split(", ")[1]}…
          </span>
        ) : (
          <PendingButton pendingText="Запускаю…" className="rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-[var(--background)]">
            {label}
          </PendingButton>
        )}
        <span className="text-[var(--muted)]">
          {hint}
          {run?.status === "done" && run.finishedAt && <> Последняя: {fmt.format(run.finishedAt)}.</>}
        </span>
      </form>
    </div>
  );
}
