import Link from "next/link";

import { requireCurrentAdmin } from "@/lib/auth/session";
import {
  listArchitectProjects,
  countArchitectProjects,
  getArchitectStats,
} from "@/lib/data/architect";
import { SOURCE_TYPE_LABELS } from "@/lib/architect/url-detector";
import { getModelById } from "@/lib/architect/models";
import type { ProjectStatus } from "@/lib/architect/types";
import { deleteAnalysis } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Architect · История анализов",
};

const PER_PAGE = 20;

const STATUS_BADGE: Record<ProjectStatus, { label: string; cls: string }> = {
  pending:    { label: "В очереди",  cls: "arc-hist-badge-pending" },
  collecting: { label: "Сбор данных", cls: "arc-hist-badge-collecting" },
  analyzing:  { label: "Анализ AI",  cls: "arc-hist-badge-analyzing" },
  done:       { label: "Готово",     cls: "arc-hist-badge-done" },
  failed:     { label: "Ошибка",     cls: "arc-hist-badge-failed" },
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 60);
}

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ArchitectHistoryPage({ searchParams }: PageProps) {
  await requireCurrentAdmin();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const offset = (page - 1) * PER_PAGE;

  const [projects, total, stats] = await Promise.all([
    listArchitectProjects({ limit: PER_PAGE, offset }),
    countArchitectProjects(),
    getArchitectStats(),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="builder-shell flex min-h-screen flex-col">

      {/* ── Header ── */}
      <header className="flex items-center justify-between border-b border-[var(--builder-line)] bg-[var(--builder-surface)] px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard"
            className="text-xs font-mono uppercase tracking-widest text-[var(--builder-muted)] transition-colors hover:text-[var(--builder-text)]">
            ← Кабинет
          </Link>
          <div className="h-4 w-px bg-[var(--builder-line)]" />
          <h1 className="text-sm font-semibold text-[var(--builder-text)]">AI Architect — История анализов</h1>
        </div>
        <a href="/architect" target="_blank"
          className="text-xs font-mono uppercase tracking-widest text-amber-400 border border-amber-400/30 px-3 py-1.5 hover:bg-amber-400/10 transition-colors">
          Открыть Architect ↗
        </a>
      </header>

      <div className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Всего анализов", value: stats.total, color: "text-[var(--builder-text)]" },
              { label: "Завершено", value: stats.done, color: "text-emerald-400" },
              { label: "Сегодня", value: stats.today, color: "text-amber-400" },
              { label: "Ошибок", value: stats.failed, color: "text-red-400" },
            ].map((s) => (
              <div key={s.label} className="builder-preview-card p-4">
                <div className="builder-kicker">{s.label}</div>
                <div className={`mt-2 text-3xl font-semibold tracking-[-0.05em] ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ── Table ── */}
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="text-4xl">🔍</div>
              <p className="text-sm text-[var(--builder-muted)]">Анализов пока нет. Вставьте URL на странице <a href="/architect" className="text-amber-400 hover:underline">/architect</a></p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto border border-[var(--builder-line)]">
              <table className="arc-hist-table w-full">
                <thead>
                  <tr className="arc-hist-thead-row">
                    <th className="arc-hist-th">URL</th>
                    <th className="arc-hist-th">Тип</th>
                    <th className="arc-hist-th">Статус</th>
                    <th className="arc-hist-th">Потенциал</th>
                    <th className="arc-hist-th">SEO</th>
                    <th className="arc-hist-th">Модель</th>
                    <th className="arc-hist-th">Дата</th>
                    <th className="arc-hist-th" />
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => {
                    const badge = STATUS_BADGE[p.status];
                    const growth = p.result_json?.growth_potential_pct;
                    const niche = p.result_json?.niche;
                    const strongModel = p.model_used?.split(" → ")[1];
                    const modelInfo = strongModel ? getModelById(strongModel) : null;
                    const seoScore = p.snapshot_json?.seo_metrics?.score;

                    return (
                      <tr key={p.id} className="arc-hist-row">
                        {/* URL */}
                        <td className="arc-hist-td">
                          <div className="font-mono text-xs text-[var(--builder-text)] break-all max-w-[240px]">
                            {shortUrl(p.url)}
                          </div>
                          {niche && (
                            <div className="text-[10px] text-[var(--builder-muted)] mt-0.5">{niche}</div>
                          )}
                        </td>

                        {/* Тип */}
                        <td className="arc-hist-td">
                          <span className="arc-hist-type-badge">
                            {SOURCE_TYPE_LABELS[p.source_type]}
                          </span>
                        </td>

                        {/* Статус */}
                        <td className="arc-hist-td">
                          <span className={`arc-hist-badge ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {p.status === "failed" && p.error_message && (
                            <div className="text-[10px] text-red-400 mt-0.5 max-w-[180px] truncate" title={p.error_message}>
                              {p.error_message}
                            </div>
                          )}
                        </td>

                        {/* Потенциал роста */}
                        <td className="arc-hist-td">
                          {growth != null ? (
                            <span className="text-emerald-400 font-bold text-sm">+{growth}%</span>
                          ) : (
                            <span className="text-[var(--builder-muted)] text-xs">—</span>
                          )}
                        </td>

                        {/* SEO Score */}
                        <td className="arc-hist-td">
                          {seoScore != null ? (
                            <span className={`font-bold text-sm ${
                              seoScore >= 75 ? "text-emerald-400"
                              : seoScore >= 50 ? "text-amber-400"
                              : "text-red-400"
                            }`}>{seoScore}%</span>
                          ) : (
                            <span className="text-[var(--builder-muted)] text-xs">—</span>
                          )}
                        </td>

                        {/* Модель */}
                        <td className="arc-hist-td">
                          {modelInfo ? (
                            <div>
                              <div className="text-[11px] text-[var(--builder-text)]">{modelInfo.name}</div>
                              <div className="text-[10px] text-[var(--builder-muted)]">{modelInfo.provider}</div>
                            </div>
                          ) : p.model_used ? (
                            <span className="font-mono text-[10px] text-[var(--builder-muted)] break-all">{p.model_used.split(" → ")[1] ?? p.model_used}</span>
                          ) : (
                            <span className="text-[var(--builder-muted)] text-xs">—</span>
                          )}
                        </td>

                        {/* Дата */}
                        <td className="arc-hist-td whitespace-nowrap">
                          <span className="text-xs text-[var(--builder-muted)]">{formatDate(p.created_at)}</span>
                        </td>

                        {/* Действия */}
                        <td className="arc-hist-td">
                          <div className="flex items-center gap-2">
                            {p.status === "done" && (
                              <a
                                href={`/architect/${p.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-mono text-amber-400 border border-amber-400/30 px-2 py-1 hover:bg-amber-400/10 transition-colors whitespace-nowrap"
                              >
                                Отчёт ↗
                              </a>
                            )}
                            <form action={deleteAnalysis.bind(null, p.id)}>
                              <button
                                type="submit"
                                className="text-xs font-mono text-red-400/60 border border-red-400/20 px-2 py-1 hover:bg-red-400/10 hover:text-red-400 transition-colors"
                                title="Удалить анализ"
                              >
                                ✕
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[var(--builder-muted)]">
                  Страница {page} из {totalPages} · всего {total} записей
                </span>
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <Link
                      href={`/dashboard/architect?page=${page - 1}`}
                      className="text-xs font-mono text-[var(--builder-muted)] border border-[var(--builder-line)] px-3 py-1.5 hover:text-[var(--builder-text)] transition-colors"
                    >
                      ← Назад
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/dashboard/architect?page=${page + 1}`}
                      className="text-xs font-mono text-[var(--builder-muted)] border border-[var(--builder-line)] px-3 py-1.5 hover:text-[var(--builder-text)] transition-colors"
                    >
                      Вперёд →
                    </Link>
                  )}
                </div>
              </div>
            )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
