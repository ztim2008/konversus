"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Trash2, ExternalLink, Phone, Mail, Send, FileText, RefreshCw, Radar, Zap, Clock, CheckCircle, XCircle, ArrowUpRight } from "lucide-react";

interface Radar {
  id: string; city: string; niche: string; filters: string[];
  lastCheck?: string; leadCount: number; active: boolean;
}

interface Lead {
  id: string; domain: string; name: string; url: string;
  h1?: { count: number; texts: string[]; ok: boolean };
  cms?: string | null;
  contactName?: string | null;
  sent?: boolean;
  status?: string;
  hotScore: number;
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

Я могу это исправить за 2-3 дня. Портфолио: <a href="https://konversus.ru/about" style="color:#6366f1;">konversus.ru/about</a>

Если интересно — напишите в <a href="https://t.me/bilarius" style="color:#6366f1;">Telegram @bilarius</a> или позвоните <a href="tel:+79212013252" style="color:#6366f1;">+7 921 201-32-52</a>.

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
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle"|"sending"|"checking"|"sent"|"error">("idle");
  const [leadStatus, setLeadStatus] = useState<string>("");
  const [architectLoading, setArchitectLoading] = useState(false);
  const [architectLink, setArchitectLink] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(true);
  const [sendToClient, setSendToClient] = useState(true);
  const [selectedRadarId, setSelectedRadarId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("radars");
  const [pipelineLeads, setPipelineLeads] = useState<any[]>([]);
  const [followUpStats, setFollowUpStats] = useState({ sent: 0, opened: 0, replied: 0, won: 0 });
  const [overdueFollowUps, setOverdueFollowUps] = useState<any[]>([]);
  const [auditProgress, setAuditProgress] = useState("");

  // Загружаем радары из БД
  useEffect(() => {
    fetch("/api/lead-radar").then(r => r.json()).then(d => setRadars((d.radars||[]).map((r:any)=>({...r,leadCount:r.lead_count||0})))).catch(() => {});
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
        h1: r.audit?.h1, cms: r.audit?.cms, hotScore: r.audit?.hotScore || 50, contactName: r.audit?.contactName, gradeColor: r.audit?.gradeColor || "#10b981",
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
      h1: null, cms: null, hotScore: s.hotScore || 50, contactName: null, gradeColor: (s.score || 0) <= 2 ? "#10b981" : (s.score || 0) <= 4 ? "#f59e0b" : "#ef4444",
      phone: s.phone, email: s.email,
    })));
  }

  async function runArchitect(lead: Lead) {
    setArchitectLoading(true);
    try {
      const res = await fetch("/api/architect/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: lead.url }),
      });
      const data = await res.json();
      if (data.id) {
        // Ждём результат
        let result = null;
        for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const check = await fetch(`/api/architect/${data.id}`);
          const checkData = await check.json();
          if (checkData.status === "done") { result = checkData.result_json || checkData; break; }
        }
        if (result) {
          const growth = result.growth_potential_pct || "?";
          const niche = result.niche || lead.name;
          const summary = result.summary || "";
          const archLink = `https://konversus.ru/architect/${data.id}`;
          setArchitectLink(archLink);
          const archText = `\n\n📈 Анализ роста бизнеса:\n• Ниша: ${niche}\n• Потенциал роста: +${growth}%\n• ${summary}\n• Полный отчёт: ${archLink}`;
          setKpText(prev => prev + archText);
        }
      }
    } catch {}
    setArchitectLoading(false);
  }


