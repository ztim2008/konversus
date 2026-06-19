"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Trash2, ExternalLink, Phone, Mail, Send, FileText, RefreshCw, Radar, Zap, Clock, CheckCircle, XCircle, ArrowUpRight } from "lucide-react";

interface Radar {
  id: string; city: string; niche: string; filters: string[];
  lastCheck?: string; leadCount: number; active: boolean;
}

interface Lead {
  id: string; domain: string; name: string; url: string;
  ssl?: { valid: boolean; daysRemaining: number; grade: string };
  score: number; scorePercent: number;
  phone?: string; email?: string;
  problems: string[];
  gradeColor: string;
}

const NICHES = ["Стоматологии","Строительство","Кафе и рестораны","Автосервисы","Юристы","Клиники","Салоны красоты","Фитнес-клубы","Отели","Грузоперевозки","Интернет-магазины","Недвижимость","Бухгалтерия","Рекламные агентства","Туризм","Образование","Производство","IT-компании"];
const CITIES = ["Москва","Санкт-Петербург","Казань","Екатеринбург","Новосибирск","Краснодар","Ростов-на-Дону","Нижний Новгород","Челябинск","Самара"];

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
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);
  const [kpText, setKpText] = useState(KP_TEMPLATE);
  const [selectedRadarId, setSelectedRadarId] = useState<string | null>(null);
  const [auditProgress, setAuditProgress] = useState("");

  // Загружаем радары из БД
  useEffect(() => {
    fetch("/api/lead-radar").then(r => r.json()).then(d => setRadars(d.radars || [])).catch(() => {});
  }, []);

  async function addRadar() {
    setShowAdd(false); setLoading(true);

    // Сохраняем радар в БД
    const res = await fetch("/api/lead-radar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", city: newCity, niche: newNiche, filters: [] }),
    });
    const { id } = await res.json();
    setSelectedRadarId(id);

    // Поиск сайтов
    setAuditProgress("🔍 Ищем компании...");
    const searchRes = await fetch("/api/secret-shopper/search", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: newCity, niche: newNiche }),
    });
    const data = await searchRes.json();

    // Аудит
    setAuditProgress("🧠 Проверяем сайты...");
    const auditRes = await fetch("/api/secret-shopper/audit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sites: data.sites }),
    });
    const auditData = await auditRes.json();

    // Контакты
    setAuditProgress("📞 Ищем контакты...");
    let contacts: any[] = [];
    try {
      const cRes = await fetch("/api/secret-shopper/contacts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sites: data.sites.slice(0, 10) }),
      });
      const cData = await cRes.json();
      contacts = cData.contacts || [];
    } catch {}

    // Формируем лиды
    const newLeads: Lead[] = (auditData.results || []).map((r: any, i: number) => {
      const contact = contacts.find((c: any) => c.domain === r.domain);
      return {
        id: "",
        domain: r.domain,
        name: r.name,
        url: `https://${r.domain}`,
        ssl: { valid: r.audit?.ssl, daysRemaining: r.audit?.ssl ? 90 : 0, grade: r.audit?.grade || "?" },
        score: r.audit?.score || 0,
        scorePercent: r.audit?.scorePercent || 50,
        problems: r.audit?.issues || [],
        gradeColor: r.audit?.gradeColor || "#10b981",
        phone: contact?.phone,
        email: contact?.email,
      };
    });

    // Сохраняем сайты в БД
    await fetch("/api/lead-radar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save-sites", radarId: id,
        sites: newLeads.map(l => ({
          domain: l.domain, name: l.name, url: l.url,
          ssl_status: l.ssl?.valid ? "ok" : "error", ssl_days: l.ssl?.daysRemaining,
          ssl_grade: l.ssl?.grade, score: l.score, phone: l.phone, email: l.email,
          problems: l.problems,
        })),
      }),
    });

    // Обновляем список
    const radar: Radar = { id, city: newCity, niche: newNiche, filters: [], leadCount: newLeads.length, active: true };
    setRadars(prev => [radar, ...prev]);
    setLeads(newLeads);
    setAuditProgress("");
    setLoading(false);
  }

  async function deleteRadar(id: string) {
    await fetch("/api/lead-radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    setRadars(prev => prev.filter(r => r.id !== id));
    if (selectedRadarId === id) { setSelectedRadarId(null); setLeads([]); }
  }

  async function loadRadarSites(radarId: string) {
    setSelectedRadarId(radarId);
    const res = await fetch("/api/lead-radar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list-sites", radarId }),
    });
    const data = await res.json();
    setLeads((data.sites || []).map((s: any) => ({
      id: s.id, domain: s.domain, name: s.name, url: s.url || `https://${s.domain}`,
      ssl: { valid: s.ssl_status === "ok", daysRemaining: s.ssl_days || 0, grade: s.ssl_grade || "?" },
      score: s.score || 0, scorePercent: Math.max(0, 100 - (s.score || 0) * 12),
      problems: typeof s.problems === "string" ? JSON.parse(s.problems) : (s.problems || []),
      gradeColor: (s.score || 0) <= 2 ? "#10b981" : (s.score || 0) <= 4 ? "#f59e0b" : "#ef4444",
      phone: s.phone, email: s.email,
    })));
  }

  function generateKP(lead: Lead) {
    const problems = lead.problems.map((p, i) => `${i === 0 ? "🔴" : "🟡"} ${p}`);
    return kpText.replace("[ДОМЕН]", lead.domain).replace("[ПРОБЛЕМЫ]", problems.join("\n"));
  }

  const criticalCount = leads.filter(l => l.score >= 5).length;

  return (
    <div className="min-h-screen bg-[#0a0e13] text-gray-300">
      <div className="max-w-6xl mx-auto p-6 sm:p-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Radar size={28} className="text-indigo-400" /> Лид-радар</h1>
            <p className="mt-2 text-sm text-gray-500">Поиск сайтов с проблемами. Google Maps + 2GIS. Сохранение в БД.</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            <Plus size={18} /> Новый радар
          </button>
        </div>

        {showAdd && (
          <div className="border border-white/[0.06] bg-[#0f172a] p-6 mb-8 rounded-xl">
            <h3 className="font-bold text-white mb-4">Новый радар</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="block text-xs text-gray-500 mb-2">Город</label><select value={newCity} onChange={e => setNewCity(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white">{CITIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label className="block text-xs text-gray-500 mb-2">Ниша</label><select value={newNiche} onChange={e => setNewNiche(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white">{NICHES.map(n => <option key={n}>{n}</option>)}</select></div>
              <div className="flex items-end gap-2">
                <button onClick={addRadar} disabled={loading} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                  {loading ? (auditProgress || "Поиск...") : "Запустить"}
                </button>
                <button onClick={() => setShowAdd(false)} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-400 hover:text-white">✕</button>
              </div>
            </div>
          </div>
        )}

        {radars.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Мои радары ({radars.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {radars.map(r => (
                <div key={r.id} onClick={() => loadRadarSites(r.id)} className={`border cursor-pointer p-5 rounded-xl transition-colors ${selectedRadarId === r.id ? "border-indigo-500/30 bg-indigo-500/5" : "border-white/[0.06] bg-[#0f172a] hover:border-white/10"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-semibold text-sm">{r.niche}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteRadar(r.id); }} className="text-gray-600 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span>{r.city}</span>
                  </div>
                  <span className="text-2xl font-bold text-indigo-400">{r.leadCount} <span className="text-xs text-gray-600">лидов</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {leads.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Лиды ({leads.length}) <span className="text-xs text-red-400 ml-2">{criticalCount} критических</span>
              </h2>
            </div>
            <div className="border border-white/[0.06] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/[0.06] bg-[#0f172a]"><th className="text-left p-4 text-xs text-gray-500">Сайт</th><th className="text-left p-4 text-xs text-gray-500">Оценка</th><th className="text-left p-4 text-xs text-gray-500">Проблемы</th><th className="text-left p-4 text-xs text-gray-500">Контакты</th><th className="text-left p-4 text-xs text-gray-500"></th></tr></thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.domain} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="p-4">
                        <a href={lead.url} target="_blank" rel="noopener" className="text-white font-semibold hover:text-indigo-400">{lead.name}</a>
                        <a href={lead.url} target="_blank" rel="noopener" className="block text-xs text-indigo-400/70 hover:text-indigo-300">{lead.domain} ↗</a>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: lead.gradeColor + "15", color: lead.gradeColor }}>{lead.scorePercent}%</span>
                      </td>
                      <td className="p-4"><div className="flex flex-col gap-1">{lead.problems.slice(0, 2).map(p => <span key={p} className="text-xs text-gray-400">{p}</span>)}</div></td>
                      <td className="p-4"><div className="flex flex-col gap-1 text-xs text-gray-400">{lead.phone && <span><Phone size={10} className="inline mr-1"/>{lead.phone}</span>}{lead.email && <span><Mail size={10} className="inline mr-1"/>{lead.email}</span>}</div></td>
                      <td className="p-4"><button onClick={() => setPreviewLead(lead)} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">КП →</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {previewLead && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewLead(null)}>
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between"><h3 className="font-bold text-white">📄 КП для {previewLead.domain}</h3><button onClick={() => setPreviewLead(null)} className="text-gray-500 hover:text-white">✕</button></div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/[0.06]">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">АТ</div>
                  <div><p className="font-bold text-white">Алексей Тимофеев</p><p className="text-xs text-gray-400">17 лет в digital · 120+ проектов</p></div>
                </div>
                <textarea value={generateKP(previewLead)} onChange={e => setKpText(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg p-4 text-sm text-gray-300 min-h-[200px] resize-y mb-4" />
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                  <div className="text-xs text-gray-500">📱 @bilarius · 📞 +7 921 201-32-52</div>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(generateKP(previewLead))} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white">📋 Копировать</button>
                    <button onClick={() => window.open(`https://t.me/bilarius`, "_blank")} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">📩 Отправить</button>
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
