import { readdirSync } from "node:fs";
import Link from "next/link";
import type { Metadata } from "next";
import { Globe, Briefcase, Code, Palette, Shield, TrendingUp, MessageCircle, Phone, ExternalLink, ChevronRight, ChevronLeft, X, ArrowRight, Layers, Sparkles, Zap, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Алексей Тимофеев — 17 лет в digital | Сайты, AI, дизайн",
  description: "Создаю digital-проекты для бизнеса: сайты, AI-решения, дизайн, SEO. 17 лет опыта. Next.js, React, TypeScript, Tailwind, OpenRouter, DeepSeek.",
  keywords: ["Алексей Тимофеев", "веб-разработчик", "дизайнер", "AI-специалист", "Konversus", "создание сайтов", "Next.js", "React", "SEO"],
  openGraph: {
    title: "Алексей Тимофеев — digital-эксперт",
    description: "Сайты, AI, дизайн. 17 лет в digital. Проекты: Konversus, SSL Doctor, Leads AI.",
    images: [{ url: "https://konversus.ru/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg", width: 800, height: 800 }],
    type: "profile",
    locale: "ru_RU",
  },
  twitter: { card: "summary_large_image", title: "Алексей Тимофеев — digital-эксперт", description: "Сайты, AI, дизайн. 17 лет опыта." },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://konversus.ru/about" },
};

const PHOTO = "/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg";
const PORTFOLIO_DIR = "/var/www/www-root/data/www/konversus.ru/portfolio";

