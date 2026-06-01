import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import {
  createCompanyAction,
  openCompanyEditorAction,
  createProposalAction,
  deleteCompanyAction,
  deleteProposalAction,
  archiveCompanyAction,
  unarchiveCompanyAction,
  archiveProposalAction,
  updateCompanyCrmAction,
  updateProposalStatusAction,
} from "@/app/dashboard/actions";
import { DeleteConfirmButton } from "@/components/dashboard/delete-confirm-button";
import { CompanyImageUpload } from "@/components/dashboard/company-image-upload";
import { DuplicateProposalModal } from "@/components/dashboard/duplicate-proposal-modal";
import { requireCurrentAdmin } from "@/lib/auth/session";
import { listCompanies } from "@/lib/data/companies";
import { listProposals } from "@/lib/data/proposals";
import { getShareLinksForProposals, getSharePath, getViewEventsForProposals } from "@/lib/data/share-links";
import { getFeedbackSummariesForProposals } from "@/lib/data/feedback";
import { hasAdminAuthEnv, hasDatabaseEnv } from "@/lib/env";
import {
  companyStatuses,
  proposalStatuses,
  type CompanyStatus,
  type ProposalStatus,
} from "@/types/domain";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type CompanyFilter = CompanyStatus | "all" | "active";

const companyStatusLabels: Record<CompanyStatus, string> = {
  draft: "Новый",
  sent: "Отправлено",
  won: "Сделка ✓",
  archived: "Закрыт",
};

const proposalStatusLabels: Record<ProposalStatus, string> = {
  draft: "Черновик",
  sent: "Отправлено",
  won: "Сделка ✓",
  archived: "Закрыт",
};

// Следующий статус в воронке
const proposalNextStatus: Partial<Record<ProposalStatus, ProposalStatus>> = {
  draft: "sent",
  sent: "won",
};
const proposalNextLabel: Partial<Record<ProposalStatus, string>> = {
  draft: "Отправить",
  sent: "Сделка!",
};

function getSearchValue(params: Record<string, string | string[] | undefined>, key: string) {
  const v = params[key];
  return typeof v === "string" ? v : undefined;
}

function getCompanyFilter(value?: string): CompanyFilter {
  if (!value || value === "active") return "active";
  if (value === "all") return "all";
  return companyStatuses.includes(value as CompanyStatus) ? (value as CompanyStatus) : "active";
}

