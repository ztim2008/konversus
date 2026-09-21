"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Save } from "lucide-react";

type VerticalRow = {
  id: string;
  labelRu: string;
  weight: number;
  niches: string[];
};

type PreviewRow = {
  dayOffset: number;
  vertical: string;
  verticalId: string;
  nicheHint: string;
};

type City = { id: string; name: string; travel: boolean };

export function RouletteSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [dailyLimit, setDailyLimit] = useState(40);
  const [dailySendLimit, setDailySendLimit] = useState(40);
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  const [manualRespectsLimit, setManualRespectsLimit] = useState(false);
  const [autoSendIntervalMin, setAutoSendIntervalMin] = useState<15 | 30>(30);
  const [collectPerTick, setCollectPerTick] = useState(2);
  const [verticals, setVerticals] = useState<VerticalRow[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [ribbon, setRibbon] = useState<Array<{ id: string; labelRu: string }>>(
    []
  );
  const [cities, setCities] = useState<City[]>([]);
  const [meta, setMeta] = useState({
    slotIndex: 0,
    lastCity: "",
    lastNiche: "",
    lastVertical: "",
    bootstrapStart: "",
    help: "",
  });
  const [openVertical, setOpenVertical] = useState<string | null>("stroitelstvo");

  const weightSum = useMemo(
    () => verticals.reduce((s, v) => s + (Number(v.weight) || 0), 0),
    [verticals]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/lead-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-roulette-settings" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка загрузки");
      setDailyLimit(data.dailyQueueLimit ?? 40);
      setDailySendLimit(data.dailySendLimit ?? 40);
      setAutoSendEnabled(data.autoSendEnabled !== false);
      setManualRespectsLimit(!!data.manualRespectsLimit);
      setAutoSendIntervalMin(data.autoSendIntervalMin === 15 ? 15 : 30);
      setCollectPerTick(Number(data.collectPerTick) || 2);
      setVerticals(data.verticals || []);
      setPreview(data.preview || []);
      setRibbon(data.ribbon || []);
      setCities(data.cities || []);
      setMeta({
        slotIndex: data.slotIndex ?? 0,
        lastCity: data.lastCity || "",
        lastNiche: data.lastNiche || "",
        lastVertical: data.lastVertical || "",
        bootstrapStart: data.bootstrapStart || "",
        help: data.help?.note || "",
      });
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setWeight(id: string, weight: number) {
    setVerticals((prev) =>
      prev.map((v) => (v.id === id ? { ...v, weight } : v))
    );
  }

  async function save() {
    setSaving(true);
    setError("");
    setInfo("");
    try {
      const weights = Object.fromEntries(
        verticals.map((v) => [v.id, Number(v.weight) || 0])
      );
      const res = await fetch("/api/lead-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-roulette-settings",
          dailyQueueLimit: dailyLimit,
          dailySendLimit,
          autoSendEnabled,
          manualRespectsLimit,
          autoSendIntervalMin,
          collectPerTick,
          weights,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка сохранения");
      setDailyLimit(data.dailyQueueLimit ?? dailyLimit);
      setDailySendLimit(data.dailySendLimit ?? dailySendLimit);
      setAutoSendEnabled(data.autoSendEnabled !== false);
      setManualRespectsLimit(!!data.manualRespectsLimit);
      setAutoSendIntervalMin(data.autoSendIntervalMin === 15 ? 15 : 30);
      setCollectPerTick(Number(data.collectPerTick) || collectPerTick);
      setVerticals(data.verticals || verticals);
      setPreview(data.preview || []);
      setRibbon(data.ribbon || []);
      setInfo(
        data.autoSendIntervalMin === 15
          ? "Сохранено. Темп 15 мин → до ~40 писем в день."
          : "Сохранено. Спокойный темп 30 мин → ~24–26 писем в окне 09–21; DeepSeek без утреннего залпа."
      );
    } catch (e: any) {
      setError(e?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
        Загружаем рулетку…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Рулетка и лимиты</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            {meta.help ||
              "Лимит — сколько лидов может лежать в очереди «Сегодня». Пропуск и отправка освобождают место."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white"
          >
            <RefreshCw size={14} /> Обновить
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || weightSum <= 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "…" : "Сохранить"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {info}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white">Очередь и отправка</h3>
          <label className="block text-xs text-gray-500">
            Макс. в очереди (утро / добор днём)
            <input
              type="number"
              min={1}
              max={100}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-gray-500">
            Бюджет отправки в день (авто + ручная)
            <input
              type="number"
              min={1}
              max={100}
              value={dailySendLimit}
              onChange={(e) => setDailySendLimit(Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-gray-500">
            Интервал автоотправки
            <select
              value={autoSendIntervalMin}
              onChange={(e) =>
                setAutoSendIntervalMin(
                  Number(e.target.value) === 15 ? 15 : 30
                )
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value={30}>Спокойный · 1 письмо / 30 мин (~24–26/день)</option>
              <option value={15}>Конвейер · 1 письмо / 15 мин (~40/день)</option>
            </select>
          </label>
          <label className="block text-xs text-gray-500">
            КП за тик сбора (DeepSeek), каждые 30 мин
            <input
              type="number"
              min={1}
              max={10}
              value={collectPerTick}
              onChange={(e) => setCollectPerTick(Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="flex items-start gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={autoSendEnabled}
              onChange={(e) => setAutoSendEnabled(e.target.checked)}
            />
            <span>
              Автоотправка без кнопки (окно 09–21 МСК · сбор каплями каждые 30 мин)
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={manualRespectsLimit}
              onChange={(e) => setManualRespectsLimit(e.target.checked)}
            />
            <span>
              Ручной URL тоже уважает лимит очереди
            </span>
          </label>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90 space-y-1">
            <p>
              Kill-switch: снимите галку «Автоотправка» — письма перестанут уходить
              сами, очередь останется.
            </p>
            <p>
              <strong>Пропуск</strong> в админке по-прежнему убирает лид до автоотправки.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Сейчас в ротации</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-gray-500">Слот</dt>
            <dd className="text-white">{meta.slotIndex}</dd>
            <dt className="text-gray-500">Последний город</dt>
            <dd className="text-white">{meta.lastCity || "—"}</dd>
            <dt className="text-gray-500">Последняя вертикаль</dt>
            <dd className="text-white">{meta.lastVertical || "—"}</dd>
            <dt className="text-gray-500">Последняя ниша</dt>
            <dd className="text-white">{meta.lastNiche || "—"}</dd>
            <dt className="text-gray-500">Bootstrap с</dt>
            <dd className="text-white">{meta.bootstrapStart || "—"}</dd>
          </dl>
          <div>
            <p className="text-xs text-gray-500 mb-1">Города v1</p>
            <div className="flex flex-wrap gap-1.5">
              {cities.map((c) => (
                <span
                  key={c.id}
                  className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-gray-300"
                >
                  {c.name}
                  {c.travel ? " · выезд" : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Веса вертикалей</h3>
          <span
            className={
              "text-xs " + (weightSum === 100 ? "text-emerald-400" : "text-amber-400")
            }
          >
            сумма {weightSum}
            {weightSum !== 100 ? " (нормализуется лентой по долям)" : ""}
          </span>
        </div>
        <div className="space-y-4">
          {verticals.map((v) => (
            <div key={v.id}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <button
                  type="button"
                  onClick={() =>
                    setOpenVertical((id) => (id === v.id ? null : v.id))
                  }
                  className="text-sm text-white font-medium hover:text-indigo-300"
                >
                  {openVertical === v.id ? "▾" : "▸"} {v.labelRu}
                  <span className="ml-2 text-xs text-gray-500">
                    {v.niches.length} запросов
                  </span>
                </button>
                <span className="text-xs text-gray-400 w-10 text-right">
                  {v.weight}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={80}
                value={v.weight}
                onChange={(e) => setWeight(v.id, Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              {openVertical === v.id && (
                <ul className="mt-2 grid sm:grid-cols-2 gap-1 text-[11px] text-gray-400">
                  {v.niches.map((n) => (
                    <li key={n} className="truncate">
                      · {n}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold text-white mb-2">
          Лента слотов (цикл)
        </h3>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {ribbon.map((s, i) => (
            <span
              key={`${s.id}-${i}`}
              className={
                "rounded-md px-2 py-1 text-[11px] border " +
                (i === 0
                  ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-200"
                  : "border-white/10 text-gray-400")
              }
              title={`слот ${(meta.slotIndex + i) % Math.max(ribbon.length, 1)}`}
            >
              {s.labelRu}
            </span>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-white mb-2">
          Ближайшие 14 утр (прогноз)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/10">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Вертикаль</th>
                <th className="py-2">Запрос (ниша)</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr
                  key={row.dayOffset}
                  className="border-b border-white/[0.04] text-gray-300"
                >
                  <td className="py-2 pr-3 text-gray-500">
                    {row.dayOffset === 0 ? "сейчас" : `+${row.dayOffset}`}
                  </td>
                  <td className="py-2 pr-3 text-white">{row.vertical}</td>
                  <td className="py-2">{row.nicheHint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-gray-600">
          Город в прогнозе не зафиксирован: в bootstrap — СПб, дальше ротация с
          cooldown. Первый слот ленты = следующий утренний pick.
        </p>
      </div>
    </div>
  );
}
