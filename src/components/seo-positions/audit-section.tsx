import { autoAuditAction, saveAuditAction } from "@/app/positions/actions";
import { RunControl } from "@/components/seo-positions/run-control";
import { pageEntries, type AuditEntries, type MonthAudit } from "@/lib/seo-positions/audit";
import {
  auditScore,
  PAGE_ITEMS,
  sectionsFor,
  SITE_ITEMS,
  type AuditEntry,
  type AuditItem,
  type AuditSection as Section,
} from "@/lib/seo-positions/audit-items";
import { plural, shortPath } from "@/lib/seo-positions/pages";
import type { RunState } from "@/lib/seo-positions/runs";
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

type Block = {
  key: string;
  title: string;
  hint?: string;
  sections: Section[];
  items: AuditItem[];
  entries: AuditEntries;
  before: AuditEntries | null;
  /** Префикс имён полей формы: '' — главная и пункты сайта, `${i}_` — страница i. */
  suffix: string;
  pageUrl: string;
};

function Score({ block, prevMonth }: { block: Block; prevMonth: string | null }) {
  const s = auditScore(block.entries, block.items);
  const p = block.before ? auditScore(block.before, block.items) : null;
  return (
    <span className="text-[var(--muted)]">
      {" "}
      · <span className="font-mono text-[var(--foreground)]">{s.yes}</span> из <span className="font-mono">{s.rated}</span>
      {p && prevMonth && p.rated > 0 && (
        <>
          {" "}
          · {monthTitle(prevMonth).toLowerCase()}: {p.yes} из {p.rated}
        </>
      )}
    </span>
  );
}

function Rows({ block, edit }: { block: Block; edit: boolean }) {
  return block.sections.map((section) => [
    <tr key={section.title}>
      <td colSpan={4} className="px-3 pb-1 pt-4 font-medium">
        {section.title}
      </td>
    </tr>,
    ...section.items.map((item) => {
      const e = block.entries.get(item.no);
      const b = block.before?.get(item.no);
      if (!edit) {
        return (
          <tr key={item.no}>
            <td className={`${td} font-mono text-[var(--muted)]`}>{item.no}</td>
            <td className={td}>{item.text}</td>
            <ValueCell entry={e} before={b} />
            <td className={`${td} text-[var(--muted)]`}>{e && (e.value || e.source === "manual") ? e.comment : ""}</td>
          </tr>
        );
      }
      return (
        <tr key={item.no}>
          <td className={`${td} font-mono text-[var(--muted)]`}>{item.no}</td>
          <td className={td}>
            {item.text}
            {e?.source === "auto" && <span className="ml-2 text-xs text-[var(--muted)]">авто</span>}
          </td>
          <td className={td}>
            <select name={`v_${block.suffix}${item.no}`} defaultValue={e?.value ?? ""} className={input}>
              <option value="">не оценён</option>
              <option value="1">Да</option>
              <option value="0">Нет</option>
              <option value="-">Не применимо</option>
            </select>
            {b?.value && b.value !== e?.value && <span className="mt-1 block text-xs text-[var(--muted)]">было: {LABEL[b.value]}</span>}
          </td>
          <td className={td}>
            <input name={`c_${block.suffix}${item.no}`} defaultValue={e?.comment ?? ""} maxLength={300} className={input} />
          </td>
        </tr>
      );
    }),
  ]);
}

function Table({ block, edit }: { block: Block; edit: boolean }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={`${th} w-8`}>№</th>
          <th className={th}>Пункт</th>
          <th className={`${th} ${edit ? "w-36" : ""}`}>Оценка</th>
          <th className={`${th} ${edit ? "w-[32%]" : ""}`}>Комментарий</th>
        </tr>
      </thead>
      <tbody>
        <Rows block={block} edit={edit} />
      </tbody>
    </table>
  );
}

/** На экране — раскрывающийся раздел, в PDF — всегда развёрнут. */
function BlockView({ block, open, edit, prevMonth }: { block: Block; open: boolean; edit: boolean; prevMonth: string | null }) {
  const heading = (
    <>
      <span className="font-medium">{block.title}</span>
      <Score block={block} prevMonth={prevMonth} />
      {block.hint && <span className="block text-xs text-[var(--muted)]">{block.hint}</span>}
    </>
  );
  return (
    <>
      <details open={open} className="seo-report-screen mt-3 rounded-md border border-[var(--line)]">
        <summary className="cursor-pointer px-3 py-2">{heading}</summary>
        <div className="px-1 pb-2">
          <Table block={block} edit={edit} />
        </div>
      </details>
      {block.entries.size > 0 && (
        <div className="mt-4 hidden print:block">
          <p>{heading}</p>
          <Table block={block} edit={false} />
        </div>
      )}
    </>
  );
}

