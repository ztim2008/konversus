import { checkPagesAction } from "@/app/positions/actions";
import { RunControl } from "@/components/seo-positions/run-control";
import type { PageCheck } from "@/lib/seo-positions/pages-data";
import {
  findCannibalization,
  pageIssues,
  queryIssues,
  shortPath,
  targetMismatch,
  type KeywordLanding,
} from "@/lib/seo-positions/pages";
import type { RunState } from "@/lib/seo-positions/runs";

const th = "px-3 py-2 text-left font-medium text-[var(--muted)]";
const td = "px-3 py-2 border-t border-[var(--line)] align-top";

function PageLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="font-mono hover:text-[var(--accent)]">
      {shortPath(url)}
    </a>
  );
}

function Issues({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-[var(--muted)]">замечаний нет</span>;
  return (
    <ul className="space-y-0.5">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

type Props = {
  projectId: string;
  landings: KeywordLanding[];
  checks: Map<string, PageCheck>;
  depth: number;
  canEdit: boolean;
  canRun: boolean;
  run?: RunState;
  timeZone: string;
};

export function PagesSection({ projectId, landings, checks, depth, canEdit, canRun, run, timeZone }: Props) {
  const withData = landings.filter((l) => l.main || l.targetUrl);
  if (!withData.length && !checks.size && !canEdit) return null;
  const cannibal = findCannibalization(landings);
  const checked = [...checks.values()];

  return (
    <section id="pages" className="mt-8">
      <h2 className="mb-1 text-base font-semibold">Страницы под запросы</h2>
      <p className="mb-3 text-[var(--muted)]">Какую страницу сайта Google показывал по каждому запросу в этом месяце и что в ней мешает.</p>

      {canEdit && canRun && (
        <div className="seo-report-screen mb-4">
          <RunControl
            action={checkPagesAction}
            projectId={projectId}
            run={run}
            label="Проверить страницы"
            hint="Скачает главную и страницы из выдачи (до 10): title, H1, description, индексация, текст, Метрика. 10–30 секунд."
            timeZone={timeZone}
          />
        </div>
      )}

      {withData.length > 0 && (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Запрос</th>
              <th className={th}>Страница</th>
              <th className={`${th} text-right`}>Место</th>
              <th className={th}>Замечания</th>
            </tr>
          </thead>
          <tbody>
            {withData.map((l) => {
              const url = l.main?.url ?? l.targetUrl!;
              const check = checks.get(url);
              const issues = [
                ...(targetMismatch(l) ? [`Целевая страница — ${shortPath(l.targetUrl!)}, а Google показывает другую`] : []),
                ...(l.others.length ? [`По запросу показывались ещё: ${l.others.map((o) => shortPath(o.url)).join(", ")}`] : []),
                ...(check ? [...queryIssues(l.keyword, check), ...pageIssues(check)] : []),
              ];
              return (
                <tr key={l.keywordId}>
                  <td className={td}>{l.keyword}</td>
                  <td className={td}>
                    <PageLink url={url} />
                    {!l.main && <span className="block text-xs text-[var(--muted)]">целевая</span>}
                  </td>
                  <td className={`${td} text-right font-mono`}>{l.main ? l.main.last : `нет в топ-${depth}`}</td>
                  <td className={td}>{check || issues.length ? <Issues items={issues} /> : <span className="text-[var(--muted)]">страница не проверялась</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {cannibal.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 font-semibold">Несколько страниц борются за один запрос</h3>
          <p className="mb-3 text-[var(--muted)]">
            Google не может выбрать, какую страницу сайта показывать, и позиции скачут. Обычно помогает оставить одну
            страницу под запрос.
          </p>
          <div className="space-y-4">
            {cannibal.map((c) => (
              <div key={c.keywordId}>
                <p className="font-medium">«{c.keyword}»</p>
                <ul className="mt-1 space-y-0.5">
                  {c.pages.map((p) => (
                    <li key={p.url} className="flex flex-wrap gap-x-3">
                      <PageLink url={p.url} />
                      <span className="text-[var(--muted)]">
                        лучшее место {p.best}, дней в выдаче {p.days}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1">{c.advice}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {checked.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 font-semibold">Проверенные страницы</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Страница</th>
                <th className={th}>Title и H1</th>
                <th className={th}>Замечания</th>
              </tr>
            </thead>
            <tbody>
              {checked.map((p) => (
                <tr key={p.url}>
                  <td className={td}>
                    <PageLink url={p.url} />
                  </td>
                  <td className={`${td} max-w-[340px]`}>
                    <span className="block">{p.title ?? "—"}</span>
                    <span className="block text-[var(--muted)]">{p.h1 ?? "—"}</span>
                  </td>
                  <td className={td}>
                    <Issues items={pageIssues(p)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
