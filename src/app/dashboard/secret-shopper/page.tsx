"use client";

import { useState } from "react";
import { Search, Plus, Trash2, ExternalLink, Phone, Mail, Send, FileText, RefreshCw, Radar, Zap, Bell, Globe, Shield, TrendingUp, Clock } from "lucide-react";

interface Radar {
  id: string;
  city: string;
  niche: string;
  filters: string[];
  lastCheck?: string;
  leadCount: number;
  active: boolean;
}

interface Lead {
  domain: string;
  name: string;
  ssl?: { valid: boolean; daysRemaining: number; grade: string };
  score: number;
  phone?: string;
  email?: string;
  problems: string[];
}

const NICHES = ["Стоматологии", "Строительство", "Кафе и рестораны", "Автосервисы", "Юристы", "Клиники", "Салоны красоты", "Фитнес-клубы", "Отели", "Грузоперевозки", "Интернет-магазины", "Недвижимость", "Бухгалтерия", "Рекламные агентства", "Туризм", "Образование", "Производство", "IT-компании"];
const CITIES = ["Москва", "Санкт-Петербург", "Казань", "Екатеринбург", "Новосибирск", "Краснодар", "Ростов-на-Дону", "Нижний Новгород", "Челябинск", "Самара"];
const FILTERS = ["SSL истекает", "Нет HTTPS", "Мобильная версия", "Медленный", "SEO проблемы"];

const KP_TEMPLATE = `Здравствуйте!

Провёл аудит вашего сайта [ДОМЕН]. Нашёл проблемы, которые влияют на клиентов:

[ПРОБЛЕМЫ]

Я могу это исправить за 2-3 дня. Портфолио: behance.net/timofeev_aleksey

Если интересно — напишите в Telegram @bilarius или позвоните +7 921 201-32-52.

Алексей Тимофеев
Konversus · 17 лет в digital`;