type Props = {
  projectId: string;
  month: string;
  canEdit: boolean;
  canAuto: boolean;
  current: MonthAudit | null;
  previous: MonthAudit | null;
  /** Страницы чек-листа кроме главной. */
  pageUrls: string[];
  run?: RunState;
  timeZone: string;
};

export function AuditSection({ projectId, month, canEdit, canAuto, current, previous, pageUrls, run, timeZone }: Props) {
  const shown = current ?? previous;
  if (!shown && !canEdit) return null;

  const empty: AuditEntries = new Map();
  const compare = current && previous ? previous : null;
  const home = shown?.entries ?? empty;
  const blocks: Block[] = [
    {
      key: "site",
      title: "Сайт целиком",
      hint: "Шапка, дизайн, отзывы, мобильная версия, Метрика — один раз на сайт, по главной.",
      sections: sectionsFor("site"),
      items: SITE_ITEMS,
      entries: home,
      before: compare?.entries ?? null,
      suffix: "",
      pageUrl: "",
    },
    {
      key: "home",
      title: "Главная",
      sections: sectionsFor("page"),
      items: PAGE_ITEMS,
      entries: home,
      before: compare?.entries ?? null,
      suffix: "",
      pageUrl: "",
    },
    ...pageUrls.map((url, i) => ({
      key: url,
      title: shortPath(url),
      sections: sectionsFor("page"),
      items: PAGE_ITEMS,
      entries: pageEntries(shown, url) ?? empty,
      before: pageEntries(compare, url) ?? null,
      suffix: `${i + 1}_`,
      pageUrl: url,
    })),
  ].filter((b) => canEdit || b.entries.size > 0);

  const total = blocks.reduce(
    (acc, b) => {
      const s = auditScore(b.entries, b.items);
      const p = b.before ? auditScore(b.before, b.items) : null;
      return { yes: acc.yes + s.yes, rated: acc.rated + s.rated, pYes: acc.pYes + (p?.yes ?? 0), pRated: acc.pRated + (p?.rated ?? 0) };
    },
    { yes: 0, rated: 0, pYes: 0, pRated: 0 }
  );
  const prevMonth = compare?.month ?? null;
  const pagesHint = pageUrls.length
    ? ` и ещё ${pageUrls.length} ${plural(pageUrls.length, "страницу", "страницы", "страниц")} из выдачи`
    : "";

  return (
    <section id="audit" className="mt-8">
      <h2 className="mb-1 text-base font-semibold">Проверка сайта по чек-листу</h2>
      {shown ? (
        <p className="mb-3">
          Итого: <span className="font-mono">{total.yes}</span> из <span className="font-mono">{total.rated}</span>
          {prevMonth && total.pRated > 0 && (
            <span className="text-[var(--muted)]">
              {" "}
              · {monthTitle(prevMonth)}: {total.pYes} из {total.pRated}
            </span>
          )}
          {!current && previous && <span className="text-[var(--muted)]"> · оценки из {monthTitle(previous.month)}</span>}
        </p>
      ) : (
        <p className="mb-3 text-[var(--muted)]">Проверки пока нет</p>
      )}

      {canEdit && canAuto && (
        <div className="seo-report-screen mb-4">
          <RunControl
            action={autoAuditAction}
            projectId={projectId}
            run={run}
            label="Автопроверка"
            hint={`Откроет главную с компьютера и телефона${pagesHint}, заполнит пункты, которые видны автоматически. Оценённое вручную не трогает.`}
            timeZone={timeZone}
          />
        </div>
      )}

      {canEdit ? (
        // Поля формы неуправляемые: после автопроверки и автообновления форму нужно пересоздать, иначе в ней останутся старые значения.
        <form key={`${shown?.month ?? ""}:${shown?.autoCheckedAt?.getTime() ?? 0}:${run?.status ?? ""}`} action={saveAuditAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="month" value={month} />
          {pageUrls.map((url, i) => (
            <input key={url} type="hidden" name={`page_${i + 1}`} value={url} />
          ))}
          {blocks.map((b, i) => (
            <BlockView key={b.key} block={b} open={i < 2} edit prevMonth={prevMonth} />
          ))}
          <button className="seo-report-screen mt-3 rounded-md border border-[var(--line)] px-4 py-2 hover:bg-[var(--surface-strong)]">
            Сохранить проверку за {monthTitle(month).toLowerCase()}
          </button>
        </form>
      ) : (
        blocks.map((b, i) => <BlockView key={b.key} block={b} open={i < 2} edit={false} prevMonth={prevMonth} />)
      )}
    </section>
  );
}
