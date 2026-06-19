import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Алексей Тимофеев — 17 лет в digital | Konversus",
  description: "Создаю digital-проекты для бизнеса: сайты, AI-решения, дизайн. 17 лет опыта. Next.js, React, SEO, автоматизация.",
  openGraph: {
    title: "Алексей Тимофеев — digital-эксперт",
    description: "Сайты, AI, дизайн. 17 лет в digital. Проекты: Konversus, SSL Doctor, Leads AI.",
    images: [{ url: "https://konversus.ru/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg", width: 800, height: 800 }],
  },
};

const PHOTO = "https://konversus.ru/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg";

const SERVICES = [
  { icon: "🌐", title: "Разработка сайтов", desc: "Продающие лендинги, интернет-магазины, корпоративные сайты. Next.js, React, TypeScript, Tailwind.", price: "от 80 000 ₽", tags: ["Next.js", "React", "Tailwind"] },
  { icon: "🤖", title: "AI и автоматизация", desc: "Чат-боты, AI-аналитика, автоматизация процессов. OpenRouter, DeepSeek, GPT-4o, Telegram Bot API.", price: "от 50 000 ₽", tags: ["AI", "Боты", "OpenRouter"] },
  { icon: "🎨", title: "Дизайн и брендинг", desc: "Фирменный стиль, логотипы, упаковка, презентации, полиграфия. Figma, Photoshop.", price: "от 30 000 ₽", tags: ["Figma", "Бренд", "Логотип"] },
  { icon: "📈", title: "SEO и трафик", desc: "Поисковая оптимизация, аналитика, Яндекс Метрика, Вебмастер. Рост позиций и конверсии.", price: "от 25 000 ₽", tags: ["SEO", "Метрика", "Трафик"] },
  { icon: "🛡️", title: "SSL и безопасность", desc: "Проверка SSL, восстановление сертификатов, мониторинг безопасности сайта 24/7.", price: "от 5 000 ₽", tags: ["SSL", "HTTPS", "Защита"] },
  { icon: "🎯", title: "Лидогенерация", desc: "Автоматический сбор заявок с Profi.ru. AI-оценка, готовые отклики, уведомления в Telegram.", price: "от 15 000 ₽", tags: ["Profi", "AI", "Telegram"] },
];

const PRODUCTS = [
  { name: "Factory Proposal Builder", desc: "Конструктор digital-концептов для производств и B2B", url: "/" },
  { name: "SSL Doctor", desc: "Диагностика и восстановление SSL-сертификатов", url: "https://ssl.konversus.ru" },
  { name: "Leads AI", desc: "Автоматический поиск заказов с фриланс-площадок", url: "https://leads.konversus.ru" },
  { name: "AI Business Architect", desc: "AI-анализ сайта и стратегия роста бизнеса", url: "/architect" },
];

const PORTFOLIO = [
  { name: "Behance", url: "https://www.behance.net/timofeev_aleksey", desc: "Дизайн-портфолио" },
  { name: "Маркет-фон", url: "https://маркет-фон.рф/portfolio/", desc: "Работы и кейсы" },
  { name: "Kwork", url: "https://kwork.ru/user/bilarius", desc: "Фриланс-профиль" },
];

const PROJECTS = [
  { name: "Маркет-фон.рф", url: "https://маркет-фон.рф", desc: "Маркетинговая платформа" },
  { name: "Russait.ru", url: "https://russait.ru/", desc: "AI-проект" },
];

const SOCIAL = [
  { name: "Telegram", url: "https://t.me/bilarius", icon: "💬" },
  { name: "ВКонтакте", url: "https://vk.com/bilarius", icon: "📱" },
  { name: "Телефон", url: "tel:+79212013252", icon: "📞" },
];

