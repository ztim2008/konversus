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
  const [kpHtml, setKpHtml] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [architectLoading, setArchitectLoading] = useState(false);
  const [architectLink, setArchitectLink] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [sendToClient, setSendToClient] = useState(true);
  const [contactName, setContactName] = useState(lead.contactName || lead.name);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);

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
          setKpHtml(null);
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
          cms: lead.cms,
          platform: lead.cms,
          domain: lead.domain,
          companyName: lead.name,
          issues: lead.problems,
          niche: lead.name,
          contactName: contactName,
          leadId: lead.id,
          siteId: lead.id,
          screenshotUrl: (lead as any).screenshotUrl || (lead as any).screenshot_url || null,
          save: !!lead.id,
        }),
      });
      const data = await res.json();
      if (data.kp) setKpText(data.kp);
      if (data.html) {
        setKpHtml(data.html);
        setShowHtmlPreview(true);
      }
      if (data.subject) setEmailSubject(data.subject);
    } catch {}
    setAiGenerating(false);
  }

  async function resolveHtml(currentKp: string): Promise<{ html: string; subject: string }> {
    if (kpHtml) {
      return {
        html: kpHtml,
        subject: emailSubject || ("Посмотрел сайт " + lead.domain + ": пара идей по заявкам"),
      };
    }
    try {
      const res = await fetch("/api/secret-shopper/generate-kp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: lead.domain,
          companyName: lead.name,
          cms: lead.cms,
          platform: lead.cms,
          issues: lead.problems,
          contactName,
          leadId: lead.id,
          screenshotUrl: (lead as any).screenshotUrl || (lead as any).screenshot_url || null,
        }),
      });
      const data = await res.json();
      if (data.html) {
        setKpHtml(data.html);
        return {
          html: data.html,
          subject: emailSubject || data.subject || ("Посмотрел сайт " + lead.domain),
        };
      }
    } catch {}
    return {
      html: buildEmailHtml({ ...lead, contactName }, currentKp),
      subject: emailSubject || ("Аудит сайта " + lead.domain),
    };
  }

  async function sendEmail() {
    setEmailStatus("sending");
    try {
      const currentKp = generateKP({ ...lead, contactName }, kpText);
      const { html, subject } = await resolveHtml(currentKp);
      if (sendToClient && (emailTo || lead.email)) {
        await fetch("/api/secret-shopper/send-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: emailTo || lead.email,
            subject,
            html,
            siteId: lead.id || "", radarId: selectedRadarId || "",
          }),
        });
      }
      if (testMode) {
        await fetch("/api/secret-shopper/send-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "bilariuss@yandex.ru",
            subject: "[Копия] " + subject,
            html,
            testMode: true, siteId: lead.id || "", radarId: selectedRadarId || "",
          }),
        });
      }
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
          <h3 className="font-bold text-white">КП lead-web.pro · {lead.domain}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/[0.06]">
            <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center text-white font-bold text-sm">LW</div>
            <div><p className="font-bold text-white">lead-web.pro</p><p className="text-xs text-gray-400">веб-разработка · заявки с сайта</p></div>
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
              onChange={e => { setContactName(e.target.value); setKpHtml(null); }}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="Иван Иванович"
            />
          </div>
          <textarea
            value={currentKp}
            onChange={e => { setKpText(e.target.value); setKpHtml(null); }}
            className="w-full bg-black/30 border border-white/10 rounded-lg p-4 text-sm text-gray-300 min-h-[200px] resize-y mb-4"
          />
          {kpHtml && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowHtmlPreview((v) => !v)}
                className="text-xs text-amber-400/90 mb-2"
              >
                {showHtmlPreview ? "▾ Скрыть HTML-превью" : "▸ HTML-превью lead-web.pro"}
              </button>
              {showHtmlPreview && (
                <iframe
                  title="kp-preview"
                  srcDoc={kpHtml}
                  className="w-full h-64 rounded-lg border border-white/10 bg-white"
                />
              )}
            </div>
          )}
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
            <div className="text-xs text-gray-500">lead-web.pro · leadweb@yandex.ru</div>
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
                  <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder={"Посмотрел сайт " + lead.domain} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-2" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Кому отправить (email)</label>
                  <div className="flex gap-2 mt-1">
                    <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder={lead.email || "email@компании.ру"} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                    <button
                      onClick={sendEmail}
                      disabled={emailStatus === "sending"}
                      className="flex items-center gap-1 rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-900 disabled:opacity-50"
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
