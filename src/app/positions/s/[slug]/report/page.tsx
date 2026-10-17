import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { saveReportPlanAction } from "@/app/positions/actions";
import {
  getProjectBySlug,
  getReportPlan,
  listKeywords,
  listNotesForMonth,
  listSnapshotsBetween,
} from "@/lib/seo-positions/data";
import { buildMonthReport, rankLabel, type ReportKeyword } from "@/lib/seo-positions/report";
import { currentMonth, isMonth, monthPrep, monthRangeUtc, monthTitle, timeZoneFor } from "@/lib/seo-positions/tz";
import { canAccessProject, getViewer } from "@/lib/seo-positions/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Отчёт по позициям сайта",
  robots: { index: false, follow: false },
};

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function changeText(k: ReportKeyword) {
  if (k.delta === null || k.delta === 0) return "—";
  return k.delta > 0 ? `+${k.delta}` : String(k.delta);
}

const th = "px-3 py-2 text-left font-medium text-[var(--muted)]";
const td = "px-3 py-2 border-t border-[var(--line)]";

function KeywordTable({ rows, depth }: { rows: ReportKeyword[]; depth: number }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={th}>Запрос</th>
          <th className={`${th} text-right`}>Было</th>
          <th className={`${th} text-right`}>Стало</th>
          <th className={`${th} text-right`}>Мест</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((k) => (
          <tr key={k.keyword}>
            <td className={td}>{k.keyword}</td>
            <td className={`${td} text-right font-mono`}>{rankLabel(k.start, depth)}</td>
            <td className={`${td} text-right font-mono`}>{rankLabel(k.end, depth)}</td>
            <td className={`${td} text-right font-mono`}>{changeText(k)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function SeoReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const sp = await searchParams;
  const nowMonth = currentMonth(project.gl);
  const firstMonth = currentMonth(project.gl, new Date(project.createdAt));
  const monthParam = typeof sp.month === "string" ? sp.month : undefined;
  const month = isMonth(monthParam) && monthParam >= firstMonth && monthParam <= nowMonth ? monthParam : nowMonth;
  const isPdf = sp.pdf === "1";

  const { from, to } = monthRangeUtc(month, project.gl);
  const depth = project.maxPages * 10;
  const [viewer, keywords, snapshots, notes, plan] = await Promise.all([
    isPdf ? Promise.resolve(null) : getViewer(),
    listKeywords(project.id),
    listSnapshotsBetween(project.id, new Date(from.getTime() - 7 * 86400_000), to),
    listNotesForMonth(project.id, month),
    getReportPlan(project.id, month),
  ]);

  const admin = !!viewer && canAccessProject(viewer, project.id);
  const report = buildMonthReport({
    keywords,
    snapshots,
    notes,
    from,
    to,
    depth,
    ownDomain: project.domain,
    monthPrep: monthPrep(month),
    timeZone: timeZoneFor(project.gl),
  });

  const dateLabel = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const maxBucket = Math.max(1, ...report.buckets.flatMap((b) => [b.start, b.end]));
  const base = `/positions/s/${slug}/report`;
  const keywordsById = new Map(keywords.map((k) => [k.id, k.keyword]));

  return (
    <main className="seo-report mx-auto w-full max-w-[900px] px-4 pb-16 pt-24 text-sm text-[var(--foreground)] md:px-6">
      <style>{`@media print {
  body > nav, nav[style], footer, #kc-widget-root, .seo-report-screen { display: none !important; }
  .seo-report { padding-top: 24px !important; }
  .seo-report section { break-inside: avoid; }
}`}</style>

      <div className="seo-report-screen mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-1">
          {month > firstMonth && (
            <Link href={`${base}?month=${shiftMonth(month, -1)}`} className="rounded px-2 py-1 text-[var(--muted)] hover:text-[var(--foreground)]">
              ← {monthTitle(shiftMonth(month, -1))}
            </Link>
          )}
          {month < nowMonth && (
            <Link href={`${base}?month=${shiftMonth(month, 1)}`} className="rounded px-2 py-1 text-[var(--muted)] hover:text-[var(--foreground)]">
              {monthTitle(shiftMonth(month, 1))} →
            </Link>
          )}
        </nav>
        <div className="flex gap-2">
          <Link href={`/positions/s/${slug}`} className="rounded-md border border-[var(--line)] px-3 py-1.5 hover:bg-[var(--surface-strong)]">
            Графики по дням
          </Link>
          <a href={`${base}/pdf?month=${month}`} className="rounded-md bg-[var(--accent)] px-3 py-1.5 font-medium text-[var(--background)]">
            Скачать PDF
          </a>
        </div>
      </div>

      <header className="border-b border-[var(--line)] pb-4">
        <p className="text-[var(--muted)]">Отчёт по позициям сайта · {monthTitle(month)}</p>
        <h1 className="mt-1 text-2xl font-semibold">{project.name}</h1>
        <p className="mt-1 text-[var(--muted)]">
          <span className="font-mono text-[var(--foreground)]">{project.domain}</span> · Google, {project.location} ·
          запросов {keywords.length} · дней с проверками {report.checkDays}
        </p>
      </header>

      <section className="mt-6">
        <p className="text-lg leading-relaxed">{report.summary}</p>
        {report.checkDays < 7 && (
          <p className="mt-2 text-[var(--accent-warm)]">
            Проверки шли {report.checkDays} дн. Выводы предварительные: позиции в Google меняются день ото дня, тренд
            виден за 2–4 недели.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-base font-semibold">Где запросы в начале и в конце месяца</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Место в Google</th>
              <th className={`${th} text-right`}>Начало</th>
              <th className={`${th} text-right`}>Конец</th>
              <th className={`${th} w-[40%]`} />
            </tr>
          </thead>
          <tbody>
            {report.buckets.map((b) => (
              <tr key={b.label}>
                <td className={td}>{b.label}</td>
                <td className={`${td} text-right font-mono`}>{b.start}</td>
                <td className={`${td} text-right font-mono`}>{b.end}</td>
                <td className={td}>
                  <div className="h-2 rounded-sm bg-[var(--line)]" style={{ width: `${(b.start / maxBucket) * 100}%` }} />
                  <div className="mt-1 h-2 rounded-sm bg-[var(--accent)]" style={{ width: `${(b.end / maxBucket) * 100}%` }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-[var(--muted)]">Серая полоса — начало месяца, голубая — конец.</p>
      </section>

      {report.grew.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold">Выросли</h2>
          <KeywordTable rows={report.grew} depth={depth} />
        </section>
      )}

      {report.fell.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold">Упали</h2>
          <KeywordTable rows={report.fell} depth={depth} />
        </section>
      )}

      {(report.same.length > 0 || report.noData.length > 0) && (
        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold">Без изменений и мало данных</h2>
          <KeywordTable rows={[...report.same, ...report.noData]} depth={depth} />
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-base font-semibold">Что сделали на сайте</h2>
        {report.notes.length === 0 ? (
          <p className="text-[var(--muted)]">Отметок за месяц нет</p>
        ) : (
          <ul className="space-y-1">
            {report.notes.map((n) => (
              <li key={n.id} className="flex gap-3">
                <span className="shrink-0 font-mono text-[var(--muted)]">{dateLabel.format(new Date(`${n.date}T12:00:00Z`))}</span>
                <span>
                  {n.text}
                  {n.keywordId && keywordsById.has(n.keywordId) && (
                    <span className="text-[var(--muted)]"> · «{keywordsById.get(n.keywordId)}»</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {report.competitors.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold">Кто в первой десятке</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Сайт</th>
                <th className={`${th} text-right`}>Запросов в начале</th>
                <th className={`${th} text-right`}>Запросов в конце</th>
              </tr>
            </thead>
            <tbody>
              {report.competitors.map((c) => (
                <tr key={c.host}>
                  <td className={`${td} font-mono`}>{c.host}</td>
                  <td className={`${td} text-right font-mono`}>{c.start}</td>
                  <td className={`${td} text-right font-mono`}>{c.end}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Сколько из {keywords.length} запросов сайт держит в первой десятке Google.
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-base font-semibold">План на следующий месяц</h2>
        {admin ? (
          <form action={saveReportPlanAction} className="seo-report-screen">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="month" value={month} />
            <textarea
              name="plan"
              rows={5}
              defaultValue={plan}
              placeholder={"Отдельная страница под газовые котлы\nОтзывы и фото работ на главную"}
              className="w-full rounded-md border border-[var(--line)] bg-[var(--background)] p-2"
            />
            <button className="mt-2 rounded-md border border-[var(--line)] px-4 py-2 hover:bg-[var(--surface-strong)]">
              Сохранить план
            </button>
          </form>
        ) : null}
        {plan ? (
          <p className={`whitespace-pre-line ${admin ? "hidden print:block" : ""}`}>{plan}</p>
        ) : (
          !admin && <p className="text-[var(--muted)]">План пока не заполнен</p>
        )}
      </section>

      <p className="mt-10 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
        Как считали: обычная выдача Google без рекламы, {project.location}, компьютер, раз в сутки. «Начало» — медиана
        первых проверок месяца (до трёх), «конец» — последних, чтобы один случайный день не искажал картину. Сдвиг на
        1–2 места — обычные колебания Google, он считается «без изменений». Если все проверки пришлись на один день,
        изменение не считается. «Нет в
        топ-{depth}» — сайт не найден в первых {depth} результатах.
      </p>
    </main>
  );
}
