"use client";

import { useState, useEffect } from "react";
import { Radar, Plus } from "lucide-react";
import type { Lead, PipelineLead } from "./lib/types";
import { RadarForm } from "./components/radar-form";
import { RadarList } from "./components/radar-list";
import { LeadTable } from "./components/lead-table";
import { PipelineTable } from "./components/pipeline-table";
import { KpModal } from "./components/kp-modal";

export default function LeadRadarPage() {
  // ─── State ───
  const [radars, setRadars] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newCity, setNewCity] = useState("Москва");
  const [newNiche, setNewNiche] = useState("Стоматологии");
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);
  const [selectedRadarId, setSelectedRadarId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("radars");
  const [pipelineLeads, setPipelineLeads] = useState<PipelineLead[]>([]);
  const [auditProgress, setAuditProgress] = useState("");

  // ─── Load radars ───
  useEffect(() => {
    fetch("/api/lead-radar")
      .then(r => r.json())
      .then(d => setRadars((d.radars || []).map((r: any) => ({ ...r, leadCount: r.lead_count || 0 }))))
      .catch(() => {});
  }, []);

  // ─── Actions ───
  async function addRadar() {
    setShowAdd(false); setLoading(true);
    const res = await fetch("/api/lead-radar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", city: newCity, niche: newNiche, filters: [] }),
    });
    const { id } = await res.json();
    setSelectedRadarId(id);

    setAuditProgress("🔍 Ищем компании...");
    const searchRes = await fetch("/api/secret-shopper/search", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: newCity, niche: newNiche }),
    });
    const data = await searchRes.json();

    setAuditProgress("🧠 Проверяем сайты...");
    const auditRes = await fetch("/api/secret-shopper/audit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sites: data.sites }),
    });
    const auditData = await auditRes.json();

    setAuditProgress("📞 Ищем контакты...");
    let contacts: any[] = [];
    try {
      const cRes = await fetch("/api/secret-shopper/contacts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sites: data.sites.slice(0, 10) }),
      });
      contacts = ((await cRes.json()).contacts || []);
    } catch {}

    const newLeads: Lead[] = (auditData.results || []).map((r: any) => {
      const contact = contacts.find((c: any) => c.domain === r.domain);
      return {
        id: "", domain: r.domain, name: r.name, url: `https://${r.domain}`,
        ssl: { valid: r.audit?.ssl, daysRemaining: r.audit?.ssl ? 90 : 0, grade: r.audit?.grade || "?" },
        score: r.audit?.score || 0, scorePercent: r.audit?.scorePercent || 50,
        problems: r.audit?.issues || [],
        h1: r.audit?.h1, cms: r.audit?.cms, cmsTier: r.audit?.cmsTier, hotScore: r.audit?.hotScore || 50,
        contactName: r.audit?.contactName, gradeColor: r.audit?.gradeColor || "#10b981",
        phone: contact?.phone, email: contact?.email,
      };
    });

    await fetch("/api/lead-radar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save-sites", radarId: id,
        sites: newLeads.map(l => ({
          domain: l.domain, name: l.name, url: l.url,
          ssl_status: l.ssl?.valid ? "ok" : "error", ssl_days: l.ssl?.daysRemaining,
          ssl_grade: l.ssl?.grade, score: l.score, phone: l.phone, email: l.email, problems: l.problems,
        })),
      }),
    });

    setRadars(prev => [{ id, city: newCity, niche: newNiche, filters: [], leadCount: newLeads.length, active: true }, ...prev]);
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
    const res = await fetch("/api/lead-radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list-sites", radarId }) });
    const data = await res.json();
    setLeads((data.sites || []).map((s: any) => ({
      id: s.id, domain: s.domain, name: s.name, url: s.url || `https://${s.domain}`,
      ssl: { valid: s.ssl_status === "ok", daysRemaining: s.ssl_days || 0, grade: s.ssl_grade || "?" },
      score: s.score || 0, scorePercent: Math.max(0, 100 - (s.score || 0) * 12),
      problems: typeof s.problems === "string" ? JSON.parse(s.problems) : (s.problems || []),
      h1: null as any, cms: null, cmsTier: null as any, hotScore: s.hotScore || 50, contactName: null as any,
      gradeColor: (s.score || 0) <= 2 ? "#10b981" : (s.score || 0) <= 4 ? "#f59e0b" : "#ef4444",
      phone: s.phone, email: s.email,
    })));
  }

  async function loadPipeline() {
    setActiveTab("pipeline");
    const res = await fetch("/api/lead-radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list-all-sites" }) });
    const d = await res.json();
    setPipelineLeads((d.sites || []).map((s: any) => ({
      id: s.id, domain: s.domain, name: s.name, url: s.url || "https://" + s.domain,
      phone: s.phone, email: s.email, status: s.status, opened: !!s.opened_at,
    })));
  }

  async function deleteLead(lead: Lead) {
    if (!confirm("Удалить?")) return;
    await fetch("/api/lead-radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-site", siteId: lead.id }) });
    setLeads(prev => prev.filter(l => l.domain !== lead.domain));
  }

  async function updatePipelineStatus(id: string, status: string) {
    await fetch("/api/lead-radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update-status", siteId: id, status }) });
    setPipelineLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  }

  async function deletePipelineLead(id: string) {
    if (!confirm("Удалить?")) return;
    await fetch("/api/lead-radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-site", siteId: id }) });
    setPipelineLeads(prev => prev.filter(l => l.id !== id));
  }

  function handleEmailSent(lead: Lead) {
    setLeads(prev => prev.map(l => l.domain === lead.domain ? { ...l, problems: [...l.problems, "📩 отправлено"] } : l));
    if (lead.id) updatePipelineStatus(lead.id, "contacted");
  }

  // ─── Render ───
  return (
    <div className="min-h-screen bg-[#0a0e13] text-gray-300">
      <div className="max-w-6xl mx-auto p-6 sm:p-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Radar size={28} className="text-indigo-400" /> Лид-радар
            </h1>
            <p className="mt-2 text-sm text-gray-500">Поиск сайтов с проблемами. Google Maps + 2GIS. Сохранение в БД.</p>
          </div>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveTab("radars")} className={"px-4 py-2 rounded-lg text-sm font-semibold " + (activeTab === "radars" ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400")}>📡 Радары</button>
            <button onClick={loadPipeline} className={"px-4 py-2 rounded-lg text-sm font-semibold " + (activeTab === "pipeline" ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400")}>📋 Лиды в работе</button>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            <Plus size={18} /> Новый радар
          </button>
        </div>

        {/* Progress */}
        {auditProgress && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm text-indigo-400">{auditProgress}</div>
        )}

        {/* Radar Form Modal */}
        <RadarForm show={showAdd} onClose={() => setShowAdd(false)} newCity={newCity} setNewCity={setNewCity} newNiche={newNiche} setNewNiche={setNewNiche} onAdd={addRadar} loading={loading} />

        {/* Tabs */}
        {activeTab === "radars" && (
          <>
            <RadarList radars={radars} selectedRadarId={selectedRadarId} onSelect={loadRadarSites} onDelete={deleteRadar} />
            <LeadTable leads={leads} onPreviewKp={setPreviewLead} onDelete={deleteLead} />
          </>
        )}

        {activeTab === "pipeline" && (
          <PipelineTable pipelineLeads={pipelineLeads} onStatusChange={updatePipelineStatus} onDelete={deletePipelineLead} />
        )}

        {/* KP Modal */}
        {previewLead && (
          <KpModal lead={previewLead} onClose={() => setPreviewLead(null)} selectedRadarId={selectedRadarId} onEmailSent={handleEmailSent} />
        )}
      </div>
    </div>
  );
}
