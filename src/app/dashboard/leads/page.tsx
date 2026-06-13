import type { Metadata } from "next";
import Link from "next/link";
import { requireCurrentAdmin } from "@/lib/auth/session";
import {
  listLeads,
  LEAD_STATUS_LABELS,
  LEAD_PRIORITY_LABELS,
  type LeadStatus,
} from "@/lib/data/leads";
import { updateLeadStatusAction, updateLeadPriorityAction, deleteLeadAction } from "./actions";
import { AddLeadForm } from "@/components/leads/add-lead-form";

export const metadata: Metadata = {
  title: "Lead Hunter · Dashboard",
  robots: { index: false, follow: false },
};

const STATUS_ORDER: LeadStatus[] = [
  "new", "analyzed", "proposal_sent", "negotiating", "client", "archive",
];

const PRIORITY_COLOR_CLASS: Record<string, string> = {
  high: "lh-priority-high",
  medium: "lh-priority-medium",
  low: "lh-priority-low",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireCurrentAdmin();
  const sp = await searchParams;
  const statusFilter = (sp.status as LeadStatus) || undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const perPage = 30;

  const { leads, total } = await listLeads({
    status: statusFilter,
    limit: perPage,
    offset: (page - 1) * perPage,
  });

  const totalPages = Math.ceil(total / perPage);

  return (
    <main className="lh-page">
      <div className="lh-header">
        <div>
          <div className="lh-header-badge">🎯 Lead Hunter</div>
          <h1 className="lh-header-title">База лидов</h1>
          <p className="lh-header-sub">{total} компаний в базе</p>
        </div>
        <div className="lh-header-actions">
          <Link href="/dashboard" className="lh-btn lh-btn-ghost">← Дашборд</Link>
          <AddLeadForm />
        </div>
      </div>

      <div className="lh-filters">
        <Link href="/dashboard/leads" className={`lh-filter-btn ${!statusFilter ? "lh-filter-btn-active" : ""}`}>Все</Link>
        {STATUS_ORDER.map((s) => (
          <Link key={s} href={`/dashboard/leads?status=${s}`} className={`lh-filter-btn ${statusFilter === s ? "lh-filter-btn-active" : ""}`}>
            {LEAD_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="lh-empty">
          <div className="lh-empty-icon">🎯</div>
          <div className="lh-empty-title">Лидов пока нет</div>
          <p className="lh-empty-sub">{statusFilter ? `Нет лидов со статусом «${LEAD_STATUS_LABELS[statusFilter]}»` : "Добавьте первый сайт для анализа"}</p>
        </div>
      ) : (
        <div className="lh-table-wrap">
          <table className="lh-table">
            <thead><tr>
              <th>Компания / Сайт</th>
              <th>Оценка</th>
              <th>Приоритет</th>
              <th>Статус</th>
              <th>Добавлен</th>
              <th></th>
            </tr></thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className={`lh-row ${lead.status === "archive" ? "lh-row-archived" : ""}`}>
                  <td>
                    <div className="lh-company-name">{lead.company_name || new URL(lead.url).hostname}</div>
                    <a href={lead.url} target="_blank" rel="noopener noreferrer" className="lh-company-url">{new URL(lead.url).hostname} ↗</a>
                  </td>
                  <td>
                    {lead.site_score != null ? (
                      <span className={`lh-score lh-score-${lead.site_score >= 7 ? "good" : lead.site_score >= 4 ? "med" : "bad"}`}>{lead.site_score}/10</span>
                    ) : (
                      <span className="lh-score-pending">анализ…</span>
                    )}
                  </td>
                  <td>
                    <form>
                      <input type="hidden" name="id" value={lead.id} />
                      <select name="priority" defaultValue={lead.priority ?? ""} className={`lh-select ${lead.priority ? PRIORITY_COLOR_CLASS[lead.priority] : ""}`}>
                        <option value="">—</option>
                        {Object.entries(LEAD_PRIORITY_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <button type="submit" style={{display:"none"}} formAction={async (fd: FormData) => {
                        "use server";
                        const p = fd.get("priority") as string;
                        if (p) await updateLeadPriorityAction(fd.get("id") as string, p as "high"|"medium"|"low");
                      }} />
                    </form>
                  </td>
                  <td>
                    <form>
                      <input type="hidden" name="id" value={lead.id} />
                      <select name="status" defaultValue={lead.status} className="lh-select">
                        {STATUS_ORDER.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
                      </select>
                      <button type="submit" style={{display:"none"}} formAction={async (fd: FormData) => {
                        "use server";
                        await updateLeadStatusAction(fd.get("id") as string, fd.get("status") as LeadStatus);
                      }} />
                    </form>
                  </td>
                  <td className="lh-date">{new Date(lead.created_at).toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"2-digit"})}</td>
                  <td>
                    <div className="lh-row-actions">
                      {lead.architect_id && (
                        <a href={`/architect/${lead.architect_id}`} target="_blank" rel="noopener noreferrer" className="lh-action-btn" title="Полный анализ">📊</a>
                      )}
                      <form style={{display:"inline"}}>
                        <input type="hidden" name="id" value={lead.id} />
                        <button className="lh-action-btn lh-action-btn-del" title="Удалить"
                          formAction={async (fd: FormData) => { "use server"; await deleteLeadAction(fd.get("id") as string); }}>✕</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="lh-pagination">
          {page > 1 && <Link href={`/dashboard/leads?${statusFilter?`status=${statusFilter}&`:""}page=${page-1}`} className="lh-page-btn">← Назад</Link>}
          <span className="lh-page-info">стр. {page} из {totalPages}</span>
          {page < totalPages && <Link href={`/dashboard/leads?${statusFilter?`status=${statusFilter}&`:""}page=${page+1}`} className="lh-page-btn">Вперёд →</Link>}
        </div>
      )}
    </main>
  );
}
