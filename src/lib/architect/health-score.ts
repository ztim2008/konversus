/**
 * Health Score — сводная детерминированная оценка здоровья сайта (0–100).
 *
 * Логика:
 *  1. Каждый блок нормируется в 0–100.
 *  2. Базовый score = взвешенная сумма (вес = вклад в бизнес-результат).
 *  3. Юридический блок (152-ФЗ) работает как понижающий «жёсткий кап»:
 *     сайт с формами, но без политики конф. не может получить высокий балл,
 *     даже при идеальном SEO. Это отражает реальный риск штрафов.
 *
 * Веса (упор на SEO):
 *   SEO 30 · Визуал 15 · Скорость 15 · Тех 15 · Legal 15 · РФ 10 = 100
 */

import type {
  ArchitectReport,
  ArchitectSnapshot,
  HealthBreakdown,
  HealthBreakdownItem,
} from "@/lib/architect/types";

const WEIGHTS = {
  seo: 30,
  visual: 15,
  speed: 15,
  tech: 15,
  legal: 15,
  ru: 10,
} as const;

const TOTAL_WEIGHT =
  WEIGHTS.seo + WEIGHTS.visual + WEIGHTS.speed + WEIGHTS.tech + WEIGHTS.legal + WEIGHTS.ru;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** SEO-видимость из готового seo_metrics.score */
function seoScore(s: ArchitectSnapshot): number {
  return clamp(s.seo_metrics?.score ?? 50);
}

/** Среднее design + trust + clarity. Если визуал не анализировался — нейтрально 50 */
function visualScore(s: ArchitectSnapshot): number {
  const v = s.visual_analysis;
  if (!v) return 50;
  if (v.design_score === 0 && v.trust_score === 0 && v.clarity_score === 0) return 50;
  return clamp(Math.round((v.design_score + v.trust_score + v.clarity_score) / 3));
}

/** PageSpeed perf score (fallback по TTFB если PSI недоступен) */
function speedScore(s: ArchitectSnapshot): number {
  const spd = s.speed_audit;
  if (!spd) return 50;
  if (typeof spd.ps_score === "number") return clamp(spd.ps_score);
  // Fallback по TTFB: <300мс ≈ 90, >1500мс ≈ 20
  const ttfb = spd.ttfb_ms ?? null;
  if (ttfb === null) return 50;
  return clamp(Math.round(100 - (ttfb / 1500) * 80));
}

/** Тех. здоровье: набор boolean-проверок → 0–100 */
function techScore(s: ArchitectSnapshot): number {
  const t = s.tech_metrics;
  if (!t) return 50;

  const checks: Array<{ ok: boolean; w: number }> = [
    { ok: t.has_viewport_meta, w: 18 },
    { ok: t.has_responsive_css, w: 12 },
    { ok: typeof t.has_sitemap === "boolean" ? t.has_sitemap : true, w: 12 },
    { ok: typeof t.has_robots_txt === "boolean" ? t.has_robots_txt : true, w: 8 },
    {
      ok: t.analytics.yandex_metrika || t.analytics.google_analytics || t.analytics.google_tag_manager,
      w: 20,
    },
    { ok: (t.response_time_ms ?? 9999) < 800, w: 15 },
    { ok: (t.page_size_kb ?? 9999) < 2500, w: 15 },
  ];

  const earned = checks.reduce((sum, c) => sum + (c.ok ? c.w : 0), 0);
  return clamp(Math.round((earned / 100) * 100));
}

/** Доступность из РФ */
function ruScore(s: ArchitectSnapshot): number {
  return clamp(s.ru_blocking?.score ?? 100);
}

/** Legal → 0–100 по risk_level */
function legalScore(report: ArchitectReport): number {
  const lc = report.legal_compliance;
  if (!lc) return 100; // не анализировалось — нейтрально (не штрафуем)
  switch (lc.risk_level) {
    case "critical":
      return 15;
    case "high":
      return 40;
    case "medium":
      return 70;
    case "low":
      return 90;
    default:
      return 100;
  }
}

type RiskLevel = "low" | "medium" | "high" | "critical";

/** Эскалация риска: при наличии форм и отсутствии согласия — уровень растёт */
function escalate(level: RiskLevel): RiskLevel {
  const order: RiskLevel[] = ["low", "medium", "high", "critical"];
  const idx = order.indexOf(level);
  return order[Math.min(order.length - 1, idx + 1)];
}

export function calcHealthScore(
  snapshot: ArchitectSnapshot,
  report: ArchitectReport
): HealthBreakdown {
  const rawItems: Array<Omit<HealthBreakdownItem, "contribution">> = [
    { key: "seo", label: "SEO-видимость", score: seoScore(snapshot), weight: WEIGHTS.seo },
    { key: "visual", label: "Дизайн и UX", score: visualScore(snapshot), weight: WEIGHTS.visual },
    { key: "speed", label: "Скорость", score: speedScore(snapshot), weight: WEIGHTS.speed },
    { key: "tech", label: "Тех. здоровье", score: techScore(snapshot), weight: WEIGHTS.tech },
    { key: "legal", label: "Закон 152-ФЗ", score: legalScore(report), weight: WEIGHTS.legal },
    { key: "ru", label: "Доступность в РФ", score: ruScore(snapshot), weight: WEIGHTS.ru },
  ];

  const items: HealthBreakdownItem[] = rawItems.map((it) => ({
    ...it,
    contribution: Math.round((it.score / 100) * it.weight),
  }));

  const baseScore = Math.round(
    items.reduce((sum, it) => sum + (it.score / 100) * it.weight, 0)
  );

  // ── Юридический жёсткий кап ────────────────────────────────────────────
  let finalScore = baseScore;
  let legalCapped = false;
  let capReason: string | undefined;

  const lc = report.legal_compliance;
  const forms = snapshot.forms?.collects_personal_data ?? false;

  if (lc) {
    let level: RiskLevel = lc.risk_level;

    // Формы без политики/согласия → эскалация до critical
    if (forms && (!lc.has_privacy_policy || !lc.has_personal_data_agreement)) {
      level = escalate(escalate(level));
    } else if (forms && !lc.has_cookie_banner) {
      level = escalate(level);
    }

    if (level === "critical") {
      finalScore = Math.min(finalScore, 45);
      legalCapped = true;
      capReason = forms
        ? "Формы сбора данных без политики конфиденциальности — критический риск штрафов"
        : "Критические нарушения 152-ФЗ";
    } else if (level === "high") {
      finalScore = Math.min(finalScore, 60);
      legalCapped = true;
      capReason = "Серьёзные пробелы в соответствии 152-ФЗ";
    } else if (level === "medium" && forms && !lc.has_personal_data_agreement) {
      finalScore = Math.min(finalScore, 70);
      legalCapped = true;
      capReason = "Формы есть, но согласие на обработку ПД не оформлено";
    }
  }

  return {
    score: clamp(finalScore),
    base_score: clamp(baseScore),
    legal_capped: legalCapped,
    cap_reason: capReason,
    items,
  };
}

export { TOTAL_WEIGHT as HEALTH_TOTAL_WEIGHT };
