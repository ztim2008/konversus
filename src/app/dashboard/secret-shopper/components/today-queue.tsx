"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  Mail,
  SkipForward,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronRight,
  LayoutList,
  Rows3,
} from "lucide-react";

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
  source?: string | null;
};

type DayPlan = {
  city?: string;
  niche?: string;
  vertical?: string;
  verticalId?: string;
};

type FilterMode = "all" | "manual" | "no_email";

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

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function TodayQueue() {
  const [sites, setSites] = useState<QueueSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [batchDate, setBatchDate] = useState("");
  const [queuedCount, setQueuedCount] = useState(0);
  const [queueLimit, setQueueLimit] = useState(40);
  const [sendLimit, setSendLimit] = useState(40);
  const [sentToday, setSentToday] = useState(0);
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  const [batch, setBatch] = useState<any>(null);
  const [dayPlan, setDayPlan] = useState<DayPlan>({});

  const [manualOpen, setManualOpen] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualNiche, setManualNiche] = useState("");
  const [manualForce, setManualForce] = useState(false);
  const [enqueueBusy, setEnqueueBusy] = useState(false);

  const [filter, setFilter] = useState<FilterMode>("all");
  const [compact, setCompact] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    try {
      setCompact(localStorage.getItem("lr_today_compact") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCompact() {
    setCompact((v) => {
      const next = !v;
      try {
        localStorage.setItem("lr_today_compact", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

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
      setQueueLimit(data.limit || 40);
      setSendLimit(data.sendLimit || 40);
      setSentToday(
        typeof data.sentToday === "number"
          ? data.sentToday
          : Number(data.batch?.sent_count || 0)
      );
      setAutoSendEnabled(data.autoSendEnabled !== false);
      setBatch(data.batch || null);
      setBatchDate(data.batchDate || "");
      setDayPlan(data.dayPlan || {});
      setSelectedIdx(0);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить очередь");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    return sites.filter((s) => {
      if (filter === "manual") return s.source === "manual";
      if (filter === "no_email") return !s.email;
      return true;
    });
  }, [sites, filter]);

  useEffect(() => {
    if (selectedIdx >= visible.length) {
      setSelectedIdx(Math.max(0, visible.length - 1));
    }
  }, [visible.length, selectedIdx]);

  useEffect(() => {
    const el = cardRefs.current[selectedIdx];
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIdx]);

  async function enqueueUrl() {
    const url = manualUrl.trim();
    if (!url) {
      setError("Вставьте ссылку на сайт");
      return;
    }
    setEnqueueBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/lead-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enqueue-url",
          url,
          city: manualCity.trim() || undefined,
          niche: manualNiche.trim() || undefined,
          force: manualForce,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Не удалось добавить");
      }
      setManualUrl("");
      setManualForce(false);
      let msg = `Добавлен ${data.domain} · ${data.email}`;
      if (data.overLimit) {
        msg += ` · в очереди ${data.queuedCount} (лимит ${data.limit})`;
      }
      setInfo(msg);
      await load();
    } catch (e: any) {
      setError(e?.message || "Ошибка добавления");
    } finally {
      setEnqueueBusy(false);
    }
  }

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
    setInfo("");
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
      if (testMode) {
        setInfo(
          `Тест ушёл на ${data.sentTo || "вас"} · ${site.domain} остаётся в очереди`
        );
      } else {
        setSites((prev) => prev.filter((s) => s.id !== site.id));
        setQueuedCount((c) => Math.max(0, c - 1));
        setBatch((b: any) =>
          b ? { ...b, sent_count: Number(b.sent_count || 0) + 1 } : b
        );
        setInfo(
          `Отправлено на ${site.email} · ${site.domain} · слот очереди свободен`
        );
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
    setInfo("");
    try {
      const res = await fetch("/api/lead-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip-site", siteId: site.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setSites((prev) => prev.filter((s) => s.id !== site.id));
      const nextQueued =
        typeof data.queuedCount === "number"
          ? data.queuedCount
          : Math.max(0, queuedCount - 1);
      setQueuedCount(nextQueued);
      setBatch((b: any) =>
        b ? { ...b, skipped_count: Number(b.skipped_count || 0) + 1 } : b
      );
      setInfo(
        `Пропущено ${site.domain} · слот свободен (${nextQueued}/${queueLimit} в очереди)`
      );
    } catch (e: any) {
      setError(e?.message || "Ошибка пропуска");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target) || manualOpen || enqueueBusy || busyId) {
        return;
      }
      if (!visible.length) return;
      const site = visible[selectedIdx];
      const key = e.key.toLowerCase();

      if (key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(visible.length - 1, i + 1));
        return;
      }
      if (key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "Enter" && site) {
        e.preventDefault();
        if (site.kp_html) {
          setPreviewId((id) => (id === site.id ? null : site.id));
        }
        return;
      }
      if (key === "s" && site && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        void sendSite(site);
        return;
      }
      if ((key === "x" || key === "p") && site && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        void skipSite(site);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers use latest via closures intentionally
  }, [
    visible,
    selectedIdx,
    manualOpen,
    enqueueBusy,
    busyId,
    testMode,
    queuedCount,
    queueLimit,
  ]);

  const dd = batchDate
    ? batchDate.split("-").reverse().join(".")
    : "сегодня";

  const sentCount = sentToday;
  const skippedCount = Number(batch?.skipped_count || 0);
  const planBits = [dayPlan.city, dayPlan.vertical, dayPlan.niche].filter(
    Boolean
  );

  const filterBtn = (mode: FilterMode, label: string) => (
    <button
      type="button"
      key={mode}
      onClick={() => {
        setFilter(mode);
        setSelectedIdx(0);
      }}
      className={
        "rounded-md px-2.5 py-1 text-xs " +
        (filter === mode
          ? "bg-indigo-600 text-white"
          : "bg-white/5 text-gray-400 hover:text-white")
      }
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Сегодня · {dd}</h2>
          {planBits.length > 0 && (
            <p className="text-sm text-indigo-300/90 mt-1">
              {planBits.join(" · ")}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            В очереди{" "}
            <span className="text-white font-medium">
              {queuedCount}/{queueLimit}
            </span>
            <span className="mx-1.5 text-gray-600">·</span>
            отправлено{" "}
            <span className="text-emerald-400">
              {sentCount}/{sendLimit}
            </span>
            <span className="mx-1.5 text-gray-600">·</span>
            пропуск <span className="text-amber-400/90">{skippedCount}</span>
          </p>
          <p className="text-[11px] text-gray-600 mt-1">
            {autoSendEnabled
              ? "Автоотправка: по 1 письму каждые 15 мин · 09–18 МСК · "
              : "Автоотправка выкл · "}
            Клавиши: ↑↓ / j k · Enter превью · S отправить · X пропуск
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
            />
            Тест себе
          </label>
          <button
            type="button"
            onClick={toggleCompact}
            title={compact ? "Обычные карточки" : "Компактный список"}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white"
          >
            {compact ? <Rows3 size={14} /> : <LayoutList size={14} />}
            {compact ? "Компакт" : "Карточки"}
          </button>
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white"
          >
            <RefreshCw size={14} /> Обновить
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-gray-600">
          Фильтр
        </span>
        {filterBtn("all", `Все (${sites.length})`)}
        {filterBtn(
          "manual",
          `Ручные (${sites.filter((s) => s.source === "manual").length})`
        )}
        {filterBtn(
          "no_email",
          `Без email (${sites.filter((s) => !s.email).length})`
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/[0.02]"
        >
          <span className="text-sm font-medium text-white inline-flex items-center gap-1.5">
            <Plus size={14} />
            Добавить сайт вручную
          </span>
          {manualOpen ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
        </button>
        {manualOpen && (
          <div className="px-4 pb-4 border-t border-white/[0.06] pt-3">
            <p className="text-xs text-gray-500 mb-3">
              Ссылка → аудит, email, скрин, КП → в очередь. Письмо само не
              уходит.
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !enqueueBusy) enqueueUrl();
                }}
                placeholder="https://example.ru"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-600"
                disabled={enqueueBusy}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  placeholder="Город (необязательно)"
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-600"
                  disabled={enqueueBusy}
                />
                <input
                  type="text"
                  value={manualNiche}
                  onChange={(e) => setManualNiche(e.target.value)}
                  placeholder="Ниша (необязательно)"
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-600"
                  disabled={enqueueBusy}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={manualForce}
                    onChange={(e) => setManualForce(e.target.checked)}
                    disabled={enqueueBusy}
                  />
                  Всё равно (если домен уже был)
                </label>
                <button
                  type="button"
                  onClick={enqueueUrl}
                  disabled={enqueueBusy || !manualUrl.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {enqueueBusy ? "Анализ… (до ~1 мин)" : "В очередь"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {info}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
          Загружаем очередь…
        </div>
      )}

      {!loading && sites.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
          Очередь пуста. Раскройте «Добавить сайт» или дождитесь утреннего
          прогона.
        </div>
      )}

      {!loading && sites.length > 0 && visible.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-gray-500">
          По фильтру ничего нет. Сбросьте на «Все».
        </div>
      )}

      <div className={"flex flex-col " + (compact ? "gap-2" : "gap-6")}>
        {visible.map((site, idx) => {
          const problems = [
            ...parseList(site.problems),
            ...parseList(site.privacy_issues),
          ].slice(0, compact ? 3 : 6);
          const busy = busyId === site.id;
          const siteUrl = site.url || `https://${site.domain}`;
          const isManual = site.source === "manual";
          const selected = idx === selectedIdx;

          return (
            <article
              key={site.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              onClick={() => setSelectedIdx(idx)}
              className={
                "rounded-2xl border overflow-hidden cursor-pointer transition-colors " +
                (selected
                  ? "border-indigo-400/60 bg-indigo-500/5"
                  : "border-white/[0.08] bg-white/[0.03]")
              }
            >
              <div
                className={
                  compact
                    ? "grid md:grid-cols-[120px_1fr] gap-0"
                    : "grid md:grid-cols-[280px_1fr] gap-0"
                }
              >
                <div className="bg-black/40 border-b md:border-b-0 md:border-r border-white/[0.06]">
                  {site.screenshot_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={site.screenshot_url}
                      alt={`Скрин ${site.domain}`}
                      className={
                        compact
                          ? "w-full h-24 md:h-full min-h-[96px] object-cover object-top"
                          : "w-full h-48 md:h-full min-h-[200px] object-cover object-top"
                      }
                    />
                  ) : (
                    <div
                      className={
                        compact
                          ? "h-24 flex items-center justify-center text-xs text-gray-600"
                          : "h-48 md:min-h-[200px] flex items-center justify-center text-xs text-gray-600"
                      }
                    >
                      Нет скрина
                    </div>
                  )}
                </div>

                <div className={compact ? "p-3 flex flex-col gap-2" : "p-5 flex flex-col gap-4"}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3
                        className={
                          compact
                            ? "text-sm font-semibold text-white"
                            : "text-base font-semibold text-white"
                        }
                      >
                        {site.name || site.domain}
                        {isManual && (
                          <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-indigo-300/90">
                            ручной
                          </span>
                        )}
                        {selected && (
                          <span className="ml-2 text-[10px] text-indigo-400">
                            ● фокус
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {site.radar_city || "—"} · {site.radar_niche || "—"}
                        {site.platform ? ` · ${site.platform}` : ""}
                        {site.hot_score != null ? ` · 🔥 ${site.hot_score}` : ""}
                      </p>
                    </div>
                    <a
                      href={siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Сайт <ExternalLink size={12} />
                    </a>
                  </div>

                  <div className="text-sm">
                    <span className="text-gray-500">Email: </span>
                    <span className="text-white">{site.email || "—"}</span>
                  </div>

                  {!compact && problems.length > 0 && (
                    <ul className="text-xs text-amber-400/90 space-y-1">
                      {problems.map((p) => (
                        <li key={p}>· {p}</li>
                      ))}
                    </ul>
                  )}

                  {!compact && site.kp_subject && (
                    <p className="text-xs text-gray-500">
                      Тема:{" "}
                      <span className="text-gray-300">{site.kp_subject}</span>
                    </p>
                  )}

                  {site.kp_html && (
                    <div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewId((id) =>
                            id === site.id ? null : site.id
                          );
                        }}
                        className="text-xs text-amber-400/90 mb-2"
                      >
                        {previewId === site.id
                          ? "▾ Скрыть превью"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        void sendSite(site);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <Mail size={14} />
                      {busy ? "…" : testMode ? "Тест" : "Отправить"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        void skipSite(site);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
                    >
                      <SkipForward size={14} />
                      Пропуск
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
