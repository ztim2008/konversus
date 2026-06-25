"use client";
import { useState } from "react";
import type { Lead, EmailStatus } from "../lib/types";
import { generateKP, buildEmailHtml } from "../lib/utils";

export function KpModal({
  lead, onClose, selectedRadarId, onEmailSent,
}: {
  lead: Lead; onClose: () => void; selectedRadarId: string | null; onEmailSent: (lead: Lead) => void;
}) {
  const [kpText, setKpText] = useState(generateKP(lead));
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [architectLoading, setArchitectLoading] = useState(false);
  const [architectLink, setArchitectLink] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [sendToClient, setSendToClient] = useState(true);
  const [contactName, setContactName] = useState(lead.contactName || lead.name);

  async function runArchitect() {
    setArchitectLoading(true);
    try {
      const res = await fetch("/api/architect/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: lead.url }),
      });
      const data = await res.json();
      if (data.id) {
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

  async function runAiGenerate() {
    setAiGenerating(true);
    try {
      const res = await fetch("/api/secret-shopper/generate-kp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: lead.domain,
          issues: lead.problems,
          niche: lead.name,
          contactName: contactName,
        }),
      });
      const data = await res.json();
      if (data.kp) setKpText(data.kp);
    } catch {}
    setAiGenerating(false);
  }

  async function sendEmail() {
    setEmailStatus("sending");
    try {
      const currentKp = generateKP({ ...lead, contactName }, kpText);
      if (sendToClient && lead.email) {
        await fetch("/api/secret-shopper/send-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: emailTo || lead.email,
            subject: emailSubject || ("Аудит сайта " + lead.domain),
            html: buildEmailHtml({ ...lead, contactName }, currentKp),
            siteId: lead.id || "", radarId: selectedRadarId || "",
          }),
        });
      }
      await fetch("/api/secret-shopper/send-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "bilariuss@yandex.ru",
          subject: "[Копия] " + (emailSubject || ("Аудит сайта " + lead.domain)),
          html: buildEmailHtml({ ...lead, contactName }, currentKp),
          testMode: true, siteId: lead.id || "", radarId: selectedRadarId || "",
        }),
      });
      setEmailStatus("sent");
      onEmailSent(lead);
    } catch {
      setEmailStatus("error");
    }
  }

  const currentKp = generateKP({ ...lead, contactName }, kpText);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="font-bold text-white">📄 КП для {lead.domain}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
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
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="Иван Иванович"
            />
          </div>
          <textarea
            value={currentKp}
            onChange={e => setKpText(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-lg p-4 text-sm text-gray-300 min-h-[200px] resize-y mb-4"
          />
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
            <div className="text-xs text-gray-500">📱 @bilarius · 📞 +7 921 201-32-52</div>
            <div className="flex gap-2">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(currentKp)} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white">📋 Копировать</button>
                  <button onClick={runAiGenerate} disabled={aiGenerating} className="flex items-center gap-1 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/20 disabled:opacity-50">
                    {aiGenerating ? "⏳ AI..." : "🤖 AI-КП"}
                  </button>
                  <button onClick={runArchitect} disabled={architectLoading} className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50">
                    {architectLoading ? "⏳ Анализ..." : "📈 +Architect"}
                  </button>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Тема письма</label>
                  <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder={"Аудит сайта " + lead.domain} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-2" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Кому отправить (email)</label>
                  <div className="flex gap-2 mt-1">
                    <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder={lead.email || "email@компании.ру"} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                    <button
                      onClick={sendEmail}
                      disabled={emailStatus === "sending"}
                      className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {emailStatus === "sending" ? "⏳ Отправка..." : emailStatus === "sent" ? "✅ Отправлено" : emailStatus === "error" ? "❌ Ошибка" : "📩 Отправить"}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={testMode} onChange={e => setTestMode(e.target.checked)} /> 📨 Мне (копия)</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={sendToClient} onChange={e => setSendToClient(e.target.checked)} /> 📩 Клиенту</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
