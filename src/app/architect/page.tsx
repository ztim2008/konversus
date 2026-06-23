import type { Metadata } from "next";
import ArchitectInputForm from "@/components/architect/input-form";

export const metadata: Metadata = {
  title: "Карта роста бизнеса · AI Architect",
  description:
    "Вставьте ссылку на сайт, Ozon, Wildberries или Авито — получите карту потерь дохода и конкретный план роста от AI.",
  robots: { index: true, follow: true },
};

const BENEFITS = [
  {
    icon: "📍",
    title: "Карта потерь",
    desc: "Где и сколько теряет бизнес прямо сейчас",
  },
  {
    icon: "🚀",
    title: "План роста",
    desc: "Конкретные шаги с оценкой влияния на доход",
  },
  {
    icon: "📦",
    title: "Digital-активы",
    desc: "Что нужно создать для системного роста",
  },
];

export default function ArchitectPage() {
  return (
    <main className="arc-page">
      <div className="arc-page-inner">
        {/* Hero */}
        <div className="arc-hero">
          <div className="arc-hero-badge">AI Business Growth Architect</div>
          <h1 className="arc-hero-title">
            Карта роста<br />вашего бизнеса
          </h1>
          <p className="arc-hero-sub">
            Вставьте ссылку — система определит тип бизнеса, найдёт точки потерь дохода
            и сформирует персональный план масштабирования.
          </p>
        </div>

        {/* Form */}
        <div className="arc-form-block">
          <ArchitectInputForm />
        </div>

        {/* Benefits */}
        <div className="arc-benefits">
          {BENEFITS.map((b) => (
            <div key={b.title} className="arc-benefit-card">
              <div className="arc-benefit-icon">{b.icon}</div>
              <div className="arc-benefit-title">{b.title}</div>
              <div className="arc-benefit-desc">{b.desc}</div>
            </div>
          ))}
        </div>

        {/* Footer brand */}
        <div className="arc-powered">
          Инструмент разработан в{" "}
          <a href="https://konversus.ru" target="_blank" rel="noopener noreferrer">
            Konversus
          </a>
        </div>
      </div>
    </main>
  );
}
