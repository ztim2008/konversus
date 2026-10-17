"use client";

import { useSyncExternalStore } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

export type ChartPoint = { at: string; position: number | null; status: "found" | "not_found" | "error" };

type Palette = { accent: string; warm: string; muted: string; line: string; foreground: string };

function readPalette(): string {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  const palette: Palette = {
    accent: v("--accent"),
    warm: v("--accent-warm"),
    muted: v("--muted"),
    line: v("--line"),
    foreground: v("--foreground"),
  };
  return JSON.stringify(palette);
}

const noopSubscribe = () => () => {};

/** Отметка «что изменили»: index — номер точки графика (первая проверка после даты правки), n — номер в списке. */
export type ChartMark = { index: number; n: number };

export function PositionChart({
  points,
  depth,
  timeZone,
  marks = [],
  adsOn,
}: {
  points: ChartPoint[];
  depth: number;
  timeZone: string;
  marks?: ChartMark[];
  /** По точкам: в день этой проверки шла реклама. */
  adsOn?: boolean[];
}) {
  const paletteJson = useSyncExternalStore(noopSubscribe, readPalette, () => null);
  const timeFormat = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });

  if (!paletteJson) return <div className="h-64" />;
  const palette = JSON.parse(paletteJson) as Palette;
  if (points.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">Проверок ещё не было</div>;
  }

  const labels = points.map((p) => timeFormat.format(new Date(p.at)));
  const found = points.map((p) => (p.status === "found" ? p.position : null));
  const maxFound = Math.max(10, ...found.filter((n): n is number => n !== null));
  const yMax = Math.min(depth, Math.ceil((maxFound + 5) / 10) * 10);
  // Отметки «нет в выдаче» и «ошибка» стоят на нижней кромке графика: это не позиция, а отдельное состояние.
  const notFound = points.map((p) => (p.status === "not_found" ? yMax : null));
  const errors = points.map((p) => (p.status === "error" ? yMax : null));

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      y: {
        reverse: true,
        min: 1,
        max: yMax,
        ticks: { color: palette.muted, precision: 0 },
        grid: { color: palette.line },
      },
      x: { ticks: { color: palette.muted, maxRotation: 0, autoSkip: true }, grid: { display: false } },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const p = points[ctx.dataIndex];
            if (p.status === "error") return "ошибка проверки, позиции нет";
            if (p.status === "not_found") return `не найден в топ-${depth}`;
            return `место ${p.position}`;
          },
        },
      },
    },
  };

  const marksPlugin: Plugin<"line"> = {
    id: "seoMarks",
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const byIndex = new Map<number, number[]>();
      for (const m of marks) byIndex.set(m.index, [...(byIndex.get(m.index) ?? []), m.n]);
      ctx.save();
      ctx.font = "11px var(--font-plex-mono), monospace";
      for (const [index, ns] of byIndex) {
        const x = scales.x.getPixelForValue(index);
        ctx.strokeStyle = palette.muted;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
        ctx.fillStyle = palette.foreground;
        ctx.fillText(ns.join(","), x + 4, chartArea.top + 11);
      }
      ctx.restore();
    },
  };

  const adsPlugin: Plugin<"line"> = {
    id: "seoAds",
    beforeDatasetsDraw(chart) {
      if (!adsOn?.some(Boolean)) return;
      const { ctx, chartArea, scales } = chart;
      const x = (i: number) => scales.x.getPixelForValue(i);
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = palette.accent;
      adsOn.forEach((on, i) => {
        if (!on) return;
        const left = i === 0 ? chartArea.left : (x(i - 1) + x(i)) / 2;
        const right = i === points.length - 1 ? chartArea.right : (x(i) + x(i + 1)) / 2;
        ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top);
      });
      ctx.restore();
    },
  };

  return (
    <div className="h-64">
      <Line
        plugins={[adsPlugin, marksPlugin]}
        options={options}
        data={{
          labels,
          datasets: [
            {
              data: found,
              borderColor: palette.accent,
              backgroundColor: palette.accent,
              pointRadius: 3,
              spanGaps: false,
              tension: 0,
            },
            {
              data: notFound,
              showLine: false,
              pointStyle: "crossRot",
              pointRadius: 6,
              borderColor: palette.muted,
              backgroundColor: palette.muted,
              clip: false,
            },
            {
              data: errors,
              showLine: false,
              pointStyle: "triangle",
              pointRadius: 6,
              borderColor: palette.warm,
              backgroundColor: palette.warm,
              clip: false,
            },
          ],
        }}
      />
    </div>
  );
}
