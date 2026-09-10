"use client";
import { useMemo, useState } from "react";
import type { PipelineLead } from "../lib/types";

type Filter = "all" | "contacted" | "replied";

export function PipelineTable({
  pipelineLeads,
  onStatusChange,
  onDelete,
  onMarkReplied,
}: {
  pipelineLeads: PipelineLead[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onMarkReplied?: (id: string) => Promise<void> | void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const active = pipelineLeads.filter((l) => l.status !== "new" || l.opened);

  const visible = useMemo(() => {
    if (filter === "contacted") {
      return active.filter((l) => l.status === "contacted");
    }
    if (filter === "replied") {
      return active.filter((l) => l.status === "replied" || l.status === "won");
    }
    return active;
  }, [active, filter]);

  async function markReply(id: string) {
    if (!onMarkReplied) return;
    if (!confirm("Отметить ответ / заявку? Уйдёт уведомление в Telegram.")) return;
    setBusyId(id);
    try {
      await onMarkReplied(id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">
          Лиды в работе ({visible.length}
          {filter !== "all" ? ` / ${active.length}` : ""})
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(
            [
              ["all", "Все"],
              ["contacted", "Отправлено"],
              ["replied", "Ответили"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={
                "px-3 py-1.5 rounded-lg font-semibold " +
                (filter === key
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-gray-400 hover:text-white")
              }
            >
              {label}
            </button>
          ))}
          <span className="text-green-400 ml-2">
            {pipelineLeads.filter((l) => l.status === "replied" || l.status === "won").length}{" "}
            отвечено
          </span>
          <span className="text-amber-400">
            {pipelineLeads.filter((l) => l.status === "contacted").length} отправлено
          </span>
        </div>
      </div>
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0f172a]">
              <th className="p-4 text-xs text-gray-500 text-left">Сайт</th>
              <th className="p-4 text-xs text-gray-500 text-left">Статус</th>
              <th className="p-4 text-xs text-gray-500 text-left">Контакты</th>
              <th className="p-4 text-xs text-gray-500 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((lead) => (
              <tr key={lead.id} className="border-b border-white/[0.04]">
                <td className="p-4">
                  <span className="text-white font-semibold text-sm">{lead.name}</span>
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noopener"
                    className="block text-xs text-indigo-400/70"
                  >
                    {lead.domain} ↗
                  </a>
                  {lead.phone && (
                    <span className="text-xs text-gray-500 block">{lead.phone}</span>
                  )}
                </td>
                <td className="p-4">
                  <select
                    value={lead.status}
                    onChange={(e) => onStatusChange(lead.id, e.target.value)}
                    className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="new">Новый</option>
                    <option value="contacted">📩 Отправлено</option>
                    <option value="replied">✅ Отвечено</option>
                    <option value="won">🏆 Выиграл</option>
                    <option value="lost">❌ Проиграл</option>
                  </select>
                  {lead.opened && <span className="text-xs text-blue-400 ml-2">👁</span>}
                </td>
                <td className="p-4">
                  <span className="text-xs text-gray-400">{lead.email}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {lead.status !== "replied" &&
                      lead.status !== "won" &&
                      onMarkReplied && (
                        <button
                          type="button"
                          disabled={busyId === lead.id}
                          onClick={() => markReply(lead.id)}
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                        >
                          {busyId === lead.id ? "…" : "🔥 Ответ"}
                        </button>
                      )}
                    <button
                      onClick={() => onDelete(lead.id)}
                      className="text-xs text-gray-600 hover:text-red-400"
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500 text-sm">
                  {filter === "replied"
                    ? "Пока нет ответов."
                    : filter === "contacted"
                      ? "Нет отправленных без ответа."
                      : "Нет лидов в работе. Отправьте КП."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
