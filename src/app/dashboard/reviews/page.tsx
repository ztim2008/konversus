import Link from "next/link";

import { requireCurrentAdmin } from "@/lib/auth/session";
import { getAllFeedback } from "@/lib/data/feedback";
import { DeleteFeedbackButton } from "./delete-button";

export const metadata = {
  title: "Отзывы · Кабинет",
};

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-[var(--builder-muted)]">без оценки</span>;
  return (
    <span className="text-amber-300">
      {"★".repeat(rating)}
      <span className="text-white/10">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function DashboardReviewsPage() {
  await requireCurrentAdmin();
  const feedback = await getAllFeedback(200);

  const withRating = feedback.filter((f) => f.rating);
  const avgRating =
    withRating.length > 0
      ? Math.round((withRating.reduce((s, f) => s + f.rating!, 0) / withRating.length) * 10) / 10
      : null;

  return (
    <div className="builder-shell flex min-h-screen flex-col">
      {/* Топбар */}
      <header className="flex items-center justify-between border-b border-[var(--builder-line)] bg-[var(--builder-surface)] px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-xs font-mono uppercase tracking-widest text-[var(--builder-muted)] transition-colors hover:text-[var(--builder-text)]"
          >
            ← Кабинет
          </Link>
          <div className="h-4 w-px bg-[var(--builder-line)]" />
          <h1 className="text-sm font-semibold text-[var(--builder-text)]">Отзывы клиентов</h1>
        </div>
        <Link
          href="/reviews"
          target="_blank"
          className="border border-[var(--builder-line)] px-3 py-1.5 text-xs text-[var(--builder-muted)] transition-colors hover:border-amber-300/30 hover:text-amber-300"
        >
          Публичная страница ↗
        </Link>
      </header>

      <div className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">

          {/* Статистика */}
          <div className="mb-6 grid grid-cols-3 gap-0 border border-[var(--builder-line)]">
            {[
              { v: String(feedback.length), l: "Всего отзывов" },
              { v: String(feedback.filter((f) => f.comment).length), l: "С комментарием" },
              { v: avgRating ? `${avgRating} ★` : "—", l: "Средняя оценка" },
            ].map((s) => (
              <div key={s.l} className="border-r border-[var(--builder-line)] p-5 last:border-r-0">
                <div className="text-2xl font-bold text-white">{s.v}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--builder-muted)]">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Список */}
          {feedback.length === 0 ? (
            <div className="border border-[var(--builder-line)] bg-black/10 p-12 text-center text-sm text-[var(--builder-muted)]">
              Отзывов пока нет. Они появятся после того, как клиенты оставят их на share-страницах.
            </div>
          ) : (
            <div className="divide-y divide-[var(--builder-line)] border border-[var(--builder-line)]">
              {feedback.map((f) => (
                <div key={f.id} className="grid gap-3 p-5 hover:bg-white/[0.02] sm:grid-cols-[1fr_180px]">
                  <div>
                    {/* Компания */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-[var(--builder-text)]">
                        {f.companyName}
                      </span>
                      <span className="text-[var(--builder-line)]">·</span>
                      <span className="text-xs text-[var(--builder-muted)]">{f.proposalTitle}</span>
                    </div>

                    {/* Оценка */}
                    <div className="mb-2 text-base">
                      <Stars rating={f.rating} />
                    </div>

                    {/* Комментарий */}
                    {f.comment ? (
                      <p className="text-sm leading-6 text-slate-300">«{f.comment}»</p>
                    ) : (
                      <p className="text-xs italic text-[var(--builder-muted)]">Без комментария</p>
                    )}

                    {/* Автор */}
                    {f.authorName && (
                      <div className="mt-2 text-xs font-semibold text-[#7db3ff]">{f.authorName}</div>
                    )}
                  </div>

                  {/* Дата + удаление */}
                  <div className="flex flex-col items-end gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--builder-muted)]">
                      {formatDate(f.createdAt)}
                    </span>
                    <DeleteFeedbackButton id={f.id} />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
