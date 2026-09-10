"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type BatchRow = {
  batch_date: string;
  batch_date_ru: string;
  queued_count: number;
  sent_count: number;
  skipped_count: number;
  opened_count: number;
  replied_count: number;
  bounce_count: number;
  tokens_total: number;
  usd_estimate: number;
  report_sent: boolean;
};

type LiveFacts = {
  queued: number;
  sent: number;
  skipped: number;
  opened: number;
  replied: number;
  bounce: number;
  tokens: number;
};

export function BatchesStats() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [live, setLive] = useState<LiveFacts | null>(null);
  const [liveUsd, setLiveUsd] = useState(0);
  const [tokensAll, setTokensAll] = useState(0);
  const [usdAll, setUsdAll] = useState(0);
  const [config, setConfig] = useState<{ dailyQueueLimit: number; dailyReportHourMsk: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/lead-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-batches", limit: 30 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
      setBatches(data.batches || []);
      setLive(data.live || null);
      setLiveUsd(data.liveUsd || 0);
      setTokensAll(data.tokensAll || 0);
      setUsdAll(data.usdAll || 0);
      setConfig(data.config || null);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить статистику");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Статистика дней</h2>
          <p className="text-sm text-gray-500 mt-1">
            Утро = план · вечер = факт. Те же цифры, что в Telegram-отчёте.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white"
        >
          <RefreshCw size={14} /> Обновить
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Лимит пачки</div>
          <div className="text-2xl font-semibold text-white mt-1">
            {config?.dailyQueueLimit ?? 20}
          </div>
          <div className="text-xs text-gray-500 mt-1">лидов в день (код)</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Токены всего</div>
          <div className="text-2xl font-semibold text-white mt-1">
            {tokensAll.toLocaleString("ru-RU")}
          </div>
          <div className="text-xs text-gray-500 mt-1">~${usdAll.toFixed(3)}</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Вечерний отчёт</div>
          <div className="text-2xl font-semibold text-white mt-1">
            {config?.dailyReportHourMsk ?? 21}:00
          </div>
          <div className="text-xs text-gray-500 mt-1">МСК · cron</div>
        </div>
      </div>

      {live && (
        <div className="mb-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <h3 className="text-sm font-semibold text-indigo-300 mb-3">
            Сегодня (живой расчёт = как в Telegram)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
            <Metric label="План" value={live.queued} />
            <Metric label="Отправлено" value={live.sent} />
            <Metric label="Пропуск" value={live.skipped} />
            <Metric label="Открыли" value={live.opened} />
            <Metric label="Ответы" value={live.replied} accent />
            <Metric label="Bounce" value={live.bounce} />
            <Metric
              label="Токены"
              value={`${live.tokens.toLocaleString("ru-RU")}`}
              sub={`~$${liveUsd.toFixed(3)}`}
            />
          </div>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
          Загружаем историю…
        </div>
      )}

      {!loading && batches.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
          Пока нет пачек. Появятся после ночного прогона.
        </div>
      )}

      {!loading && batches.length > 0 && (
        <div className="border border-white/[0.06] rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[#0f172a] text-left text-xs text-gray-500">
                <th className="p-3">Дата</th>
                <th className="p-3">План</th>
                <th className="p-3">Отпр.</th>
                <th className="p-3">Проп.</th>
                <th className="p-3">Откр.</th>
                <th className="p-3">Ответы</th>
                <th className="p-3">Bounce</th>
                <th className="p-3">Токены</th>
                <th className="p-3">Отчёт TG</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.batch_date} className="border-b border-white/[0.04]">
                  <td className="p-3 text-white font-medium">{b.batch_date_ru}</td>
                  <td className="p-3 text-gray-300">{b.queued_count}</td>
                  <td className="p-3 text-amber-300">{b.sent_count}</td>
                  <td className="p-3 text-gray-400">{b.skipped_count}</td>
                  <td className="p-3 text-blue-300">{b.opened_count}</td>
                  <td className="p-3 text-emerald-400 font-semibold">{b.replied_count}</td>
                  <td className="p-3 text-gray-500">{b.bounce_count}</td>
                  <td className="p-3 text-gray-300">
                    {Number(b.tokens_total || 0).toLocaleString("ru-RU")}
                    <span className="block text-[10px] text-gray-600">
                      ~${Number(b.usd_estimate || 0).toFixed(3)}
                    </span>
                  </td>
                  <td className="p-3 text-xs">
                    {b.report_sent ? (
                      <span className="text-emerald-400">отправлен</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-600">
        Агрегаторы и статьи отсекаются фильтром компаний (blacklist в коде). Лимит{" "}
        {config?.dailyQueueLimit ?? 20} применяется в nightly и в API очереди.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div
        className={
          "text-lg font-semibold mt-0.5 " +
          (accent ? "text-emerald-400" : "text-white")
        }
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-gray-600">{sub}</div>}
    </div>
  );
}
