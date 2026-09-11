"use client";
import type { Radar } from "../lib/types";

export function RadarList({
  radars,
  selectedRadarId,
  onSelect,
  onDelete,
}: {
  radars: Radar[];
  selectedRadarId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (radars.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
        <p className="text-sm text-gray-400">Пока нет сохранённых радаров Maps.</p>
        <p className="text-xs text-gray-600 mt-2 max-w-md mx-auto">
          Утреннюю пачку крутит вкладка «Рулетка» + cron, не этот список. Здесь —
          ручной поиск по городу/нише (старый контур).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {radars.map((radar) => (
        <div
          key={radar.id}
          onClick={() => onSelect(radar.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
            selectedRadarId === radar.id
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-white/5 bg-white/[0.02] hover:border-white/10"
          }`}
        >
          <span className="text-base">{radar.active ? "📡" : "⏸"}</span>
          <div>
            <div className="text-sm font-semibold text-white">{radar.niche}</div>
            <div className="text-xs text-gray-500">
              {radar.city} · {radar.leadCount} сайтов
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(radar.id);
            }}
            className="ml-2 text-gray-600 hover:text-red-400 text-xs"
            title="Удалить радар"
          >
            🗑
          </button>
        </div>
      ))}
    </div>
  );
}