function buildEmailHtml(lead: any, kpText: string) {
  const problems = lead.problems || [];
  const scoreColor = lead.gradeColor || "#10b981";
  const photoUrl = "https://konversus.ru/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg";
  
  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0e13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e13;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">

  <!-- Header -->
  <tr><td style="padding:32px 40px 20px;text-align:center;">
    <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.02em;">Аудит сайта</div>
    <div style="font-size:16px;color:#6366f1;margin-top:6px;font-weight:600;">${lead.domain}</div>
  </td></tr>

  <!-- Problems -->
      setScanProgress(null);
  <tr><td style="padding:0 40px 24px;">
    <div style="font-size:14px;font-weight:600;color:#94a3b8;margin-bottom:12px;">Обнаруженные проблемы:</div>
    ${problems.map((p: string, i: number) => `
    <div style="padding:10px 16px;margin-bottom:8px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
      <span style="color:${i === 0 ? '#ef4444' : '#f59e0b'};font-weight:700;">${i === 0 ? '🔴' : '🟡'}</span>
      <span style="color:#d4d4d8;font-size:14px;">${p}</span>
    </div>`).join('')}
  </td></tr>

  <!-- KP Text -->
  <tr><td style="padding:0 40px 24px;">
    <div style="color:#d4d4d8;font-size:14px;line-height:1.7;white-space:pre-wrap;">${kpText.replace(/\n/g, '<br>')}</div>
  </td></tr>

  <!-- About Me Footer -->
  <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);background:rgba(99,102,241,0.05);">
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td width="56"><img src="${photoUrl}" width="48" height="48" style="border-radius:50%;object-fit:cover;border:2px solid #6366f1;" alt="Алексей Тимофеев" /></td>
        <td>
          <div style="font-weight:700;color:#fff;font-size:15px;">Алексей Тимофеев</div>
          <div style="color:#94a3b8;font-size:12px;margin-top:2px;">17 лет в digital · 120+ проектов</div>
          <div style="margin-top:8px;font-size:12px;">
            <a href="https://t.me/bilarius" style="color:#6366f1;text-decoration:none;margin-right:16px;">📱 @bilarius</a>
            <a href="tel:+79212013252" style="color:#6366f1;text-decoration:none;margin-right:16px;">📞 <a href="tel:+79212013252" style="color:#6366f1;">+7 921 201-32-52</a></a>
            <a href="https://konversus.ru" style="color:#6366f1;text-decoration:none;">🌐 konversus.ru</a>
          </div>
          <div style="margin-top:6px;font-size:11px;color:#64748b;">
            <a href="https://konversus.ru/about" style="color:#64748b;">Портфолио</a> · 
            <a href="https://ssl.konversus.ru" style="color:#64748b;">SSL Doctor</a> · 
            <a href="https://leads.konversus.ru" style="color:#64748b;">Leads AI</a>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

