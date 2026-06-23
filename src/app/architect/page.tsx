import type { Metadata } from "next";
import ArchitectInputForm from "@/components/architect/input-form";

export const metadata: Metadata = {
  title: "AI-Аудитор сайта — узнайте где теряете клиентов",
  description: "Бесплатный AI-аудит: SEO, скорость, безопасность, мобильность. Скриншот сайта, CMS-детекция, контакты. Конкретные проблемы с ценами исправления.",
  keywords: ["аудит сайта", "ai аудит", "проверка сайта", "анализ сайта", "где теряю клиентов", "рост конверсии"],
  robots: { index: true, follow: true },
};

export default function ArchitectPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 80px" }}>

      {/* Hero */}
      <div style={{ padding: "clamp(32px, 8vw, 56px) 0 clamp(24px, 5vw, 40px)" }}>
        <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 100, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: "0.75rem", fontWeight: 600, marginBottom: 16 }}>
          🚀 AI-Аудитор сайта
        </div>
        <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.4rem)", fontWeight: 800, color: "#fafafa", lineHeight: 1.12, marginBottom: 14, letterSpacing: "-0.03em" }}>
          Узнайте где ваш сайт<br />теряет клиентов
        </h1>
        <p style={{ fontSize: "clamp(0.9rem, 3vw, 1.05rem)", color: "#a1a1aa", lineHeight: 1.65, maxWidth: 520, marginBottom: 8 }}>
          Вставьте ссылку — AI просканирует сайт, сделает скриншот, определит CMS, найдёт SEO-ошибки, проверит скорость и безопасность.
        </p>
        <p style={{ fontSize: "0.8rem", color: "#52525b" }}>
          Поддерживаются: сайты, интернет-магазины, Ozon, Wildberries, Авито
        </p>
      </div>

      {/* Форма ввода */}
      <div style={{ marginBottom: 48 }}>
        <ArchitectInputForm />
      </div>

    </div>
  );
}