function getPortfolioImages(count = 12): string[] {
  try {
    const files = readdirSync(PORTFOLIO_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    for (let i = files.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [files[i], files[j]] = [files[j], files[i]]; }
    return files.slice(0, count);
  } catch { return []; }
}

export default function AboutPage() {
  const portfolioImages = getPortfolioImages(12);

  return (
    <div className="min-h-screen bg-[#0a0e13] text-gray-300">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent" />
        <div className="relative mx-auto max-w-4xl px-6 py-24 sm:py-32 text-center">
          <img src={PHOTO} alt="Алексей Тимофеев" className="w-28 h-28 rounded-full object-cover mx-auto mb-6 ring-2 ring-indigo-500/30" />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">Тимофеев Алексей</h1>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 text-sm font-semibold text-indigo-400">
            <Zap size={14} /> 17 лет в digital
          </div>
          <p className="mt-6 text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            Я создаю digital-проекты, которые приносят реальную выручку — не просто «красивые сайты», а инструменты продаж. От вёрстки до комплексной цифровой упаковки бизнеса.
          </p>
          <div className="mt-8 flex gap-4 justify-center flex-wrap">
            <a href="https://t.me/bilarius" target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
              <MessageCircle size={18} /> Написать в Telegram
            </a>
            <a href="tel:+79212013252" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-gray-300 hover:border-white/20 transition-colors">
              <Phone size={18} /> Позвонить
            </a>
          </div>
        </div>
      </header>

      {/* Цифры */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-white/[0.06]">
            {[{ value: "17", label: "лет в digital" }, { value: "120+", label: "проектов" }, { value: "4", label: "собственных продукта" }, { value: "24/7", label: "на связи" }].map((s, i) => (
              <div key={s.label} className="text-center px-4 py-6">
                <p className="text-3xl sm:text-4xl font-extrabold text-indigo-400">{s.value}</p>
                <p className="mt-2 text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Услуги */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="mb-12">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">Услуги</p>
            <h2 className="text-3xl font-bold text-white">Что я делаю</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-white/[0.06] rounded-xl overflow-hidden">
            {[
              { icon: Globe, title: "Разработка сайтов", desc: "Продающие лендинги, интернет-магазины, корпоративные сайты. Next.js, React, TypeScript.", price: "от 80 000 ₽" },
              { icon: Sparkles, title: "AI и автоматизация", desc: "Чат-боты, AI-аналитика, автопилот для бизнеса. OpenRouter, DeepSeek, GPT-4o.", price: "от 50 000 ₽" },
              { icon: Palette, title: "Дизайн и брендинг", desc: "Фирменный стиль, логотипы, упаковка, полиграфия. Figma, Photoshop.", price: "от 30 000 ₽" },
              { icon: TrendingUp, title: "SEO и трафик", desc: "Поисковая оптимизация, аналитика, Яндекс Метрика, Вебмастер.", price: "от 25 000 ₽" },
              { icon: Shield, title: "SSL и безопасность", desc: "Проверка SSL, восстановление сертификатов, мониторинг 24/7.", price: "от 5 000 ₽" },
              { icon: Code, title: "Лидогенерация", desc: "Автоматический сбор заявок с Profi.ru. AI-оценка, готовые отклики.", price: "от 15 000 ₽" },
            ].map((s, i) => (
              <div key={s.title} className={`p-8 bg-[#0f172a] ${i % 2 === 0 ? "sm:border-r" : ""} ${i < 4 ? "border-b" : ""} border-white/[0.06]`}>
                <s.icon size={28} className="text-indigo-400 mb-4" strokeWidth={1.5} />
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{s.desc}</p>
                <p className="text-base font-bold text-indigo-400">{s.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Портфолио */}
      {portfolioImages.length > 0 && (
        <section className="border-b border-white/[0.06]">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <div className="mb-12">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">Портфолио</p>
              <h2 className="text-3xl font-bold text-white">Избранные работы</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 border border-white/[0.06] rounded-xl overflow-hidden">
              {portfolioImages.map((img, i) => (
                <a key={img} href={`/portfolio/${img}`} target="_blank" className="block border-white/[0.06] [&:not(:nth-child(3n))]:border-r [&:not(:nth-last-child(-n+3))]:border-b">
                  <img src={`/portfolio/${img}`} alt={`Работа ${i + 1}`} className="w-full h-48 object-cover hover:opacity-80 transition-opacity" loading="lazy" />
                </a>
              ))}
            </div>
            <div className="mt-6 text-center">
              <a href="https://www.behance.net/timofeev_aleksey" target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                <ExternalLink size={14} /> Больше работ на Behance
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Продукты */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="mb-12">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">Продукты</p>
            <h2 className="text-3xl font-bold text-white">Экосистема Konversus</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-white/[0.06] rounded-xl overflow-hidden">
            {[
              { name: "Factory Proposal Builder", desc: "Конструктор digital-концептов для производств и B2B", url: "/" },
              { name: "SSL Doctor", desc: "Диагностика и восстановление SSL-сертификатов", url: "https://ssl.konversus.ru" },
              { name: "Leads AI", desc: "Автоматический поиск заказов с фриланс-площадок", url: "https://leads.konversus.ru" },
              { name: "AI Architect", desc: "AI-анализ сайта и стратегия роста бизнеса", url: "/architect" },
            ].map((p, i) => (
              <a key={p.name} href={p.url} target={p.url.startsWith("http") ? "_blank" : undefined} rel="noopener" className={`p-6 bg-[#0f172a] hover:bg-[#111820] transition-colors group ${i % 2 === 0 ? "sm:border-r" : ""} ${i < 2 ? "border-b" : ""} border-white/[0.06]`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{p.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{p.desc}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Ссылки */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="p-6 border-b sm:border-b-0 sm:border-r border-white/[0.06]">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Briefcase size={16} className="text-indigo-400" /> Портфолио</h3>
              <div className="space-y-2">
                {[{ name: "Behance", url: "https://www.behance.net/timofeev_aleksey" }, { name: "Маркет-фон", url: "https://маркет-фон.рф/portfolio/" }, { name: "Kwork", url: "https://kwork.ru/user/bilarius" }].map(l => (
                  <a key={l.name} href={l.url} target="_blank" rel="noopener" className="block text-sm text-gray-400 hover:text-indigo-400 transition-colors">{l.name} →</a>
                ))}
              </div>
            </div>
            <div className="p-6 border-b sm:border-b-0 sm:border-r border-white/[0.06]">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Globe size={16} className="text-indigo-400" /> Проекты</h3>
              <div className="space-y-2">
                {[{ name: "Маркет-фон.рф", url: "https://маркет-фон.рф" }, { name: "Russait.ru", url: "https://russait.ru/" }, { name: "Nordic Builder", url: "https://nordic-builder.ru" }].map(l => (
                  <a key={l.name} href={l.url} target="_blank" rel="noopener" className="block text-sm text-gray-400 hover:text-indigo-400 transition-colors">{l.name} →</a>
                ))}
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Users size={16} className="text-indigo-400" /> Соцсети</h3>
              <div className="space-y-2">
                {[{ name: "Telegram", url: "https://t.me/bilarius" }, { name: "ВКонтакте", url: "https://vk.com/bilarius" }, { name: "YouTube", url: "https://vkvideo.ru/@bilarius" }].map(l => (
                  <a key={l.name} href={l.url} target="_blank" rel="noopener" className="block text-sm text-gray-400 hover:text-indigo-400 transition-colors">{l.name} →</a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Технологии */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-10">Технологический стек</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {["Next.js", "React", "TypeScript", "Tailwind", "PostgreSQL", "Prisma", "Redis", "Docker", "PM2", "Nginx", "OpenRouter", "DeepSeek", "GPT-4o", "Playwright", "Figma", "Node.js", "Git", "BullMQ", "Let's Encrypt", "Stripe"].map(tech => (
              <span key={tech} className="px-4 py-2 rounded-lg bg-[#0f172a] border border-white/[0.06] text-sm text-gray-400">{tech}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700" />
        <div className="relative mx-auto max-w-2xl px-6 py-24 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">Обсудим проект?</h2>
          <p className="text-indigo-100/80 mb-8">Напишите мне лично — отвечаю в течение дня. Обсудим задачу, сроки и бюджет.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="https://t.me/bilarius" target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-600 hover:bg-gray-100 transition-colors">
              <MessageCircle size={18} /> @bilarius
            </a>
            <a href="tel:+79212013252" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:border-white/40 transition-colors">
              <Phone size={18} /> Позвонить
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-8 text-center">
        <p className="text-sm text-gray-600">© Алексей Тимофеев · <Link href="/" className="text-indigo-400 hover:text-indigo-300">Konversus</Link></p>
      </footer>
    </div>
  );
}