</table>
<div style="text-align:center;padding:16px;color:#475569;font-size:11px;">Отчёт создан сервисом Konversus Lead Radar</div>
</td></tr></table>
</body></html>`;
}

function generateKP(lead: Lead) {
    const name = lead.contactName || lead.name;
    const greeting = name && name.length > 0 ? `Здравствуйте, ${name}!` : "Здравствуйте!";
    const problems = lead.problems.filter(p => !p.includes("📩")).map((p, i) => `${i === 0 ? "🔴" : "🟡"} ${p}`);
    return kpText.replace("Здравствуйте!", greeting).replace("[ДОМЕН]", lead.domain).replace("[ПРОБЛЕМЫ]", problems.join("\n"));
  }

  function hotLabel(score: number) {
    if (score >= 75) return { e: "🔥", t: "ГОРЯЧИЙ", c: "#ef4444" };
    if (score >= 60) return { e: "🟡", t: "ТЁПЛЫЙ", c: "#f59e0b" };
    return { e: "🔵", t: "ХОЛОДНЫЙ", c: "#3b82f6" };
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
          <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveTab("radars")} className={"px-4 py-2 rounded-lg text-sm font-semibold " + (activeTab === "radars" ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400")}>📡 Радары</button>
            <button onClick={async () => { setActiveTab("pipeline"); const res = await fetch("/api/lead-radar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"list-all-sites"})}); const d = await res.json(); setPipelineLeads((d.sites||[]).map((s:any)=>({id:s.id,domain:s.domain,name:s.name,url:s.url||"https://"+s.domain,phone:s.phone,email:s.email,status:s.status,opened:!!s.opened_at}))); }} className={"px-4 py-2 rounded-lg text-sm font-semibold " + (activeTab === "pipeline" ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400")}>📋 Лиды в работе</button>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            <Plus size={18} /> Новый радар
          </button>
        </div>

        {activeTab === "radars" && showAdd && (
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

        {activeTab === "radars" && radars.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Мои радары ({radars.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {radars.map(r => (
                <div key={r.id} onClick={() => loadRadarSites(r.id)} className={`border cursor-pointer p-5 rounded-xl transition-colors ${selectedRadarId === r.id ? "border-indigo-500/30 bg-indigo-500/5" : "border-white/[0.06] bg-[#0f172a] hover:border-white/10"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-semibold text-sm">{r.niche}</span>
                    <div className="flex gap-1">
                    <button onClick={async (e) => { e.stopPropagation(); setLoading(true); setAuditProgress("🔍 Обновление..."); try { const res = await fetch("/api/secret-shopper/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({city:r.city,niche:r.niche})}); const data = await res.json(); if(data.sites?.length>0){ const aRes=await fetch("/api/secret-shopper/audit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sites:data.sites})}); const aData=await aRes.json(); const nl=(aData.results||[]).map((rr:any)=>({id:"",domain:rr.domain,name:rr.name,url:"https://"+rr.domain,ssl:{valid:rr.audit?.ssl,daysRemaining:rr.audit?.ssl?90:0,grade:rr.audit?.grade||"?"},score:rr.audit?.score||0,scorePercent:rr.audit?.scorePercent||50,problems:rr.audit?.issues||[],h1:rr.audit?.h1,cms:rr.audit?.cms,hotScore:rr.audit?.hotScore||50,gradeColor:rr.audit?.gradeColor||"#10b981"})); await fetch("/api/lead-radar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save-sites",radarId:r.id,sites:nl.map((l:any)=>({domain:l.domain,name:l.name,url:l.url,ssl_status:l.ssl?.valid?"ok":"error",ssl_days:l.ssl?.daysRemaining,score:l.score,problems:l.problems,h1_text:l.h1?.texts?.[0]?.slice(0,200)||null}))})}); r.leadCount+=nl.length; setRadars(p=>p.map(rr=>rr.id===r.id?r:rr)); loadRadarSites(r.id); setAuditProgress("✅ +"+nl.length); }else{setAuditProgress("⚠️ 0");}}catch{}setLoading(false);setTimeout(()=>setAuditProgress(""),2000);}} title="Обновить" className="text-gray-600 hover:text-indigo-400"><RefreshCw size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteRadar(r.id); }} className="text-gray-600 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
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

        {activeTab === "radars" && leads.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Лиды ({leads.length}) <span className="text-xs text-red-400 ml-2">{criticalCount} критических</span>
              </h2>
            </div>
            <div className="border border-white/[0.06] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/[0.06] bg-[#0f172a]"><th className="text-left p-4 text-xs text-gray-500">Сайт</th><th className="text-left p-4 text-xs text-gray-500">Оценка</th><th className="text-left p-4 text-xs text-gray-500">Проблемы</th><th className="text-left p-4 text-xs text-gray-500">Статус</th><th className="text-left p-4 text-xs text-gray-500">Контакты</th><th className="text-left p-4 text-xs text-gray-500"></th></tr></thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.domain} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="p-4">
                        <a href={lead.url} target="_blank" rel="noopener" className="text-white font-semibold hover:text-indigo-400">{lead.name}</a>
                        <a href={lead.url} target="_blank" rel="noopener" className="block text-xs text-indigo-400/70 hover:text-indigo-300 visited:text-purple-400">{lead.domain} ↗</a>
                        {lead.h1?.texts?.[0] && <span className="text-xs text-gray-500 italic block truncate max-w-[300px]">«{lead.h1.texts[0].slice(0, 100)}»</span>}
                        {lead.cms && <span className="text-xs text-gray-600 bg-white/5 px-1.5 py-0.5 rounded mt-1 inline-block">{lead.cms}</span>}
                        <div className="flex gap-2 mt-1">
                          {lead.h1 && !lead.h1.ok && <span className="text-xs text-red-400">H1: {lead.h1.count === 0 ? "нет" : lead.h1.texts[0]?.slice(0, 30)}</span>}
                          {lead.cms && <span className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{lead.cms}</span>}
                        </div>
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
                    <td className="p-4"><div className="flex flex-col gap-1 text-xs text-gray-400">{lead.phone && <span><Phone size={10} className="inline mr-1"/>{lead.phone}</span>}{lead.email && <span><Mail size={10} className="inline mr-1"/>{lead.email}</span>}</div></td>
                      <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPreviewLead(lead)} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">КП</button>
                        <button onClick={async () => { if(!confirm("Удалить?"))return; await fetch("/api/lead-radar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete-site",siteId:lead.id})}); setLeads(prev => [...prev.filter((l: Lead) => l.domain !== lead.domain)]); }} className="text-xs text-gray-600 hover:text-red-400">🗑</button>
                      </div>
                    </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        
        {activeTab === "pipeline" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase">Лиды в работе ({pipelineLeads.filter((l:any)=>l.status!=="new").length})</h2>
              <div className="flex gap-3 text-xs">
                <span className="text-green-400">{pipelineLeads.filter((l:any)=>l.status==="replied"||l.status==="won").length} отвечено</span>
                <span className="text-amber-400">{pipelineLeads.filter((l:any)=>l.status==="contacted").length} отправлено</span>
              </div>
            </div>
            <div className="border border-white/[0.06] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/[0.06] bg-[#0f172a]"><th className="p-4 text-xs text-gray-500 text-left">Сайт</th><th className="p-4 text-xs text-gray-500 text-left">Статус</th><th className="p-4 text-xs text-gray-500 text-left">Контакты</th><th className="p-4 text-xs text-gray-500"></th></tr></thead>
                <tbody>
                  {pipelineLeads.filter((l:any)=>l.status!=="new"||l.sent).map((lead:any) => (
                    <tr key={lead.id} className="border-b border-white/[0.04]">
                      <td className="p-4">
                        <span className="text-white font-semibold text-sm">{lead.name}</span>
                        <a href={lead.url} target="_blank" rel="noopener" className="block text-xs text-indigo-400/70">{lead.domain} ↗</a>
                        {lead.phone && <span className="text-xs text-gray-500 block">{lead.phone}</span>}
                      </td>
                      <td className="p-4">
                        <select defaultValue={lead.status} onChange={async (e:any) => { await fetch("/api/lead-radar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"update-status",siteId:lead.id,status:e.target.value})}); setPipelineLeads((p:any)=>p.map((l:any)=>l.id===lead.id?{...l,status:e.target.value}:l)); }} className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white">
                          <option value="new">Новый</option><option value="contacted">📩 Отправлено</option><option value="replied">✅ Отвечено</option><option value="won">🏆 Выиграл</option><option value="lost">❌ Проиграл</option>
                        </select>
                        {lead.opened && <span className="text-xs text-blue-400 ml-2">👁</span>}
                      </td>
                      <td className="p-4"><span className="text-xs text-gray-400">{lead.email}</span></td>
                      <td className="p-4"><button onClick={async()=>{if(!confirm("Удалить?"))return;await fetch("/api/lead-radar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete-site",siteId:lead.id})});setPipelineLeads((p:any)=>p.filter((l:any)=>l.id!==lead.id));}} className="text-xs text-gray-600 hover:text-red-400">🗑</button></td>
                    </tr>
                  ))}
                  {pipelineLeads.filter((l:any)=>l.status!=="new"||l.sent).length===0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500 text-sm">Нет лидов в работе. Отправьте КП.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {previewLead && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => { setPreviewLead(null); setArchitectLink(null); setEmailStatus("idle"); }}>
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between"><h3 className="font-bold text-white">📄 КП для {previewLead.domain}</h3><button onClick={() => { setPreviewLead(null); setArchitectLink(null); setEmailStatus("idle"); }} className="text-gray-500 hover:text-white">✕</button></div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/[0.06]">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">АТ</div>
                  <div><p className="font-bold text-white">Алексей Тимофеев</p><p className="text-xs text-gray-400">17 лет в digital · 120+ проектов</p></div>
                </div>
                {architectLink && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-xs text-indigo-400">📈</span>
                  <a href={architectLink} target="_blank" rel="noopener" className="text-xs text-indigo-400 hover:text-indigo-300 underline flex-1">{architectLink}</a>
                  <button onClick={() => navigator.clipboard.writeText(architectLink)} className="text-xs text-gray-500 hover:text-white">📋</button>
                </div>
              )}
                <div className="mb-3">
                <label className="text-xs text-gray-500">Обращение (имя получателя)</label>
                <input 
                  value={previewLead.contactName || previewLead.name} 
                  onChange={e => {
                    setPreviewLead({...previewLead, contactName: e.target.value});
                  }}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="Иван Иванович"
                />
              </div>
              <textarea value={generateKP(previewLead)} onChange={e => setKpText(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg p-4 text-sm text-gray-300 min-h-[200px] resize-y mb-4" />
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                  <div className="text-xs text-gray-500">📱 @bilarius · 📞 <a href="tel:+79212013252" style="color:#6366f1;">+7 921 201-32-52</a></div>
                  <div className="flex gap-2">
                    <div className="space-y-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigator.clipboard.writeText(generateKP(previewLead))} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white">📋 Копировать</button>
                      <button onClick={() => runArchitect(previewLead)} disabled={architectLoading} className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50">
                        {architectLoading ? "⏳ Анализ..." : "📈 +Architect"}
                      </button>
                    </div>
                    <div><label className="text-xs text-gray-500">Тема письма</label><input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder={"Аудит сайта " + previewLead.domain} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-2" /></div><div><label className="text-xs text-gray-500">Кому отправить (email)</label><div className="flex gap-2 mt-1"><input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder={previewLead.email || "email@компании.ру"} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" /><button onClick={async () => {
                    setEmailStatus("sending");
                    try {
                      // Отправляем клиенту
                      if (sendToClient && previewLead.email) {
                        await fetch("/api/secret-shopper/send-email", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ to: emailTo || previewLead.email, subject: emailSubject || ("Аудит сайта " + previewLead.domain), html: buildEmailHtml(previewLead, generateKP(previewLead)), siteId: previewLead.id || "", radarId: selectedRadarId || "" })});
                      }
                      // Всегда отправляем копию себе
                      await fetch("/api/secret-shopper/send-email", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ to: "bilariuss@yandex.ru", subject: "[Копия] " + (emailSubject || ("Аудит сайта " + previewLead.domain)), html: buildEmailHtml(previewLead, generateKP(previewLead)), testMode: true, siteId: previewLead.id || "", radarId: selectedRadarId || "" })});
                      await new Promise(r => setTimeout(r, 500));
                      if (true) {
                        setEmailStatus("sent");
                        setEmailSent(true);
                        // Обновить статус в таблице
                        setLeads(prev => prev.map(l => l.domain === previewLead.domain ? {...l, problems: [...l.problems, "📩 отправлено"]} : l));
                        if (previewLead.id) {
                          await fetch("/api/lead-radar", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"update-status", siteId: previewLead.id, status: "contacted" }) });
                        }
                      } else {
                        setEmailStatus("error");
                      }
                    } catch { setEmailStatus("error"); }
                  }} disabled={emailStatus === "sending" || emailStatus === "checking"} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                    {emailStatus === "sending" ? "⏳ Отправка..." : emailStatus === "sent" ? "✅ Отправлено" : emailStatus === "error" ? "❌ Ошибка" : "📩 Отправить"}
                  </button></div><div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={testMode} onChange={e => setTestMode(e.target.checked)} /> 📨 Мне (проверка)</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={!testMode} onChange={e => setTestMode(!e.target.checked)} /> 📩 Клиенту</label>
                  </div></div></div>
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
