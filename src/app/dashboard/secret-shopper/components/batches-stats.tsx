"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type DayFacts = {
  sent: number;
  touch1: number;
  touch2: number;
  touch3: number;
  skipped: number;
  opened: number;
  replied: number;
  bounce: number;
  stillQueued: number;
};

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
  facts?: DayFacts;
};

type TodayReport = DayFacts & {
  date: string;
  sendLimit: number;
};

const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function formatDayRu(iso: string): string {
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  const day = Number(match[3]);
  const month = MONTHS[Number(match[2]) - 1] || match[2];
  return `${day} ${month}`;
}

function factsOf(row: BatchRow): DayFacts {
  const sent = Number(row.facts?.sent ?? row.sent_count ?? 0);
  const touch1 = Number(row.facts?.touch1 ?? sent);
  const touch2 = Number(row.facts?.touch2 ?? 0);
  const touch3 = Number(row.facts?.touch3 ?? 0);
  return {
    sent,
    touch1,
    touch2,
    touch3,
    skipped: Number(row.facts?.skipped ?? row.skipped_count ?? 0),
    opened: Number(row.facts?.opened ?? row.opened_count ?? 0),
    replied: Number(row.facts?.replied ?? row.replied_count ?? 0),
    bounce: Number(row.facts?.bounce ?? row.bounce_count ?? 0),
    stillQueued: Number(row.facts?.stillQueued ?? 0),
  };
}

function dayLine(facts: DayFacts): string {
  const parts = [
    `первое ${facts.touch1}`,
    `второе ${facts.touch2}`,
    `третье ${facts.touch3}`,
    `прочитали ${facts.opened}`,
    `ответили ${facts.replied}`,
  ];
  if (facts.bounce > 0) parts.push(`не дошло ${facts.bounce}`);
  return parts.join(", ");
}