export default function AboutPage() {
  return (
    <div style={{ background: "var(--bg-root)", color: "var(--ink-body)", fontFamily: "Inter, sans-serif" }}>
      {/* Hero */}
      <header style={{ padding: "100px 0 60px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>
          <img src={PHOTO} alt="Алексей Тимофеев" style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", marginBottom: 24, border: "3px solid var(--accent)" }} />
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, lineHeight: 1.1, marginBottom: 8, color: "#fff" }}>
            Тимофеев Алексей
          </h1>
          <p style={{ fontSize: "var(--text-lg)", color: "var(--accent)", marginBottom: 16, fontWeight: 600 }}>
            17 лет в digital
          </p>
          <p style={{ fontSize: "var(--text-base)", color: "#94a3b8", maxWidth: 550, margin: "0 auto 32px", lineHeight: 1.7 }}>
            Я создаю digital-проекты, которые приносят реальную выручку — не просто «красивые сайты»,
            а инструменты продаж. От вёрстки до комплексной цифровой упаковки бизнеса.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://t.me/bilarius" target="_blank" rel="noopener" style={{ padding: "12px 24px", borderRadius: 8, background: "var(--accent)", color: "#fff", fontWeight: 700, textDecoration: "none" }}>
              💬 Написать в Telegram
            </a>
            <a href="#services" style={{ padding: "12px 24px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600, textDecoration: "none" }}>
              Мои услуги ↓
            </a>
          </div>
        </div>
      </header>

      {/* Услуги */}
      <section id="services" style={{ padding: "80px 0" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ textAlign: "center", fontSize: "var(--text-2xl)", fontWeight: 700, marginBottom: 8, color: "#fff" }}>Что я делаю</h2>
          <p style={{ textAlign: "center", color: "#94a3b8", marginBottom: 48 }}>Услуги и цены</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 0, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
            {SERVICES.map((s, i) => (
              <div key={s.title} style={{ padding: "28px 24px", background: "#0f172a", borderRight: i % 2 === 0 && i < SERVICES.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", borderBottom: i < SERVICES.length - 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>{s.icon}</div>
                <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 650, marginBottom: 4, color: "#fff" }}>{s.title}</h3>
                <p style={{ fontSize: "var(--text-sm)", color: "#94a3b8", marginBottom: 12, lineHeight: 1.5 }}>{s.desc}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontWeight: 700, fontSize: "var(--text-base)", color: "var(--accent)" }}>{s.price}</p>
                  <div style={{ display: "flex", gap: 4 }}>
                    {s.tags.map(t => <span key={t} style={{ padding: "2px 8px", borderRadius: 100, background: "rgba(255,255,255,0.05)", fontSize: "0.65rem", color: "#64748b" }}>{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Продукты */}
      <section style={{ padding: "0 0 80px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ textAlign: "center", fontSize: "var(--text-2xl)", fontWeight: 700, marginBottom: 8, color: "#fff" }}>Мои продукты</h2>
          <p style={{ textAlign: "center", color: "#94a3b8", marginBottom: 48 }}>Собственные сервисы экосистемы Konversus</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 0, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
            {PRODUCTS.map((p, i) => (
              <a key={p.name} href={p.url} target={p.url.startsWith("http") ? "_blank" : undefined} rel="noopener" style={{ padding: "24px 20px", background: "#0f172a", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none", textDecoration: "none", display: "block" }}>
                <h3 style={{ fontSize: "var(--text-base)", fontWeight: 650, marginBottom: 4, color: "#fff" }}>{p.name}</h3>
                <p style={{ fontSize: "var(--text-sm)", color: "#94a3b8" }}>{p.desc}</p>
                <span style={{ display: "inline-block", marginTop: 8, fontSize: "var(--text-xs)", color: "var(--accent)", fontWeight: 600 }}>Открыть →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Портфолио и проекты */}
      <section style={{ padding: "0 0 60px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <div>
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: 650, marginBottom: 12, color: "#fff" }}>📂 Портфолио</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PORTFOLIO.map(p => (
                  <a key={p.name} href={p.url} target="_blank" rel="noopener" style={{ padding: "10px 14px", borderRadius: 8, background: "#0f172a", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", color: "#fff", fontSize: "var(--text-sm)" }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ display: "block", fontSize: "var(--text-xs)", color: "#64748b" }}>{p.desc}</span>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: 650, marginBottom: 12, color: "#fff" }}>🚀 Проекты</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PROJECTS.map(p => (
                  <a key={p.name} href={p.url} target="_blank" rel="noopener" style={{ padding: "10px 14px", borderRadius: 8, background: "#0f172a", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", color: "#fff", fontSize: "var(--text-sm)" }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ display: "block", fontSize: "var(--text-xs)", color: "#64748b" }}>{p.desc}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Цифры */}
      <section style={{ padding: "60px 0", background: "var(--bg-layer)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 32, textAlign: "center" }}>
            {[{ value: "17", label: "лет в digital" }, { value: "120+", label: "проектов" }, { value: "4", label: "продукта" }, { value: "24/7", label: "на связи" }].map(s => (
              <div key={s.label}>
                <p style={{ fontSize: "var(--text-3xl)", fontWeight: 800, color: "var(--accent)" }}>{s.value}</p>
                <p style={{ fontSize: "var(--text-sm)", color: "#94a3b8", marginTop: 4 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Стек */}
      <section style={{ padding: "80px 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, marginBottom: 40, color: "#fff" }}>Технологии</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {["Next.js", "React", "TypeScript", "Tailwind CSS", "PostgreSQL", "Prisma", "Redis", "Docker", "PM2", "Nginx", "OpenRouter", "DeepSeek", "GPT-4o", "Playwright", "Figma", "Photoshop", "Node.js", "Git", "BullMQ", "Let's Encrypt"].map(tech => (
              <span key={tech} style={{ padding: "8px 16px", borderRadius: 8, background: "#0f172a", border: "1px solid rgba(255,255,255,0.06)", fontSize: "var(--text-sm)", fontWeight: 500, color: "#94a3b8" }}>{tech}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Соцсети */}
      <section style={{ padding: "0 0 60px", textAlign: "center" }}>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {SOCIAL.map(s => (
            <a key={s.name} href={s.url} target="_blank" rel="noopener" style={{ padding: "12px 20px", borderRadius: 8, background: "#0f172a", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", color: "#fff", fontSize: "var(--text-sm)", fontWeight: 600 }}>
              {s.icon} {s.name}
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 0", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "#fff", marginBottom: 12 }}>Обсудим проект?</h2>
          <p style={{ fontSize: "var(--text-base)", color: "rgba(255,255,255,0.75)", marginBottom: 32 }}>
            Напишите мне лично — отвечаю в течение дня. Обсудим задачу, сроки и бюджет.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://t.me/bilarius" target="_blank" rel="noopener" style={{ padding: "14px 28px", borderRadius: 8, background: "#fff", color: "#4f46e5", fontWeight: 700, fontSize: "var(--text-base)", textDecoration: "none" }}>
              💬 @bilarius
            </a>
            <a href="tel:+79212013252" style={{ padding: "14px 28px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontWeight: 600, fontSize: "var(--text-base)", textDecoration: "none" }}>
              📞 Позвонить
            </a>
          </div>
        </div>
      </section>

      <footer style={{ padding: "32px 0", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: "var(--text-sm)", color: "#64748b" }}>© Алексей Тимофеев · <Link href="/" style={{ color: "var(--accent)" }}>Konversus</Link></p>
      </footer>
    </div>
  );
}
