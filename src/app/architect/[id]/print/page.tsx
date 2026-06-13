import { notFound } from "next/navigation";
import { getArchitectProject } from "@/lib/data/architect";
import type { ArchitectReport } from "@/lib/architect/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

const PRIORITY_LABELS: Record<string, string> = {
  must: "Обязательно",
  should: "Рекомендуется",
  nice: "Желательно",
};

const COMPLEXITY_LABELS: Record<string, string> = {
  easy: "Просто",
  medium: "Средне",
  hard: "Сложно",
};

function seoColor(score: number) {
  return score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
}

export default async function ArchitectPrintPage({ params }: Props) {
  const { id } = await params;
  const project = await getArchitectProject(id);
  if (!project || project.status !== "done" || !project.result_json) return notFound();

  const r: ArchitectReport = project.result_json;
  const snap = project.snapshot_json;
  const seo = snap?.seo_metrics;
  const contacts = snap?.contacts_found;

  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>AI Architect — {project.url}</title>
        <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      </head>
      <body>
        {/* Cover */}
        <div className="cover">
          <div className="cover-badge">AI Business Growth Architect</div>
          <div className="cover-title">Карта роста бизнеса</div>
          <div className="cover-url">{project.url}</div>
          <div className="cover-growth">+{r.growth_potential_pct}%</div>
          <div className="cover-growth-label">потенциал роста</div>
          <p className="cover-verdict">{r.verdict}</p>
          <div className="cover-niche">{r.niche}</div>
          <div className="cover-footer">
            konversus.ru · Отчёт сформирован {new Date().toLocaleDateString("ru-RU")}
          </div>
        </div>

        {/* 01 Positioning */}
        <div className="section">
          <div className="section-num">01</div>
          <div className="section-title">Позиционирование</div>
          <div className="pos-grid">
            <div className="pos-card pos-current">
              <div className="pos-label">Сейчас</div>
              <p>{r.positioning_map.current_image}</p>
            </div>
            <div className="pos-arrow">→</div>
            <div className="pos-card pos-potential">
              <div className="pos-label">Потенциал</div>
              <p>{r.positioning_map.potential_image}</p>
            </div>
          </div>
          <div className="gaps-title">Разрывы позиционирования</div>
          <ul className="gaps-list">
            {r.positioning_map.positioning_gaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
          <div className="keywords">
            {r.positioning_map.brand_keywords.map((k) => (
              <span key={k} className="keyword">{k}</span>
            ))}
          </div>
        </div>

        {/* 02 Revenue Leaks */}
        <div className="section">
          <div className="section-num">02</div>
          <div className="section-title">Точки потерь дохода</div>
          <div className="leaks-grid">
            {r.revenue_leaks.map((leak, i) => (
              <div key={i} className={`leak-card leak-${leak.status}`}>
                <div className="leak-header">
                  <span className="leak-channel">{leak.channel}</span>
                  <span className={`leak-status-badge leak-${leak.status}-badge`}>
                    {leak.status === "missing" ? "Отсутствует" : leak.status === "weak" ? "Слабо" : "Работает"}
                  </span>
                </div>
                <div className="leak-loss">{leak.estimated_loss}</div>
                <p className="leak-desc">{leak.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 03 Growth Opportunities */}
        <div className="section">
          <div className="section-num">03</div>
          <div className="section-title">Возможности роста</div>
          <div className="opps-grid">
            {r.growth_opportunities.map((opp, i) => (
              <div key={i} className="opp-card">
                <div className="opp-header">
                  <span className="opp-type">{opp.type}</span>
                  <span className={`opp-impact opp-impact-${opp.impact}`}>
                    {opp.impact === "high" ? "Высокий" : opp.impact === "medium" ? "Средний" : "Базовый"}
                  </span>
                </div>
                <div className="opp-title">{opp.title}</div>
                <p className="opp-desc">{opp.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 04 Roadmap */}
        <div className="section">
          <div className="section-num">04</div>
          <div className="section-title">Roadmap роста</div>
          <table className="roadmap-table">
            <thead>
              <tr>
                <th>#</th><th>Задача</th><th>Категория</th>
                <th>Сложность</th><th>Срок</th><th>Эффект</th>
              </tr>
            </thead>
            <tbody>
              {r.roadmap.map((item, i) => (
                <tr key={i}>
                  <td className="roadmap-num">{String(i + 1).padStart(2, "0")}</td>
                  <td>{item.task}</td>
                  <td><span className="cat-badge">{item.category}</span></td>
                  <td>{COMPLEXITY_LABELS[item.complexity] ?? item.complexity}</td>
                  <td>{item.timeline}</td>
                  <td className="roadmap-impact">+{item.revenue_impact_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 05 Digital Assets */}
        <div className="section">
          <div className="section-num">05</div>
          <div className="section-title">Digital-активы</div>
          <div className="assets-grid">
            {r.digital_assets.map((asset, i) => (
              <div key={i} className={`asset-card asset-${asset.priority}`}>
                <div className="asset-priority">{PRIORITY_LABELS[asset.priority] ?? asset.priority}</div>
                <div className="asset-name">{asset.asset}</div>
                <p className="asset-purpose">{asset.purpose}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SEO Аудит */}
        {seo && (
          <div className="section">
            <div className="section-num">SEO</div>
            <div className="section-title">SEO-аудит сайта</div>
            <div className="seo-layout">
              <div className="seo-score-block">
                <div className="seo-score-num" style={{ color: seoColor(seo.score) }}>{seo.score}</div>
                <div className="seo-score-label">из 100</div>
                <div className="seo-score-status" style={{ color: seoColor(seo.score) }}>
                  {seo.score >= 75 ? "Хорошая оптимизация" : seo.score >= 50 ? "Требует доработки" : "Критические проблемы"}
                </div>
              </div>
              <div className="seo-checks">
                {seo.checks.map((c) => (
                  <div key={c.key} className={`seo-check seo-check-${c.status}`}>
                    <span className="seo-check-icon">{c.status === "ok" ? "✓" : c.status === "warn" ? "⚠" : "✗"}</span>
                    <span className="seo-check-label">{c.label}</span>
                    {c.value && <span className="seo-check-val">{c.value}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Contacts */}
        {contacts && (contacts.phones.length > 0 || contacts.emails.length > 0 || contacts.socials.length > 0) && (
          <div className="section">
            <div className="section-num">06</div>
            <div className="section-title">Цифровой след бизнеса</div>
            <div className="contacts-grid">
              {contacts.phones.length > 0 && (
                <div>
                  <div className="contacts-block-title">Телефоны</div>
                  {contacts.phones.map((p, i) => <div key={i} className="contact-item">{p}</div>)}
                </div>
              )}
              {contacts.emails.length > 0 && (
                <div>
                  <div className="contacts-block-title">Email</div>
                  {contacts.emails.map((e, i) => <div key={i} className="contact-item">{e}</div>)}
                </div>
              )}
              {contacts.socials.length > 0 && (
                <div>
                  <div className="contacts-block-title">Соцсети</div>
                  {contacts.socials.map((s, i) => (
                    <div key={i} className="contact-item">{s.platform}{s.handle ? ` · ${s.handle}` : ""}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary / CTA */}
        <div className="summary-block">
          <div className="summary-title">Вывод</div>
          <p className="summary-text">{r.summary}</p>
          <div className="summary-contacts">
            <span>Алексей Тимофеев · konversus.ru</span>
            <span>Telegram: @bilarius</span>
          </div>
        </div>

      </body>
    </html>
  );
}

const PRINT_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  font-size: 11px;
  line-height: 1.5;
  color: #1a1a2e;
  background: #fff;
}

/* Cover */
.cover {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px 60px 40px;
  background: #0a0f1a;
  color: #edf1f4;
  page-break-after: always;
}
.cover-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #f6c47b;
  background: rgba(246,196,123,.1);
  display: inline-block;
  padding: 5px 14px;
  border-radius: 2px;
  margin-bottom: 24px;
}
.cover-title {
  font-size: 42px;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 12px;
}
.cover-url {
  font-size: 13px;
  color: #8d99a6;
  margin-bottom: 40px;
  font-family: monospace;
}
.cover-growth {
  font-size: 80px;
  font-weight: 800;
  color: #f6c47b;
  line-height: 1;
}
.cover-growth-label {
  font-size: 14px;
  color: #8d99a6;
  margin-bottom: 32px;
}
.cover-verdict {
  font-size: 14px;
  line-height: 1.65;
  color: #b8c2ca;
  max-width: 560px;
  margin-bottom: 20px;
}
.cover-niche {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #8d99a6;
}
.cover-footer {
  margin-top: auto;
  padding-top: 40px;
  font-size: 10px;
  color: #4d5966;
}

/* Section */
.section {
  padding: 40px 60px;
  border-bottom: 1px solid #f0f0f0;
  page-break-inside: avoid;
}
.section-num {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: #9ca3af;
  margin-bottom: 6px;
}
.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 20px;
}

/* Positioning */
.pos-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}
.pos-arrow { font-size: 20px; color: #9ca3af; text-align: center; }
.pos-card {
  padding: 16px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.6;
}
.pos-current { background: #fff8f0; border: 1px solid #fed7aa; }
.pos-potential { background: #f0fdf4; border: 1px solid #bbf7d0; }
.pos-label { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 6px; color: #6b7280; }
.gaps-title { font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 8px; }
.gaps-list { padding-left: 16px; margin-bottom: 12px; }
.gaps-list li { margin-bottom: 4px; font-size: 12px; color: #4b5563; }
.keywords { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.keyword { font-size: 10px; font-weight: 600; background: #f3f4f6; color: #374151; padding: 3px 10px; border-radius: 2px; }

/* Leaks */
.leaks-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.leak-card { padding: 14px; border-radius: 4px; font-size: 12px; }
.leak-missing { background: #fef2f2; border: 1px solid #fecaca; }
.leak-weak { background: #fffbeb; border: 1px solid #fde68a; }
.leak-present { background: #f0fdf4; border: 1px solid #bbf7d0; }
.leak-header { display: flex; justify-content: space-between; margin-bottom: 4px; align-items: baseline; }
.leak-channel { font-weight: 600; font-size: 12px; }
.leak-missing-badge { color: #dc2626; font-size: 9px; font-weight: 700; text-transform: uppercase; }
.leak-weak-badge { color: #d97706; font-size: 9px; font-weight: 700; text-transform: uppercase; }
.leak-present-badge { color: #16a34a; font-size: 9px; font-weight: 700; text-transform: uppercase; }
.leak-loss { font-size: 13px; font-weight: 700; color: #dc2626; margin-bottom: 4px; }
.leak-desc { color: #4b5563; font-size: 11px; line-height: 1.5; }

/* Opportunities */
.opps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.opp-card { padding: 14px; border: 1px solid #e5e7eb; border-radius: 4px; }
.opp-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.opp-type { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #6b7280; }
.opp-impact-high { color: #dc2626; font-size: 9px; font-weight: 700; }
.opp-impact-medium { color: #d97706; font-size: 9px; font-weight: 700; }
.opp-impact-low { color: #6b7280; font-size: 9px; font-weight: 700; }
.opp-title { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.opp-desc { font-size: 11px; color: #4b5563; line-height: 1.5; }

/* Roadmap table */
.roadmap-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.roadmap-table th { text-align: left; padding: 8px 10px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; }
.roadmap-table td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
.roadmap-num { font-family: monospace; color: #9ca3af; }
.cat-badge { font-size: 9px; background: #f3f4f6; color: #374151; padding: 2px 6px; border-radius: 2px; }
.roadmap-impact { font-weight: 700; color: #16a34a; }

/* Assets */
.assets-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.asset-card { padding: 14px; border-radius: 4px; }
.asset-must { background: #fff8f0; border: 1px solid #fed7aa; }
.asset-should { background: #f0f9ff; border: 1px solid #bae6fd; }
.asset-nice { background: #f9fafb; border: 1px solid #e5e7eb; }
.asset-priority { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 6px; color: #6b7280; }
.asset-name { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.asset-purpose { font-size: 11px; color: #4b5563; line-height: 1.5; }

/* SEO */
.seo-layout { display: grid; grid-template-columns: 160px 1fr; gap: 20px; align-items: start; }
.seo-score-block { text-align: center; padding: 20px; background: #f9fafb; border-radius: 6px; }
.seo-score-num { font-size: 52px; font-weight: 800; line-height: 1; }
.seo-score-label { font-size: 11px; color: #6b7280; margin-bottom: 8px; }
.seo-score-status { font-size: 11px; font-weight: 600; }
.seo-checks { display: flex; flex-direction: column; gap: 4px; }
.seo-check { display: flex; gap: 8px; align-items: baseline; font-size: 11px; padding: 4px 0; border-bottom: 1px solid #f3f4f6; }
.seo-check-ok .seo-check-icon { color: #16a34a; font-weight: 700; }
.seo-check-warn .seo-check-icon { color: #d97706; font-weight: 700; }
.seo-check-fail .seo-check-icon { color: #dc2626; font-weight: 700; }
.seo-check-label { flex: 1; }
.seo-check-val { font-size: 10px; color: #6b7280; white-space: nowrap; }

/* Contacts */
.contacts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.contacts-block-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #6b7280; margin-bottom: 8px; }
.contact-item { font-size: 12px; color: #1a1a2e; margin-bottom: 4px; }

/* Summary */
.summary-block {
  padding: 40px 60px;
  background: #0a0f1a;
  color: #edf1f4;
}
.summary-title {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: #8d99a6;
  margin-bottom: 12px;
}
.summary-text {
  font-size: 14px;
  line-height: 1.7;
  color: #b8c2ca;
  max-width: 600px;
  margin-bottom: 24px;
}
.summary-contacts {
  display: flex;
  gap: 24px;
  font-size: 11px;
  color: #f6c47b;
  font-weight: 600;
}
`;
