"use client";
import type { PipelineLead } from "../lib/types";

export function PipelineTable({
  pipelineLeads, onStatusChange, onDelete,
}: {
  pipelineLeads: PipelineLead[]; onStatusChange: (id: string, status: string) => void; onDelete: (id: string) => void;
}) {
  const active = pipelineLeads.filter(l => l.status !== "new" || l.opened);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Лиды в работе ({active.length})</h2>
        <div className="flex gap-3 text-xs">
          <span className="text-green-400">{pipelineLeads.filter(l => l.status === "replied" || l.status === "won").length} отвечено</span>
          <span className="text-amber-400">{pipelineLeads.filter(l => l.status === "contacted").length} отправлено</span>
        </div>
      </div>
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0f172a]">
              <th className="p-4 text-xs text-gray-500 text-left">Сайт</th>
              <th className="p-4 text-xs text-gray-500 text-left">Статус</th>
              <th className="p-4 text-xs text-gray-500 text-left">Контакты</th>
              <th className="p-4 text-xs text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {active.map(lead => (
              <tr key={lead.id} className="border-b border-white/[0.04]">
                <td className="p-4">
                  <span className="text-white font-semibold text-sm">{lead.name}</span>
                  <a href={lead.url} target="_blank" rel="noopener" className="block text-xs text-indigo-400/70">{lead.domain} ↗</a>
                  {lead.phone && <span className="text-xs text-gray-500 block">{lead.phone}</span>}
                </td>
                <td className="p-4">
                  <select
                    defaultValue={lead.status}
                    onChange={e => onStatusChange(lead.id, e.target.value)}
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
                <td className="p-4"><span className="text-xs text-gray-400">{lead.email}</span></td>
                <td className="p-4"><button onClick={() => onDelete(lead.id)} className="text-xs text-gray-600 hover:text-red-400">🗑</button></td>
              </tr>
            ))}
            {active.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500 text-sm">Нет лидов в работе. Отправьте КП.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
