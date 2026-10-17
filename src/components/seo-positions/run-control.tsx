import { PendingButton } from "@/components/seo-positions/pending-button";
import { RunStatus } from "@/components/seo-positions/run-status";
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
  const running = run?.status === "running";
  return (
    <div className="space-y-2 print:hidden">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="projectId" value={projectId} />
        {running ? (
          <span className="rounded-md border border-[var(--line)] px-4 py-2 text-[var(--muted)]">Идёт проверка…</span>
        ) : (
          <PendingButton pendingText="Запускаю…" className="rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-[var(--background)]">
            {label}
          </PendingButton>
        )}
        <span className="text-[var(--muted)]">{hint}</span>
      </form>
      <RunStatus run={run} timeZone={timeZone} />
    </div>
  );
}