function buildHref(companyStatus: CompanyFilter) {
  if (!companyStatus || companyStatus === "active") return "/dashboard";
  return `/dashboard?companyStatus=${companyStatus}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatViewTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  const timeStr = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  if (diffMin < 2) return "только что";
  if (diffMin < 60) return `${diffMin} мин. назад`;
  if (diffH < 24) return `сегодня в ${timeStr}`;
  if (diffD === 1) return `вчера в ${timeStr}`;
  if (diffD < 7) return `${diffD} дн. назад в ${timeStr}`;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }) + ` в ${timeStr}`;
}

const deviceIcon: Record<string, string> = {
  mobile: "📱",
  tablet: "📲",
  desktop: "🖥",
  unknown: "👁",
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const isAppReady = hasDatabaseEnv() && hasAdminAuthEnv();

  if (!isAppReady) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <div className="rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-8 text-amber-50 shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-100/80">Настройка окружения</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">Кабинет пока не активирован.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-amber-50/90">
            Добавьте в .env.local параметры MySQL и переменные ADMIN_EMAIL, ADMIN_PASSWORD, AUTH_SECRET.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-full bg-[linear-gradient(135deg,#f6c47b,#ffe0b2)] px-5 py-3 text-sm font-semibold text-slate-950" href="/auth">Открыть авторизацию</Link>
            <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white" href="/">Вернуться на главную</Link>
          </div>
        </div>
      </main>
    );
  }

  const user = await requireCurrentAdmin();
  const [companies, proposals] = await Promise.all([listCompanies(), listProposals()]);

  const proposalIds = proposals.map((p) => p.id);
  const [shareLinksMap, feedbackSummaryMap, viewEventsMap] = await Promise.all([
    getShareLinksForProposals(proposalIds),
    getFeedbackSummariesForProposals(proposalIds),
    getViewEventsForProposals(proposalIds),
  ]);

  const selectedStatus = getCompanyFilter(getSearchValue(params, "companyStatus"));
  const message = getSearchValue(params, "message");
  const error = getSearchValue(params, "error");
  const returnTo = buildHref(selectedStatus);

  const proposalsByCompany = proposals.reduce<Record<string, typeof proposals>>((acc, p) => {
    acc[p.companyId] = [...(acc[p.companyId] ?? []), p];
    return acc;
  }, {});

  const companyStatusCounts = companyStatuses.reduce<Record<CompanyStatus, number>>((acc, s) => {
    acc[s] = companies.filter((c) => c.status === s).length;
    return acc;
  }, {} as Record<CompanyStatus, number>);

  const proposalStatusCounts = proposalStatuses.reduce<Record<ProposalStatus, number>>((acc, s) => {
    acc[s] = proposals.filter((p) => p.status === s).length;
    return acc;
  }, {} as Record<ProposalStatus, number>);

  const filteredCompanies = companies.filter((c) => {
    if (selectedStatus === "all") return true;
    if (selectedStatus === "active") return c.status !== "archived";
    return c.status === selectedStatus;
  });

  const companyNameById = companies.reduce<Record<string, string>>((acc, c) => { acc[c.id] = c.name; return acc; }, {});

  return (
    <main className="builder-shell mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 pb-14 pt-4 sm:px-6 lg:px-8">

      {/* ── Шапка ── */}
      <header className="builder-panel builder-panel-strong sticky top-4 z-20 px-5 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">FPB</span>
            <span className="text-slate-600">/</span>
            <h1 className="text-sm font-semibold text-white">Компании и концепты</h1>
            <span className="db-status db-status--draft ml-1">{user.email?.split("@")[0]}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link className="db-action" href="/">На главную</Link>
            <Link className="db-action" href="/dashboard/settings">Настройки</Link>
            <Link className="db-action" href="/dashboard/reviews">Отзывы</Link>
            <form action={signOutAction}><button className="db-action" type="submit">Выйти</button></form>
          </div>
        </div>
      </header>

      {/* ── Статы ── */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="builder-preview-card p-4">
          <div className="builder-kicker">Компании</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{companies.filter(c => c.status !== "archived").length}</div>
          <div className="mt-1 text-xs text-slate-500">активных</div>
        </div>
        <div className="builder-preview-card p-4">
          <div className="builder-kicker">Концепты</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{proposals.length}</div>
          <div className="mt-1 text-xs text-slate-500">всего</div>
        </div>
        <div className="builder-preview-card p-4">
          <div className="builder-kicker">Отправлено</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{(companyStatusCounts.sent ?? 0) + (proposalStatusCounts.sent ?? 0)}</div>
          <div className="mt-1 text-xs text-slate-500">компании + концепты</div>
        </div>
        <div className="builder-preview-card p-4">
          <div className="builder-kicker">Сделки</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{proposalStatusCounts.won ?? 0}</div>
          <div className="mt-1 text-xs text-slate-500">закрытых</div>
        </div>
      </section>

      {/* ── Баннер отзывов ── */}
      {(() => {
        const totalFeedback = Object.values(feedbackSummaryMap).reduce((s, f) => s + f.totalCount, 0);
        const pwf = proposals.filter((p) => (feedbackSummaryMap[p.id]?.totalCount ?? 0) > 0);
        if (totalFeedback === 0) return null;
        return (
          <Link href="/dashboard/reviews" className="group mt-3 flex items-center justify-between gap-4 border border-amber-300/20 bg-amber-300/[0.04] px-5 py-3 transition-colors hover:border-amber-300/40 hover:bg-amber-300/[0.08]">
            <div className="flex items-center gap-3">
              <span className="text-amber-300">◎</span>
              <span className="text-sm font-semibold text-white">
                {totalFeedback} {totalFeedback === 1 ? "отзыв" : totalFeedback < 5 ? "отзыва" : "отзывов"} от {pwf.length} {pwf.length === 1 ? "клиента" : "клиентов"}
              </span>
              {pwf.slice(0, 4).map((p) => {
                const fb = feedbackSummaryMap[p.id]!;
                return (
                  <span key={p.id} className="hidden sm:inline border border-amber-300/20 px-2 py-0.5 text-xs text-slate-300">
                    {companyNameById[p.companyId] ?? "—"}{fb.avgRating ? ` ${"★".repeat(Math.round(fb.avgRating))}` : ""}
                  </span>
                );
              })}
            </div>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300/60 group-hover:text-amber-300">Смотреть →</span>
          </Link>
        );
      })()}

      {error ? <div className="builder-note builder-note-error mt-3">{error}</div> : null}
      {message ? <div className="builder-note builder-note-success mt-3">{message}</div> : null}

      {/* ── Быстрое добавление компании ── */}
      <details className="db-quick-add mt-3">
        <summary className="db-quick-add__toggle">+ Добавить компанию</summary>
        <form action={createCompanyAction} className="db-quick-add__form">
          <label className="db-quick-add__field">
            <span>Название *</span>
            <input className="builder-field" name="name" placeholder="ООО Промтех" required />
          </label>
          <label className="db-quick-add__field">
            <span>Сайт</span>
            <input className="builder-field" name="websiteUrl" placeholder="https://company.ru" />
          </label>
          <label className="db-quick-add__field">
            <span>Подниша</span>
            <input className="builder-field" name="industry" placeholder="Производство оборудования" />
          </label>
          <label className="db-quick-add__field sm:col-span-2">
            <span>Описание / заметки</span>
            <textarea className="builder-area min-h-20" name="shortDescription" placeholder="Чем занимается, что важно показать" />
          </label>
          <div>
            <span className="db-quick-add__field-label">Фото компании</span>
            <CompanyImageUpload />
          </div>
          <div className="sm:col-span-2">
            <button className="builder-action-primary" type="submit">Создать компанию</button>
          </div>
        </form>
      </details>

      {/* ── Фильтры ── */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link className={selectedStatus === "active" ? "builder-chip-active" : "builder-chip-muted"} href={buildHref("active")}>
          Активные · {companies.filter(c => c.status !== "archived").length}
        </Link>
        {(["draft", "sent", "won"] as CompanyStatus[]).map((s) => (
          <Link key={s} className={selectedStatus === s ? "builder-chip-active" : "builder-chip-muted"} href={buildHref(s)}>
            {companyStatusLabels[s]} · {companyStatusCounts[s]}
          </Link>
        ))}
        <Link className={selectedStatus === "archived" ? "builder-chip-active" : "builder-chip-muted"} href={buildHref("archived")}>
          Архив · {companyStatusCounts.archived}
        </Link>
        <Link className={selectedStatus === "all" ? "builder-chip-active" : "builder-chip-muted"} href={buildHref("all")}>
          Все · {companies.length}
        </Link>
      </div>

      {/* ── Единый список компаний + концептов ── */}
      <section className="mt-3 builder-canvas-block overflow-hidden p-0">
        {filteredCompanies.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">По выбранному фильтру ничего не найдено.</div>
        ) : filteredCompanies.map((company) => {
          const compProposals = proposalsByCompany[company.id] ?? [];
          const totalViews = compProposals.reduce((s, p) => s + (shareLinksMap[p.id]?.uniqueViewCount ?? 0), 0);
          const totalFeedback = compProposals.reduce((s, p) => s + (feedbackSummaryMap[p.id]?.totalCount ?? 0), 0);

          return (
            <div key={company.id} className="db-company-block">

              {/* ── Строка компании ── */}
              <div className="db-company-main">
                {/* Превью */}
                <div className="db-company-thumb-wrap">
                  {company.previewImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.previewImageUrl} alt={company.name} className="db-company-thumb" />
                  ) : (
                    <div className="db-company-thumb db-company-thumb--empty">Нет<br/>фото</div>
                  )}
                </div>
                <div className="db-company-name-block">
                  <span className="db-company-name">{company.name}</span>
                  {company.industry && <span className="db-company-industry">{company.industry}</span>}
                </div>
                <span className={`db-status db-status--${company.status}`}>{companyStatusLabels[company.status]}</span>
                <div className="db-company-stats">
                  <span className="db-stat">{compProposals.length} конц.</span>
                  {totalViews > 0 && <span className="db-stat db-stat--views">👁 {totalViews}</span>}
                  {totalFeedback > 0 && <span className="db-stat db-stat--feedback">💬 {totalFeedback}</span>}
                  <span className="db-stat db-stat--date">{formatDate(company.updatedAt)}</span>
                </div>
                <div className="db-company-actions">
                  {company.status !== "archived" ? (
                    <form action={archiveCompanyAction} className="contents">
                      <input type="hidden" name="companyId" value={company.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button className="db-action db-action--danger" type="submit">↓ Архив</button>
                    </form>
                  ) : (
                    <>
                      <form action={unarchiveCompanyAction} className="contents">
                        <input type="hidden" name="companyId" value={company.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button className="db-action db-action--restore" type="submit">↑ Восстановить</button>
                      </form>
                      <DeleteConfirmButton
                        action={deleteCompanyAction}
                        idName="companyId"
                        idValue={company.id}
                        returnTo={returnTo}
                        label="Удалить"
                        confirmMessage={`Удалить компанию «${company.name}» и все её концепты навсегда?`}
                        className="db-action db-action--danger"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* ── Концепты компании ── */}
              {compProposals.map((proposal) => {
                const link = shareLinksMap[proposal.id];
                const fb = feedbackSummaryMap[proposal.id];
                const hasLink = !!link && link.status === "active";
                const events = viewEventsMap[proposal.id] ?? [];
                const hasViews = events.length > 0;

                return (
                  <div key={proposal.id} className="db-proposal-row">
                    <span className="db-proposal-indent">└</span>
                    <a href={`/dashboard/proposals/${proposal.id}`} className="db-proposal-title">{proposal.title}</a>
                    <span className={`db-status db-status--p-${proposal.status}`}>{proposalStatusLabels[proposal.status]}</span>
                    <div className="db-company-stats">
                      {(link?.uniqueViewCount ?? 0) > 0 && <span className="db-stat db-stat--views">👁 {link!.uniqueViewCount}</span>}
                      {(fb?.totalCount ?? 0) > 0 && <span className="db-stat db-stat--feedback">💬 {fb!.totalCount}</span>}
                      {hasViews ? (
                        <span className="db-stat db-stat--date db-views-trigger" title={`Все просмотры (${events.length}):\n${events.map(e => `${deviceIcon[e.deviceType] ?? "👁"} ${formatViewTime(e.viewedAt)}`).join("\n")}`}>
                          {deviceIcon[events[0].deviceType] ?? "👁"} {formatViewTime(events[0].viewedAt)}
                        </span>
                      ) : (
                        link?.lastOpenedAt && <span className="db-stat db-stat--date">{formatDate(link.lastOpenedAt)}</span>
                      )}
                    </div>
                    <div className="db-company-actions">
                      <a className="db-action db-action--primary" href={`/dashboard/proposals/${proposal.id}`}>Редактор</a>
                      <DuplicateProposalModal
                        proposalId={proposal.id}
                        proposalTitle={proposal.title}
                        currentCompanyId={company.id}
                        companies={companies.map(c => ({ id: c.id, name: c.name }))}
                      />
                      {hasLink && (
                        <a className="db-action" href={getSharePath(link)} target="_blank" rel="noopener noreferrer">Share ↗</a>
                      )}
                      {/* Быстрая смена статуса */}
                      {proposalNextStatus[proposal.status] && (
                        <form action={updateProposalStatusAction} className="contents">
                          <input type="hidden" name="proposalId" value={proposal.id} />
                          <input type="hidden" name="status" value={proposalNextStatus[proposal.status]} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button
                            className={`db-action ${proposal.status === "sent" ? "db-action--won" : "db-action--send"}`}
                            type="submit"
                          >
                            {proposalNextLabel[proposal.status]}
                          </button>
                        </form>
                      )}
                      {proposal.status !== "archived" ? (
                        <form action={archiveProposalAction} className="contents">
                          <input type="hidden" name="proposalId" value={proposal.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button className="db-action db-action--danger" type="submit" title="Архивировать">↓</button>
                        </form>
                      ) : (
                        <DeleteConfirmButton
                          action={deleteProposalAction}
                          idName="proposalId"
                          idValue={proposal.id}
                          returnTo={returnTo}
                          label="Удалить"
                          confirmMessage={`Удалить концепт «${proposal.title}» навсегда?`}
                          className="db-action db-action--danger"
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ── Добавить концепт ── */}
              {company.status !== "archived" && (
                <form action={createProposalAction} className="db-add-proposal">
                  <input type="hidden" name="companyId" value={company.id} />
                  <input type="hidden" name="preset" value="industrial-dark" />
                  <span className="db-proposal-indent db-proposal-indent--add">+</span>
                  <input className="db-add-proposal__input" name="title" placeholder="Новый концепт..." required />
                  <button className="db-action db-action--primary" type="submit">Создать</button>
                </form>
              )}

              {/* ── Редактировать компанию (раскрываемая) ── */}
              <details className="db-company-edit">
                <summary className="db-edit-toggle">Редактировать компанию</summary>
                <form action={updateCompanyCrmAction} className="db-edit-form sm:grid-cols-2">
                  <input type="hidden" name="companyId" value={company.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="responsible" value={company.contacts.responsible ?? ""} />
                  <input type="hidden" name="leadSource" value={company.contacts.leadSource ?? ""} />
                  <input type="hidden" name="contactDeadline" value={company.contacts.contactDeadline ?? ""} />
                  <input type="hidden" name="nextStep" value={company.contacts.nextStep ?? ""} />
                  <div className="sm:col-span-2">
                    <span className="db-quick-add__field-label">Фото компании</span>
                    <CompanyImageUpload currentUrl={company.previewImageUrl} />
                  </div>
                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block">Название</span>
                    <input className="builder-field" name="name" defaultValue={company.name} required />
                  </label>
                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block">Статус</span>
                    <select className="builder-select" name="status" defaultValue={company.status}>
                      {companyStatuses.map((s) => <option key={s} value={s}>{companyStatusLabels[s]}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block">Сайт</span>
                    <input className="builder-field" name="websiteUrl" defaultValue={company.websiteUrl ?? ""} placeholder="https://company.ru" />
                  </label>
                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block">Подниша</span>
                    <input className="builder-field" name="industry" defaultValue={company.industry ?? ""} />
                  </label>
                  <label className="block text-sm text-slate-300 sm:col-span-2">
                    <span className="mb-2 block">Описание</span>
                    <textarea className="builder-area min-h-20" name="shortDescription" defaultValue={company.shortDescription ?? ""} />
                  </label>
                  <label className="block text-sm text-slate-300 sm:col-span-2">
                    <span className="mb-2 block">Заметки</span>
                    <textarea className="builder-area min-h-20" name="notes" defaultValue={company.notes ?? ""} />
                  </label>
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                    <button className="builder-action-secondary" type="submit">Сохранить</button>
                    <button className="builder-action-secondary" type="submit" formAction={openCompanyEditorAction}>Редактор компании</button>
                  </div>
                </form>
              </details>

            </div>
          );
        })}
      </section>

    </main>
  );
}

