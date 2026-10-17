import Link from "next/link";

import type { AdsLink } from "@/lib/seo-positions/ads";
import { ADS_SOURCE_LABEL, formatPeriods, type AdsState, type AdsSummary } from "@/lib/seo-positions/ads-summary";

const th = "px-3 py-2 text-left font-medium text-[var(--muted)]";
const td = "px-3 py-2 border-t border-[var(--line)]";

const STATE_LABEL: Record<AdsState, string> = { on: "реклама шла", off: "реклама стояла", unknown: "нет данных" };
const STATE_CLASS: Record<AdsState, string> = {
  on: "bg-[var(--accent)]",
  off: "border border-[var(--line)]",
  unknown: "bg-[var(--surface-strong)]",
};

export function money(v: number, currency: string | null) {
  const n = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v);
  return `${n} ${currency === "RUB" ? "₽" : (currency ?? "")}`.trim();
}

const int = (v: number) => new Intl.NumberFormat("ru-RU").format(Math.round(v));

/** Лента дней: закрашено — реклама шла, рамка — стояла, серое — данных нет. */
export function AdsStrip({ days, states }: { days: string[]; states: Map<string, AdsState> }) {
  const fmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <div>
      <div className="flex gap-0.5">
        {days.map((d) => {
          const s = states.get(d) ?? "unknown";
          return <span key={d} title={`${fmt.format(new Date(`${d}T00:00:00Z`))}: ${STATE_LABEL[s]}`} className={`h-6 flex-1 rounded-sm ${STATE_CLASS[s]}`} />;
        })}
      </div>
      <div className="mt-1 flex justify-between font-mono text-xs text-[var(--muted)]">
        <span>{fmt.format(new Date(`${days[0]}T00:00:00Z`))}</span>
        <span>{fmt.format(new Date(`${days.at(-1)}T00:00:00Z`))}</span>
      </div>
      <p className="mt-1 flex flex-wrap gap-4 text-xs text-[var(--muted)]">
        {(["on", "off", "unknown"] as AdsState[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded-sm ${STATE_CLASS[s]}`} />
            {STATE_LABEL[s]}
          </span>
        ))}
      </p>
    </div>
  );
}

type Props = {
  projectId: string;
  days: string[];
  summary: AdsSummary;
  links: AdsLink[];
  canEdit: boolean;
};

export function AdsSection({ projectId, days, summary, links, canEdit }: Props) {
  const synced = links.filter((l) => l.syncedAt);
  if (!synced.length && !canEdit) return null;
  const currency = synced[0]?.currency ?? null;
  const known = summary.onDays.length + summary.offDays.length;
  const t = summary.totals;
  const connect = canEdit && (
    <Link href={`/positions/${projectId}/ads`} className="seo-report-screen text-[var(--accent)] hover:underline">
      {links.length ? "Настройки рекламы" : "Подключить рекламу"}
    </Link>
  );

  return (
    <section id="ads" className="mt-8">
      <h2 className="mb-1 text-base font-semibold">Реклама</h2>
      {known === 0 ? (
        <p className="text-[var(--muted)]">
          {synced.length ? "За этот месяц данных о рекламе нет. " : "Реклама к отчёту не подключена. "}
          {connect}
        </p>
      ) : (
        <>
          <p className="mb-3 text-[var(--muted)]">
            {synced.map((l) => `${ADS_SOURCE_LABEL[l.source]}${l.accountName ? ` · ${l.accountName}` : ""}`).join(", ")} {connect}
          </p>
          <AdsStrip days={days} states={summary.states} />
          <p className="mt-3">
            Реклама шла <b className="font-mono">{summary.onDays.length}</b> дн. из {known} с данными.
            {summary.offDays.length > 0 && <> Стояла: {formatPeriods(summary.offDays)}.</>}
            {summary.typicalHours && (
              <>
                {" "}
                Показы обычно с {summary.typicalHours[0]}:00 до {summary.typicalHours[1] + 1}:00 по времени аккаунта.
              </>
            )}
          </p>
          {summary.unknownDays.length > 0 && <p className="text-[var(--muted)]">Нет данных: {formatPeriods(summary.unknownDays)}.</p>}
          <p className="mt-2">
            Показы <b className="font-mono">{int(t.impressions)}</b> · клики <b className="font-mono">{int(t.clicks)}</b> · расход{" "}
            <b className="font-mono">{money(t.cost, currency)}</b> · конверсии <b className="font-mono">{t.conversions}</b>
            {t.conversions > 0 && (
              <>
                {" "}
                · цена конверсии <b className="font-mono">{money(t.cost / t.conversions, currency)}</b>
              </>
            )}
          </p>
          {summary.campaigns.length > 1 && (
            <table className="mt-3 w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Кампания</th>
                  <th className={th}>Дней</th>
                  <th className={th}>Клики</th>
                  <th className={th}>Расход</th>
                  <th className={th}>Конверсии</th>
                </tr>
              </thead>
              <tbody>
                {summary.campaigns.map((c) => (
                  <tr key={`${c.source}:${c.id}`}>
                    <td className={td}>
                      {c.name}
                      {synced.length > 1 && <span className="ml-2 text-xs text-[var(--muted)]">{ADS_SOURCE_LABEL[c.source]}</span>}
                    </td>
                    <td className={`${td} font-mono`}>{c.days}</td>
                    <td className={`${td} font-mono`}>{int(c.clicks)}</td>
                    <td className={`${td} font-mono`}>{money(c.cost, currency)}</td>
                    <td className={`${td} font-mono`}>{c.conversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-[var(--muted)]">
            Места в отчёте выше — обычная выдача Google. Реклама на них не влияет: оплата объявлений не поднимает сайт в
            обычной выдаче, и пауза рекламы его не опускает.
          </p>
        </>
      )}
    </section>
  );
}
