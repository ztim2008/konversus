"use client";

import { useEffect, useState } from "react";
import type { ProjectStatus } from "@/lib/architect/types";

interface SnapshotMeta {
  title?: string | null;
  cms?: string | null;
  h1?: string | null;
  word_count?: number | null;
  image_count?: number | null;
  has_schema_org?: boolean;
  phones_count?: number;
  emails_count?: number;
  socials_count?: number;
}

interface Step {
  id: string;
  label: string;
  activeLabel?: string;
  icon: string;
  status: "waiting" | "active" | "done";
  details?: string[];
}

interface Props {
  status: ProjectStatus;
  snapshotMeta: SnapshotMeta | null;
}

const MESSAGES_ANALYZING = [
  "AI изучает конкурентную среду...",
  "Выявляем точки потерь дохода...",
  "Оцениваем потенциал роста...",
  "Строим персональную дорожную карту...",
  "Финальные расчёты по стратегии...",
];

export function ProgressSteps({ status, snapshotMeta }: Props) {
  const [analyzingMsg, setAnalyzingMsg] = useState(MESSAGES_ANALYZING[0]);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (status !== "analyzing") return;
    const timer = setInterval(() => {
      setMsgIdx((i) => {
        const next = (i + 1) % MESSAGES_ANALYZING.length;
        setAnalyzingMsg(MESSAGES_ANALYZING[next]);
        return next;
      });
    }, 2800);
    return () => clearInterval(timer);
  }, [status]);

  // Собираем findings из snapshot_meta
  const findings: string[] = [];
  if (snapshotMeta) {
    if (snapshotMeta.title) findings.push(`Заголовок: «${snapshotMeta.title.slice(0, 60)}»`);
    if (snapshotMeta.cms) findings.push(`CMS: ${snapshotMeta.cms}`);
    if (snapshotMeta.word_count) findings.push(`Объём контента: ~${snapshotMeta.word_count} слов`);
    if (snapshotMeta.image_count) findings.push(`Изображений: ${snapshotMeta.image_count}`);
    if (snapshotMeta.has_schema_org) findings.push("Schema.org разметка: найдена");
    const contacts: string[] = [];
    if (snapshotMeta.phones_count) contacts.push(`${snapshotMeta.phones_count} тел.`);
    if (snapshotMeta.emails_count) contacts.push(`${snapshotMeta.emails_count} email`);
    if (snapshotMeta.socials_count) contacts.push(`${snapshotMeta.socials_count} соцсетей`);
    if (contacts.length) findings.push(`Контакты: ${contacts.join(", ")}`);
  }

  const steps: Step[] = [
    {
      id: "connect",
      label: "Подключаемся к источнику",
      icon: "🔗",
      status:
        status === "pending"
          ? "active"
          : "done",
    },
    {
      id: "scan",
      label: "Сканируем структуру",
      activeLabel: "Анализируем страницы...",
      icon: "📊",
      status:
        status === "pending"
          ? "waiting"
          : status === "collecting"
          ? "active"
          : "done",
      details: status !== "pending" && status !== "collecting" ? findings : undefined,
    },
    {
      id: "ai",
      label: "AI анализирует бизнес",
      activeLabel: analyzingMsg,
      icon: "🤖",
      status:
        status === "analyzing"
          ? "active"
          : status === "done" || status === "failed"
          ? "done"
          : "waiting",
    },
    {
      id: "report",
      label: "Отчёт формируется",
      icon: "📋",
      status: status === "done" ? "done" : "waiting",
    },
  ];

  return (
    <div className="arc-progress-steps">
      {steps.map((step, i) => (
        <div
          key={step.id}
          className={`arc-ps-step arc-ps-step--${step.status}`}
          style={{ animationDelay: `${i * 0.12}s` }}
        >
          <div className="arc-ps-left">
            <div className="arc-ps-dot">
              {step.status === "done" ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : step.status === "active" ? (
                <div className="arc-ps-spinner" />
              ) : (
                <span className="arc-ps-num">{i + 1}</span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={`arc-ps-line arc-ps-line--${step.status === "done" ? "done" : "wait"}`} />
            )}
          </div>
          <div className="arc-ps-body">
            <div className="arc-ps-icon">{step.icon}</div>
            <div className="arc-ps-content">
              <div className="arc-ps-label">
                {step.status === "active" && step.activeLabel
                  ? step.activeLabel
                  : step.label}
              </div>
              {step.status === "done" && step.details && step.details.length > 0 && (
                <ul className="arc-ps-findings">
                  {step.details.map((d, di) => (
                    <li key={di}>✓ {d}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