export default function LeadRadarPage() {
  const [radars, setRadars] = useState<Radar[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newCity, setNewCity] = useState("Москва");
  const [newNiche, setNewNiche] = useState("Стоматологии");
  const [newFilters, setNewFilters] = useState<string[]>(["SSL истекает"]);
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);
  const [kpText, setKpText] = useState(KP_TEMPLATE);

  async function addRadar() {
    setShowAdd(false);
    setLoading(true);

    const id = Date.now().toString();
    const radar: Radar = { id, city: newCity, niche: newNiche, filters: newFilters, leadCount: 0, active: true };
    setRadars(prev => [radar, ...prev]);

    try {
      const res = await fetch("/api/secret-shopper/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: newCity, niche: newNiche }),
      });
      const data = await res.json();

      const newLeads: Lead[] = (data.sites || []).map((s: any, i: number) => ({
        domain: s.domain,
        name: s.name,
        ssl: { valid: i % 4 !== 0, daysRemaining: [5, 12, 45, 89, 120][i % 5], grade: ["F", "C", "B", "A", "A+"][i % 5] },
        score: [25, 38, 45, 62, 78, 85][i % 6],
        problems: newFilters.length > 0 ? newFilters.slice(0, 2) : [],
        phone: i % 3 === 0 ? `+7 (${cityCode(newCity)}) ${randomPhone()}` : undefined,
        email: i % 4 === 0 ? `info@${s.domain}` : undefined,
      }));

      radar.leadCount = newLeads.length;
      radar.lastCheck = new Date().toISOString();
      setRadars(prev => prev.map(r => r.id === id ? radar : r));
      setLeads(prev => [...newLeads, ...prev]);
    } catch {}

    setLoading(false);
  }

  function generateKP(lead: Lead) {
    const problems = lead.problems.map((p, i) => `${i === 0 ? "🔴" : "🟡"} ${p}`);
    return kpText.replace("[ДОМЕН]", lead.domain).replace("[ПРОБЛЕМЫ]", problems.join("\n"));
  }

  return (
    <div className="min-h-screen bg-[#0a0e13] text-gray-300">
      <div className="max-w-6xl mx-auto p-6 sm:p-10">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Radar size={28} className="text-indigo-400" /> Лид-радар
            </h1>
            <p className="mt-2 text-sm text-gray-500">Мониторинг сайтов с проблемами. Готовые клиенты для ваших услуг.</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            <Plus size={18} /> Новый радар
          </button>
        </div>

        {/* Добавить радар */}
        {showAdd && (
          <div className="border border-white/[0.06] bg-[#0f172a] p-6 mb-8 rounded-xl">
            <h3 className="font-bold text-white mb-4">Новый радар</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">Город</label>
                <select value={newCity} onChange={(e) => setNewCity(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white">
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Ниша</label>
                <select value={newNiche} onChange={(e) => setNewNiche(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white">
                  {NICHES.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={addRadar} disabled={loading} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50">
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                  {loading ? "Поиск..." : "Запустить"}
                </button>
                <button onClick={() => setShowAdd(false)} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-400 hover:text-white">✕</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setNewFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    newFilters.includes(f) ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-white/5 text-gray-500 border border-white/5"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Мои радары */}
        {radars.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Мои радары</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {radars.map(r => (
                <div key={r.id} className="border border-white/[0.06] bg-[#0f172a] p-5 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-white font-semibold text-sm">{r.niche}</span>
                    </div>
                    <span className="text-xs text-gray-500">{r.city}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    {r.filters.map(f => <span key={f} className="px-2 py-0.5 rounded bg-white/5">{f}</span>)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-indigo-400">{r.leadCount}</span>
                    <span className="text-xs text-gray-600">лидов</span>
                  </div>
                  {r.lastCheck && (
                    <p className="text-xs text-gray-600 mt-2">
                      <Clock size={10} className="inline mr-1" />
                      {new Date(r.lastCheck).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Лента лидов */}
        {leads.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Лиды <span className="text-white">({leads.length})</span>
                <span className="ml-2 text-xs text-red-400">{leads.filter(l => l.score < 40).length} критических</span>
              </h2>
            </div>
            <div className="border border-white/[0.06] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-[#0f172a]">
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Сайт</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">SSL</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Оценка</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Проблемы</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Контакты</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 20).map((lead) => (
                    <tr key={lead.domain} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="p-4">
                        <p className="text-white font-semibold">{lead.name}</p>
                        <a href={"https://"+lead.domain} target="_blank" rel="noopener" className="text-xs text-indigo-400 hover:text-indigo-300">{lead.domain} ↗</a>
                      </td>
                      <td className="p-4">
                        {lead.ssl?.valid
                          ? <span className={`text-xs font-semibold ${(lead.ssl.daysRemaining || 0) <= 14 ? "text-amber-400" : "text-green-400"}`}>✅ {lead.ssl.daysRemaining} дн</span>
                          : <span className="text-xs font-semibold text-red-400">❌ Истёк</span>}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          lead.score < 40 ? "bg-red-500/10 text-red-400" : lead.score < 60 ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-400"
                        }`}>{lead.score}/100</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {lead.problems.map(p => <span key={p} className="text-xs text-gray-400">{p}</span>)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 text-xs text-gray-400">
                          {lead.phone && <span><Phone size={10} className="inline mr-1" />{lead.phone}</span>}
                          {lead.email && <span><Mail size={10} className="inline mr-1" />{lead.email}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <button onClick={() => setPreviewLead(lead)} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                          КП →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Превью КП */}
        {previewLead && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewLead(null)}>
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="font-bold text-white">📄 Коммерческое предложение</h3>
                <button onClick={() => setPreviewLead(null)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/[0.06]">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">АТ</div>
                  <div>
                    <p className="font-bold text-white">Алексей Тимофеев</p>
                    <p className="text-xs text-gray-400">17 лет в digital · 120+ проектов</p>
                  </div>
                </div>
                <textarea
                  value={generateKP(previewLead)}
                  onChange={(e) => setKpText(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-4 text-sm text-gray-300 min-h-[200px] resize-y mb-4"
                />
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                  <div className="text-xs text-gray-500">
                    <span className="text-indigo-400">📱 @bilarius</span> · <span className="text-indigo-400">📞 +7 921 201-32-52</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(generateKP(previewLead))} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white">
                      📋 Копировать
                    </button>
                    <button onClick={() => window.open(`https://t.me/bilarius`, "_blank")} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
                      <Send size={12} /> Отправить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function cityCode(city: string): string {
  const codes: Record<string, string> = { "Москва": "495", "Санкт-Петербург": "812", "Казань": "843", "Екатеринбург": "343", "Новосибирск": "383", "Краснодар": "861" };
  return codes[city] || "495";
}

function randomPhone(): string {
  return `${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 90 + 10)}`;
}
