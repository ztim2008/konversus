"use client";
import { Phone, Mail } from "lucide-react";
import type { Lead } from "../lib/types";
import { hotLabel } from "../lib/utils";

export function LeadTable({
  leads, onPreviewKp, onDelete,
}: {
  leads: Lead[]; onPreviewKp: (lead: Lead) => void; onDelete: (lead: Lead) => void;
}) {
  if (leads.length === 0) return null;
  const criticalCount = leads.filter(l => l.score >= 5).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Лиды ({leads.length}) <span className="text-xs text-red-400 ml-2">{criticalCount} критических</span>
        </h2>
      </div>
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0f172a]">
              <th className="text-left p-4 text-xs text-gray-500">Сайт</th>
              <th className="text-left p-4 text-xs text-gray-500">Оценка</th>
              <th className="text-left p-4 text-xs text-gray-500">Проблемы</th>
              <th className="text-left p-4 text-xs text-gray-500">Статус</th>
              <th className="text-left p-4 text-xs text-gray-500">Контакты</th>
              <th className="text-left p-4 text-xs text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.domain} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="p-4">
                  <a href={lead.url} target="_blank" rel="noopener" className="text-white font-semibold hover:text-indigo-400">{lead.name}</a>
                  <a href={lead.url} target="_blank" rel="noopener" className="block text-xs text-indigo-400/70 hover:text-indigo-300">{lead.domain} ↗</a>
                  {lead.h1?.texts?.[0] && <span className="text-xs text-gray-500 italic block truncate max-w-[300px]">«{lead.h1.texts[0].slice(0, 100)}»</span>}
                  {lead.cms && (
                    <span className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block font-medium ${
                      (lead as any).cmsTier === 'constructor' ? 'bg-amber-500/15 text-amber-400' :
                      (lead as any).cmsTier === 'enterprise' ? 'bg-blue-500/15 text-blue-400' :
                      (lead as any).cmsTier === 'custom' ? 'bg-green-500/15 text-green-400' :
                      (lead as any).cmsTier === 'framework' ? 'bg-purple-500/15 text-purple-400' :
                      'bg-white/5 text-gray-500'
                    }`}>
                      {(lead as any).cmsTier === 'constructor' ? '🧱' : (lead as any).cmsTier === 'enterprise' ? '🏢' : (lead as any).cmsTier === 'custom' ? '⚡' : (lead as any).cmsTier === 'framework' ? '⚛️' : '📦'} {lead.cms}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: lead.gradeColor + "15", color: lead.gradeColor }}>{lead.scorePercent}%</span>
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: hotLabel(lead.hotScore).c + "15", color: hotLabel(lead.hotScore).c }}>{hotLabel(lead.hotScore).e} {lead.hotScore}</span>
                  </div>
                </td>
                <td className="p-4"><div className="flex flex-col gap-1">{lead.problems.slice(0, 2).map(p => <span key={p} className="text-xs text-gray-400">{p}</span>)}</div></td>
                <td className="p-4">
                  <div className="flex flex-col gap-1 text-xs">
                    {lead.problems.includes("📩 отправлено") ? (
                      <span className="text-green-400">📩 Отправлено</span>
                    ) : lead.problems.includes("📞 позвонить") ? (
                      <span className="text-amber-400">⏳ Ждёт 3+ дня</span>
                    ) : ""}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1 text-xs text-gray-400">
                    {lead.phone && <span><Phone size={10} className="inline mr-1"/>{lead.phone}</span>}
                    {lead.email && <span><Mail size={10} className="inline mr-1"/>{lead.email}</span>}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => onPreviewKp(lead)} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">КП</button>
                    <button onClick={() => onDelete(lead)} className="text-xs text-gray-600 hover:text-red-400">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
