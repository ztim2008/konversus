import { autoAuditAction, saveAuditAction } from "@/app/positions/actions";
import { PendingButton } from "@/components/seo-positions/pending-button";
import type { MonthAudit } from "@/lib/seo-positions/audit";
import { AUDIT_ITEMS, AUDIT_SECTIONS, auditScore, type AuditEntry } from "@/lib/seo-positions/audit-items";
import { monthTitle } from "@/lib/seo-positions/tz";

const th = "px-3 py-2 text-left font-medium text-[var(--muted)]";
const td = "px-3 py-2 border-t border-[var(--line)] align-top";
const input = "w-full rounded-md border border-[var(--line)] bg-[var(--background)] p-1.5";

const LABEL: Record<string, string> = { "1": "Да", "0": "Нет", "-": "Не применимо" };

function ValueCell({ entry, before }: { entry?: AuditEntry; before?: AuditEntry }) {
  const v = entry?.value ?? null;
  const changed = before?.value && v && before.value !== v && before.value !== "-" && v !== "-";
  return (
    <td className={`${td} whitespace-nowrap ${v === "0" ? "text-[var(--accent-warm)]" : v ? "" : "text-[var(--muted)]"}`}>
      {v ? LABEL[v] : "—"}
      {changed && <span className="block text-xs text-[var(--muted)]">было: {LABEL[before.value!]}</span>}
    </td>
  );
}

type Props = {
  projectId: string;
  month: string;
  canEdit: boolean;
  canAuto: boolean;
  current: MonthAudit | null;
  previous: MonthAudit | null;
  error: string | null;
};

export function AuditSection({ projectId, month, canEdit, canAuto, current, previous, error }: Props) {
  const shown = current ?? previous;
  if (!shown && !canEdit) return null;

  const entries = shown?.entries ?? new Map<number, AuditEntry>();
  const before = current && previous ? previous.entries : null;
  const score = auditScore(entries);
  const prevScore = before ? auditScore(before) : null;
  const autoCount = AUDIT_ITEMS.filter((i) => i.auto).length;
  const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

  const readOnly = (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={`${th} w-8`}>№</th>
          <th className={th}>Пункт</th>
          <th className={th}>Оценка</th>
          <th className={th}>Комментарий</th>
        </tr>
      </thead>
      <tbody>
        {AUDIT_SECTIONS.map((section) => [
          <tr key={section.title}>
            <td colSpan={4} className="px-3 pb-1 pt-4 font-medium">
              {section.title}
            </td>
          </tr>,
          ...section.items.map((item) => {
            const e = entries.get(item.no);
            return (
              <tr key={item.no}>
                <td className={`${td} font-mono text-[var(--muted)]`}>{item.no}</td>
                <td className={td}>{item.text}</td>
                <ValueCell entry={e} before={before?.get(item.no)} />
                <td className={`${td} text-[var(--muted)]`}>{e && (e.value || e.source === "manual") ? e.comment : ""}</td>
              </tr>
            );
          }),
        ])}
      </tbody>
    </table>
  );

  return (
    <section id="audit" className="mt-8">
      <h2 className="mb-1 text-base font-semibold">Проверка сайта по чек-листу</h2>
      {shown ? (
        <p className="mb-3">
          Итого: <span className="font-mono">{score.yes}</span> из <span className="font-mono">{score.rated}</span>
          {prevScore && previous && (
            <span className="text-[var(--muted)]">
              {" "}
              · {monthTitle(previous.month)}: {prevScore.yes} из {prevScore.rated}
            </span>
          )}
          {!current && previous && <span className="text-[var(--muted)]"> · оценки из {monthTitle(previous.month)}</span>}
        </p>
      ) : (
        <p className="mb-3 text-[var(--muted)]">Проверки пока нет</p>
      )}

      {canEdit && (
        <div className="seo-report-screen mb-4 space-y-2">
          {error && <p className="rounded-md border border-[var(--accent-warm)] p-3 text-[var(--accent-warm)]">{error}</p>}
          {canAuto && (
            <form action={autoAuditAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="projectId" value={projectId} />
              <PendingButton
                pendingText="Открываю сайт, до минуты…"
                className="rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-[var(--background)]"
              >
                Автопроверка
              </PendingButton>
              <span className="text-[var(--muted)]">
                Откроет сайт с компьютера и телефона и заполнит {autoCount} пунктов из 32. Оценённое вручную не трогает.
                {current?.autoCheckedAt && <> Последняя: {dateFmt.format(current.autoCheckedAt)}.</>}
              </span>
            </form>
          )}
        </div>
      )}

      {canEdit ? (
        <>
          <form action={saveAuditAction} className="seo-report-screen">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="month" value={month} />
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${th} w-8`}>№</th>
                  <th className={th}>Пункт</th>
                  <th className={`${th} w-36`}>Оценка</th>
                  <th className={`${th} w-[32%]`}>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {AUDIT_SECTIONS.map((section) => [
                  <tr key={section.title}>
                    <td colSpan={4} className="px-3 pb-1 pt-4 font-medium">
                      {section.title}
                    </td>
                  </tr>,
                  ...section.items.map((item) => {
                    const e = entries.get(item.no);
                    const b = before?.get(item.no);
                    return (
                      <tr key={item.no}>
                        <td className={`${td} font-mono text-[var(--muted)]`}>{item.no}</td>
                        <td className={td}>
                          {item.text}
                          {e?.source === "auto" && <span className="ml-2 text-xs text-[var(--muted)]">авто</span>}
                        </td>
                        <td className={td}>
                          <select name={`v_${item.no}`} defaultValue={e?.value ?? ""} className={input}>
                            <option value="">не оценён</option>
                            <option value="1">Да</option>
                            <option value="0">Нет</option>
                            <option value="-">Не применимо</option>
                          </select>
                          {b?.value && b.value !== e?.value && (
                            <span className="mt-1 block text-xs text-[var(--muted)]">было: {LABEL[b.value]}</span>
                          )}
                        </td>
                        <td className={td}>
                          <input name={`c_${item.no}`} defaultValue={e?.comment ?? ""} maxLength={300} className={input} />
                        </td>
                      </tr>
                    );
                  }),
                ])}
              </tbody>
            </table>
            <button className="mt-3 rounded-md border border-[var(--line)] px-4 py-2 hover:bg-[var(--surface-strong)]">
              Сохранить проверку за {monthTitle(month).toLowerCase()}
            </button>
          </form>
          {shown && <div className="hidden print:block">{readOnly}</div>}
        </>
      ) : (
        readOnly
      )}
    </section>
  );
}
