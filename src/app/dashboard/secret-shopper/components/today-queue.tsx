"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Mail, SkipForward, RefreshCw } from "lucide-react";

type QueueSite = {
  id: string;
  domain: string;
  name: string;
  url?: string;
  email?: string | null;
  email_source_url?: string | null;
  platform?: string | null;
  hot_score?: number;
  problems?: string | string[];
  privacy_issues?: string | string[] | null;
  screenshot_url?: string | null;
  kp_html?: string | null;
  kp_subject?: string | null;
  radar_city?: string | null;
  radar_niche?: string | null;
  batch_date?: string | null;
};

function parseList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function TodayQueue() {
  const [sites, setSites] = useState<QueueSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [batchDate, setBatchDate] = useState("");
  const [queuedCount, setQueuedCount] = useState(0);
  const [batch, setBatch] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/lead-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-queue" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
      setSites(data.sites || []);
      setQueuedCount(data.queuedCount || 0);
      setBatch(data.batch || null);
      setBatchDate(data.batchDate || "");
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить очередь");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendSite(site: QueueSite) {
    if (!site.email) {
      setError("Нет email — отправка невозможна");
      return;
    }
    const label = testMode
      ? `Тестовая отправка себе (не клиенту)?`
      : `Отправить письмо на ${site.email}?`;
    if (!confirm(label)) return;

    setBusyId(site.id);
    setError("");
    try {
      const res = await fetch("/api/lead-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-queued",
          siteId: site.id,
          testMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка отправки");
      if (!testMode) {
        setSites((prev) => prev.filter((s) => s.id !== site.id));
        setQueuedCount((c) => Math.max(0, c - 1));
      }
    } catch (e: any) {
      setError(e?.message || "Ошибка отправки");
    } finally {
      setBusyId(null);
    }
  }

  async function skipSite(site: QueueSite) {
    if (!confirm(`Пропустить ${site.domain}? Письмо не отправится.`)) return;
    setBusyId(site.id);
    setError("");
    try {
      const res = await fetch("/api/lead-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip-site", siteId: site.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setSites((prev) => prev.filter((s) => s.id !== site.id));
      setQueuedCount((c) => Math.max(0, c - 1));
    } catch (e: any) {
      setError(e?.message || "Ошибка пропуска");
    } finally {
      setBusyId(null);
    }
  }

  const dd = batchDate
    ? batchDate.split("-").reverse().join(".")
    : "сегодня";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Сегодня · {dd}</h2>
          <p className="text-sm text-gray-500 mt-1">
            В очереди: <span className="text-white">{queuedCount}</span>
            {batch && (
              <span className="ml-2">
                · отправлено {batch.sent_count || 0} · пропуск {batch.skipped_count || 0}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
            />
            Тест себе (не клиенту)
          </label>
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white"
          >
            <RefreshCw size={14} /> Обновить
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
          Загружаем очередь…
        </div>
      )}

      {!loading && sites.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
          На сегодня очередь пуста. Ночной прогон положит сюда пачку утром.
        </div>
      )}

      <div className="flex flex-col gap-6">
        {sites.map((site) => {
          const problems = [
            ...parseList(site.problems),
            ...parseList(site.privacy_issues),
          ].slice(0, 6);
          const busy = busyId === site.id;
          const siteUrl = site.url || `https://${site.domain}`;

          return (
            <article
              key={site.id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden"
            >
              <div className="grid md:grid-cols-[280px_1fr] gap-0">
                <div className="bg-black/40 border-b md:border-b-0 md:border-r border-white/[0.06]">
                  {site.screenshot_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={site.screenshot_url}
                      alt={`Скрин ${site.domain}`}
                      className="w-full h-48 md:h-full min-h-[200px] object-cover object-top"
                    />
                  ) : (
                    <div className="h-48 md:min-h-[200px] flex items-center justify-center text-xs text-gray-600">
                      Нет скриншота
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {site.name || site.domain}
                      </h3>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {site.radar_city || "—"} · {site.radar_niche || "—"}
                        {site.platform ? ` · ${site.platform}` : ""}
                        {site.hot_score != null ? ` · 🔥 ${site.hot_score}` : ""}
                      </p>
                    </div>
                    <a
                      href={siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Открыть сайт <ExternalLink size={12} />
                    </a>
                  </div>

                  <div className="text-sm">
                    <span className="text-gray-500">Email: </span>
                    <span className="text-white">{site.email || "—"}</span>
                    {site.email_source_url && (
                      <a
                        href={site.email_source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-xs text-gray-500 hover:text-gray-300 underline"
                      >
                        источник
                      </a>
                    )}
                  </div>

                  {problems.length > 0 && (
                    <ul className="text-xs text-amber-400/90 space-y-1">
                      {problems.map((p) => (
                        <li key={p}>· {p}</li>
                      ))}
                    </ul>
                  )}

                  {site.kp_subject && (
                    <p className="text-xs text-gray-500">
                      Тема: <span className="text-gray-300">{site.kp_subject}</span>
                    </p>
                  )}

                  {site.kp_html && (
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewId((id) => (id === site.id ? null : site.id))
                        }
                        className="text-xs text-amber-400/90 mb-2"
                      >
                        {previewId === site.id
                          ? "▾ Скрыть превью письма"
                          : "▸ Превью письма"}
                      </button>
                      {previewId === site.id && (
                        <iframe
                          title={`kp-${site.domain}`}
                          srcDoc={site.kp_html}
                          className="w-full h-56 rounded-lg border border-white/10 bg-white"
                        />
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
                    <button
                      type="button"
                      disabled={busy || !site.email}
                      onClick={() => sendSite(site)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <Mail size={16} />
                      {busy ? "…" : testMode ? "Тест себе" : "Отправить"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => skipSite(site)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
                    >
                      <SkipForward size={16} />
                      Пропустить
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
