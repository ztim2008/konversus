"use client";
import { Plus } from "lucide-react";
import { NICHE_SUGGESTIONS, CITIES } from "../lib/types";

export function RadarForm({
  show, onClose, newCity, setNewCity, newNiche, setNewNiche, onAdd, loading,
}: {
  show: boolean; onClose: () => void;
  newCity: string; setNewCity: (v: string) => void;
  newNiche: string; setNewNiche: (v: string) => void;
  onAdd: () => void; loading: boolean;
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="font-bold text-white"><Plus size={16} className="inline mr-2" />Новый радар</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Город</label>
            <select value={newCity} onChange={e => setNewCity(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ниша (можно ввести свою)</label>
            <input
              type="text"
              list="niche-suggestions"
              value={newNiche}
              onChange={e => setNewNiche(e.target.value)}
              placeholder="Например: дизайн интерьера, фотографы..."
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600"
            />
            <datalist id="niche-suggestions">
              {NICHE_SUGGESTIONS.map(n => <option key={n} value={n} />)}
            </datalist>
            <p className="text-xs text-gray-600 mt-1">Начните вводить — появятся подсказки. Или введите свою нишу.</p>
          </div>
          <button
            onClick={onAdd}
            disabled={loading || !newNiche.trim()}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "⏳ Ищем..." : "🚀 Запустить поиск"}
          </button>
        </div>
      </div>
    </div>
  );
}
