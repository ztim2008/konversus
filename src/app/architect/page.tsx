import type { Metadata } from "next";
import { AuditorForm } from "@/components/architect/auditor-form";

export const metadata: Metadata = {
  title: "AI-Аудитор сайта — Konversus",
  description: "Бесплатный AI-аудит сайта за 3 секунды. Найдём где вы теряете клиентов и сколько стоит исправить. SEO, скорость, SSL, мобильность.",
  keywords: ["аудит сайта", "ai аудит", "проверка сайта", "seo аудит", "скорость сайта", "ssl проверка", "конверсия сайта"],
  robots: { index: true, follow: true },
};

export default function ArchitectPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 80px" }}>
      
      {/* Hero */}
      <div style={{ padding: "48px 0 32px" }}>
        <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 100, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: "0.75rem", fontWeight: 600, marginBottom: 16 }}>
          🚀 AI-Аудитор сайта
        </div>
        <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", fontWeight: 800, color: "#fafafa", lineHeight: 1.15, marginBottom: 12, letterSpacing: "-0.03em" }}>
          Узнайте где ваш сайт теряет клиентов
        </h1>
        <p style={{ fontSize: "clamp(0.9rem, 3vw, 1.05rem)", color: "#a1a1aa", lineHeight: 1.6, maxWidth: 560 }}>
          Бесплатный AI-аудит за 3 секунды. SEO, скорость, безопасность, мобильность. С ценами исправления.
        </p>
      </div>

      {/* Форма ввода + результаты */}
      <AuditorForm />

      {/* Контакты */}
      <div style={{ marginTop: 48, padding: "28px 24px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fafafa", marginBottom: 6 }}>Исполнитель</h2>
        <p style={{ fontSize: "0.9rem", color: "#a1a1aa", lineHeight: 1.7, marginBottom: 16 }}>
          Тимофеев Алексей — 17 лет в digital. Нахожу и исправляю проблемы сайтов которые стоят бизнесу денег.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.9rem" }}>
          <a href="https://t.me/bilarius" target="_blank" style={{ color: "#3b82f6", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            ✈ Telegram: @bilarius
          </a>
          <a href="mailto:bilariuss@yandex.ru" style={{ color: "#a1a1aa", textDecoration: "none" }}>
            📧 bilariuss@yandex.ru
          </a>
          <a href="tel:+79212013252" style={{ color: "#a1a1aa", textDecoration: "none" }}>
            📱 +7 921 201-32-52
          </a>
        </div>
      </div>

    </main>
  );
}
