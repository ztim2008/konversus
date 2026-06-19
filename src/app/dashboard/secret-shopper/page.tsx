"use client";

import { useState } from "react";
import { Search, ChevronDown, ExternalLink, Phone, Mail, Send, FileText, RefreshCw } from "lucide-react";

interface SiteResult {
  domain: string;
  name: string;
  ssl?: { valid: boolean; daysRemaining: number; grade: string };
  http?: { hasHttps: boolean; statusCode: number };
  score: number;
  contacts?: { phone?: string; email?: string };
}

const NICHES = ["Стоматологии", "Строительство", "Кафе и рестораны", "Автосервисы", "Юристы", "Клиники", "Салоны красоты", "Фитнес-клубы", "Отели", "Грузоперевозки"];
const CITIES = ["Москва", "Санкт-Петербург", "Казань", "Екатеринбург", "Новосибирск", "Краснодар", "Ростов-на-Дону", "Нижний Новгород", "Челябинск", "Самара"];

export default function SecretShopperPage() {
  const [city, setCity] = useState("Москва");
  const [niche, setNiche] = useState("Стоматологии");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SiteResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewSite, setPreviewSite] = useState<SiteResult | null>(null);
  const [template, setTemplate] = useState(`Здравствуйте!

Провёл аудит вашего сайта [ДОМЕН]. Нашёл несколько проблем, которые могут влиять на клиентов:

[ПРОБЛЕМЫ]

Я могу это исправить за 2-3 дня. Вот примеры моих работ: behance.net/timofeev_aleksey

Если интересно — напишите в Telegram @bilarius или позвоните +7 921 201-32-52. Первая консультация бесплатно.

Алексей Тимофеев
Konversus · 17 лет в digital`);

  const PROBLEMS = ["SSL-сертификат истекает", "Мобильная версия не адаптирована", "SEO не настроено", "Скорость загрузки низкая", "Нет HTTPS"];

  async function handleSearch() {
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/secret-shopper/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, niche }),
      });
      const data = await res.json();
      
      // Базовые результаты
      const sites: SiteResult[] = (data.sites || []).map((s: any) => ({
        domain: s.domain,
        name: s.name,
        score: 50,
        ssl: undefined,
        http: undefined,
        contacts: {},
      }));
      
      setResults(sites);
    } catch { setResults([]); }
    setLoading(false);
  }

  function __OLD_HANDLE__() {
    // Старый мок-код удалён
    const mockDomains: SiteResult[] = [
      { domain: "stomat-1.ru", name: "Стоматология «Улыбка»", ssl: { valid: true, daysRemaining: 8, grade: "B" }, http: { hasHttps: true, statusCode: 200 }, score: 38, contacts: { phone: "+7 (495) 123-45-67", email: "info@stomat-1.ru" } },
      { domain: "stomat-2.ru", name: "Дентал Профи", ssl: { valid: false, daysRemaining: 0, grade: "F" }, http: { hasHttps: false, statusCode: 0 }, score: 15, contacts: { phone: "+7 (495) 234-56-78" } },
      { domain: "stomat-3.ru", name: "Стоматология №1", ssl: { valid: true, daysRemaining: 89, grade: "A" }, http: { hasHttps: true, statusCode: 200 }, score: 78, contacts: { email: "hello@stomat-3.ru" } },
      { domain: "stomat-4.ru", name: "Доктор Зуб", ssl: { valid: true, daysRemaining: 14, grade: "C" }, http: { hasHttps: true, statusCode: 200 }, score: 52, contacts: { phone: "+7 (495) 345-67-89", email: "dr@stomat-4.ru" } },
      { domain: "stomat-5.ru", name: "Дентал Люкс", ssl: { valid: false, daysRemaining: 0, grade: "F" }, http: { hasHttps: false, statusCode: 0 }, score: 10, contacts: {} },
    ];
    setResults(mockDomains);
    setLoading(false);
  }

  function toggleSelect(domain: string) {
    const next = new Set(selected);
    next.has(domain) ? next.delete(domain) : next.add(domain);
    setSelected(next);
  }

  function generateReport(site: SiteResult) {
    const problems = [];
    if (site.ssl && !site.ssl.valid) problems.push("🔴 SSL-сертификат истёк");
    else if (site.ssl && site.ssl.daysRemaining <= 14) problems.push(`🔴 SSL истекает через ${site.ssl.daysRemaining} дн.`);
    if (site.http && !site.http.hasHttps) problems.push("🔴 Сайт недоступен по HTTPS");
    if (site.score < 40) problems.push("🔴 Общая оценка сайта: критическая");
    else if (site.score < 60) problems.push("🟡 Общая оценка сайта: ниже среднего");

    return template
      .replace(/\[ДОМЕН\]/g, site.domain)
      .replace(/\[ПРОБЛЕМЫ\]/g, problems.join("\n") || "Мелкие замечания по SEO и скорости");
  }

  return (
    <div className="min-h-screen bg-[#0a0e13] text-gray-300 p-6 sm:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">🔍 Тайный покупатель</h1>
          <p className="mt-2 text-sm text-gray-500">Поиск сайтов с проблемами для персональных КП</p>
        </div>

        {/* Форма поиска */}
        <div className="border border-white/[0.06] bg-[#0f172a] p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2">Город</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white">
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">Ниша</label>
              <select value={niche} onChange={(e) => setNiche(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white">
                {NICHES.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={handleSearch} disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50">
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                {loading ? "Ищем..." : "Найти сайты"}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-600">Поиск по Яндекс Картам, 2ГИС и поиску. Результаты — эмуляция. Реальный парсинг в Фазе 2.</p>
        </div>

        {/* Результаты */}
        {results.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">Найдено: <span className="text-white font-semibold">{results.length}</span> сайтов · С проблемами: <span className="text-red-400 font-semibold">{results.filter(r => r.score < 60).length}</span></p>
              {selected.size > 0 && (
                <button onClick={() => setPreviewSite(results.find(r => selected.has(r.domain)) || null)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
                  <FileText size={14} /> Отчёт для выбранных ({selected.size})
                </button>
              )}
            </div>

            <div className="border border-white/[0.06] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-[#0f172a]">
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">☐</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Сайт</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">SSL</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Оценка</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Контакты</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((site) => (
                    <tr key={site.domain} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${selected.has(site.domain) ? "bg-indigo-500/5" : ""}`}>
                      <td className="p-4">
                        <input type="checkbox" checked={selected.has(site.domain)} onChange={() => toggleSelect(site.domain)} className="rounded" />
                      </td>
                      <td className="p-4">
                        <p className="text-white font-semibold">{site.name}</p>
                        <p className="text-xs text-gray-500">{site.domain}</p>
                      </td>
                      <td className="p-4">
                        {site.ssl ? (
                          site.ssl.valid
                            ? <span className={`text-xs font-semibold ${site.ssl.daysRemaining <= 14 ? "text-amber-400" : "text-green-400"}`}>✅ {site.ssl.daysRemaining} дн</span>
                            : <span className="text-xs font-semibold text-red-400">❌ Истёк</span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${site.score < 40 ? "bg-red-500/10 text-red-400" : site.score < 60 ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-400"}`}>
                          {site.score}/100
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {site.contacts?.phone && <span className="text-xs text-gray-400"><Phone size={12} className="inline mr-1" />{site.contacts.phone}</span>}
                          {site.contacts?.email && <span className="text-xs text-gray-400"><Mail size={12} className="inline mr-1" />{site.contacts.email}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <button onClick={() => setPreviewSite(site)} className="text-xs text-indigo-400 hover:text-indigo-300">
                          КП →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Превью КП */}
        {previewSite && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewSite(null)}>
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="font-bold text-white">📄 Коммерческое предложение</h3>
                <button onClick={() => setPreviewSite(null)} className="text-gray-500 hover:text-white">✕</button>
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
                  value={generateReport(previewSite)}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-4 text-sm text-gray-300 min-h-[200px] resize-y mb-4"
                />
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                  <div className="text-xs text-gray-500">
                    <span className="text-indigo-400">📱 @bilarius</span> · <span className="text-indigo-400">📞 +7 921 201-32-52</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(generateReport(previewSite))} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                      📋 Копировать
                    </button>
                    <button onClick={() => window.open(`https://t.me/bilarius`, "_blank")} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
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
