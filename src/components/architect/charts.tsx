"use client";

import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import type { RevenueLeak, RoadmapItem } from "@/lib/architect/types";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// ── Revenue Leaks donut ───────────────────────────────────────────────────

interface LeaksChartProps {
  leaks: RevenueLeak[];
}

export function LeaksDonutChart({ leaks }: LeaksChartProps) {
  const missing = leaks.filter((l) => l.status === "missing").length;
  const weak = leaks.filter((l) => l.status === "weak").length;
  const present = leaks.filter((l) => l.status === "present").length;

  if (missing + weak + present === 0) return null;

  const data = {
    labels: ["Отсутствует", "Слабо работает", "Настроено"],
    datasets: [
      {
        data: [missing, weak, present],
        backgroundColor: ["#ef4444", "#f59e0b", "#22c55e"],
        borderColor: ["#991b1b", "#92400e", "#166534"],
        borderWidth: 1.5,
        hoverOffset: 6,
      },
    ],
  };

  return (
    <div className="arc-chart-wrap arc-chart-donut">
      <div className="arc-chart-title">Распределение точек роста</div>
      <div className="arc-chart-canvas-wrap">
        <Doughnut
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  color: "rgba(255,255,255,0.75)",
                  font: { size: 12, family: "inherit" },
                  boxWidth: 12,
                  padding: 14,
                },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.label}: ${ctx.parsed} канал(а)`,
                },
              },
            },
            cutout: "65%",
          }}
        />
      </div>
    </div>
  );
}

// ── Roadmap impact bar chart ──────────────────────────────────────────────

interface RoadmapChartProps {
  roadmap: RoadmapItem[];
}

export function RoadmapBarChart({ roadmap }: RoadmapChartProps) {
  const items = roadmap.filter((r) => r.revenue_impact_pct > 0).slice(0, 8);
  if (items.length === 0) return null;

  const labels = items.map((r) =>
    r.task.length > 35 ? r.task.slice(0, 33) + "…" : r.task
  );

  const getBarColor = (pct: number) => {
    if (pct >= 20) return "#a78bfa";
    if (pct >= 10) return "#60a5fa";
    return "#34d399";
  };

  const data = {
    labels,
    datasets: [
      {
        label: "Потенциал роста дохода, %",
        data: items.map((r) => r.revenue_impact_pct),
        backgroundColor: items.map((r) => getBarColor(r.revenue_impact_pct)),
        borderRadius: 4,
        barThickness: 22,
      },
    ],
  };

  return (
    <div className="arc-chart-wrap arc-chart-bar">
      <div className="arc-chart-title">Потенциал каждого шага, %</div>
      <div className="arc-chart-canvas-wrap">
        <Bar
          data={data}
          options={{
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` +${ctx.parsed.x}% к доходу`,
                },
              },
            },
            scales: {
              x: {
                grid: { color: "rgba(255,255,255,0.06)" },
                ticks: {
                  color: "rgba(255,255,255,0.5)",
                  font: { size: 11 },
                  callback: (v) => `+${v}%`,
                },
              },
              y: {
                grid: { display: false },
                ticks: {
                  color: "rgba(255,255,255,0.8)",
                  font: { size: 12, family: "inherit" },
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