export function BatchesStats() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [today, setToday] = useState<TodayReport | null>(null);
  const [tokensAll, setTokensAll] = useState(0);
  const [usdAll, setUsdAll] = useState(0);
  const [config, setConfig] = useState<{
    dailyQueueLimit: number;
    dailySendLimit: number;
    dailyReportHourMsk: number;
  } | null>(null);
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
      setToday(data.today || null);
      setTokensAll(data.tokensAll || 0);
      setUsdAll(data.usdAll || 0);
      setConfig(data.config || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить отчёт");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const todayDate = today?.date || "";
  const past = batches.filter((row) => row.batch_date !== todayDate);
  const week = past.slice(0, 7);
  const weekTotals = week.reduce(
    (acc, row) => {
      const facts = factsOf(row);
      acc.touch1 += facts.touch1;
      acc.touch2 += facts.touch2;
      acc.touch3 += facts.touch3;
      acc.opened += facts.opened;
      acc.replied += facts.replied;
      acc.bounce += facts.bounce;
      return acc;
    },
    { touch1: 0, touch2: 0, touch3: 0, opened: 0, replied: 0, bounce: 0 }
  );
  const sendLimit = today?.sendLimit || config?.dailySendLimit || 40;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Отчёт</h2>
          <p className="mt-1 text-sm text-gray-500">
            Цифры живые: если письмо откроют завтра, «прочитали» вырастет.
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

      {loading && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
          Считаем письма…
        </div>
      )}

      {!loading && today && (
        <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
          <h3 className="text-sm text-gray-400">
            Сегодня, {formatDayRu(today.date)}
          </h3>
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <div>
              <div className="text-sm text-gray-400">Ушло</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums text-white">
                {today.sent}{" "}
                <span className="text-lg font-normal text-gray-500">
                  из {sendLimit}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Прочитали</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums text-white">
                {today.opened}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Как минимум. Почта часто прячет счётчик, пока не нажмут «показать картинки».
              </p>
            </div>
            <div>
              <div className="text-sm text-gray-400">Ответили</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums text-white">
                {today.replied}
              </div>
            </div>
          </div>
          <p className="mt-5 text-sm text-gray-400">
            Первое {today.touch1 || 0}, второе {today.touch2 || 0}, третье{" "}
            {today.touch3 || 0}. Лимит общий на все письма дня.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Не дошло: {today.bounce}
            {today.bounce > 0
              ? ". Почта получателя вернула письмо."
              : ""}
          </p>
        </section>
      )}

      {!loading && week.length > 0 && (
        <p className="mt-4 text-sm text-gray-400">
          За прошлые {week.length}{" "}
          {week.length === 1 ? "день" : week.length < 5 ? "дня" : "дней"}: первое{" "}
          {weekTotals.touch1}, второе {weekTotals.touch2}, третье {weekTotals.touch3},
          прочитали {weekTotals.opened}, ответили {weekTotals.replied}
          {weekTotals.bounce > 0 ? `, не дошло ${weekTotals.bounce}` : ""}.
        </p>
      )}

      {!loading && past.length > 0 && (
        <ul className="mt-4 divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {past.slice(0, 14).map((row) => {
            const facts = factsOf(row);
            return (
              <li key={row.batch_date} className="py-2.5 text-sm">
                <span className="text-white">{formatDayRu(row.batch_date)}</span>
                <span className="text-gray-400"> — {dayLine(facts)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && batches.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-gray-500">
          Пока нет отправленных дней.
        </div>
      )}

      {!loading && batches.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-400">
            Подробнее: план, пропуски, токены
          </summary>
          <p className="mt-3 text-xs text-gray-500">
            План — сколько КП собрали утром. Пропуск — письмо не отправили.
            Токены — расход на тексты. Вечерний отчёт в Telegram уходит в{" "}
            {config?.dailyReportHourMsk ?? 21}:00. Всего токенов{" "}
            {tokensAll.toLocaleString("ru-RU")} (~${usdAll.toFixed(2)}). Лимит сбора{" "}
            {config?.dailyQueueLimit ?? 20} настраивается во вкладке «Рулетка».
          </p>
          <div className="mt-3 overflow-x-auto border border-white/[0.06] rounded-xl">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-gray-500">
                  <th className="p-3 font-normal">Дата</th>
                  <th className="p-3 font-normal">Первое</th>
                  <th className="p-3 font-normal">Второе</th>
                  <th className="p-3 font-normal">Третье</th>
                  <th className="p-3 font-normal">Прочитали</th>
                  <th className="p-3 font-normal">Ответили</th>
                  <th className="p-3 font-normal">Не дошло</th>
                  <th className="p-3 font-normal">Пропуск</th>
                  <th className="p-3 font-normal">План</th>
                  <th className="p-3 font-normal">Токены</th>
                  <th className="p-3 font-normal">Отчёт</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((row) => {
                  const facts = factsOf(row);
                  return (
                    <tr key={row.batch_date} className="border-b border-white/[0.04]">
                      <td className="p-3 text-white">{formatDayRu(row.batch_date)}</td>
                      <td className="p-3 text-gray-300">{facts.touch1}</td>
                      <td className="p-3 text-gray-300">{facts.touch2}</td>
                      <td className="p-3 text-gray-300">{facts.touch3}</td>
                      <td className="p-3 text-gray-300">{facts.opened}</td>
                      <td className="p-3 text-gray-300">{facts.replied}</td>
                      <td className="p-3 text-gray-300">{facts.bounce}</td>
                      <td className="p-3 text-gray-400">{facts.skipped}</td>
                      <td className="p-3 text-gray-400">{row.queued_count}</td>
                      <td className="p-3 text-gray-300">
                        {Number(row.tokens_total || 0).toLocaleString("ru-RU")}
                        <span className="block text-xs text-gray-600">
                          ~${Number(row.usd_estimate || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-gray-400">
                        {row.report_sent ? "ушёл" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
