import { crawlSiteAction } from "@/app/positions/actions";
import { RunControl } from "@/components/seo-positions/run-control";
import type { CrawlSummary } from "@/lib/seo-positions/crawl";
import { pagesLabel } from "@/lib/seo-positions/crawl-parse";
import { shortPath } from "@/lib/seo-positions/pages";
import type { RunState } from "@/lib/seo-positions/runs";
import { monthTitle } from "@/lib/seo-positions/tz";

const SCREEN_URLS = 10;
const PRINT_URLS = 5;

type Props = {
  projectId: string;
  current: CrawlSummary | null;
  previous: CrawlSummary | null;
  canEdit: boolean;
  canRun: boolean;
  run?: RunState;
  timeZone: string;
};

function UrlList({ urls, limit }: { urls: string[]; limit: number }) {
  return (
    <ul className="mt-1 space-y-0.5 font-mono text-xs text-[var(--muted)]">
      {urls.slice(0, limit).map((u) => (
        <li key={u} className="truncate">
          {shortPath(u)}
        </li>
      ))}
      {urls.length > limit && <li>и ещё {urls.length - limit}</li>}
    </ul>
  );
}

export function TechSection({ projectId, current, previous, canEdit, canRun, run, timeZone }: Props) {
  if (!current && !canEdit) return null;
  const fmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", timeZone });
  const prevCount = new Map(previous?.findings.map((f) => [f.id, f.count]) ?? []);
  const fixed = previous ? previous.findings.filter((f) => !current?.findings.some((c) => c.id === f.id)) : [];

  return (
    <section id="tech" className="mt-8">
      <h2 className="mb-1 text-base font-semibold">Техника сайта</h2>
      {current ? (
        <p className="mb-3 text-[var(--muted)]">
          Проверено {pagesLabel(current.pagesTotal)} {current.source === "sitemap" ? "из sitemap.xml" : "по ссылкам с главной (sitemap.xml нет)"}
          {current.finishedAt ? `, ${fmt.format(current.finishedAt)}` : ", обход ещё идёт"}.
          {previous && ` Сравнение с обходом за ${monthTitle(previous.month).toLowerCase()}.`}
        </p>
      ) : (
        <p className="mb-3 text-[var(--muted)]">Обхода за этот месяц пока нет</p>
      )}

      {canEdit && canRun && (
        <div className="seo-report-screen mb-4">
          <RunControl
            action={crawlSiteAction}
            projectId={projectId}
            run={run}
            label="Обойти сайт"
            hint="Пройдёт до 100 страниц из sitemap.xml (или по ссылкам), раз в секунду, с учётом robots.txt. До двух минут."
            timeZone={timeZone}
          />
        </div>
      )}

      {current && current.finishedAt && current.findings.length === 0 && <p>Явных технических проблем не нашли.</p>}

      {current && current.findings.length > 0 && (
        <ul className="space-y-3">
          {current.findings.map((f) => {
            const was = prevCount.get(f.id);
            return (
              <li key={f.id}>
                <details className="seo-report-screen">
                  <summary className="cursor-pointer">
                    {f.title}: <span className="font-mono">{f.count}</span>
                    {previous && <span className="text-[var(--muted)]"> (было {was ?? 0})</span>}
                  </summary>
                  <UrlList urls={f.urls} limit={SCREEN_URLS} />
                </details>
                <div className="hidden print:block">
                  {f.title}: <span className="font-mono">{f.count}</span>
                  {previous && <span className="text-[var(--muted)]"> (было {was ?? 0})</span>}
                  <UrlList urls={f.urls} limit={PRINT_URLS} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {current?.finishedAt && fixed.length > 0 && (
        <p className="mt-3">
          Исправлено с прошлого обхода: {fixed.map((f) => f.title.toLowerCase()).join("; ")}.
        </p>
      )}
    </section>
  );
}
