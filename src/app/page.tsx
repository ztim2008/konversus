import { readdirSync } from "node:fs";

import Link from "next/link";

import { getAllSettings } from "@/lib/data/settings";
import { PortfolioBlock } from "@/components/portfolio-block";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    num: "01",
    title: "Нахожу производство",
    desc: "Изучаю компанию, её продукт, конкурентов и текущий сайт. Понимаю, кто покупатель и что мешает сделке.",
  },
  {
    num: "02",
    title: "Анализирую визуал",
    desc: "Разбираю слабые места: устаревший дизайн, отсутствие доверия, плохую подачу товара. Показываю что именно теряет компания прямо сейчас.",
  },
  {
    num: "03",
    title: "Создаю визуал",
    desc: "Фирменный стиль, графика, обработка фото, элементы брендинга — всё под задачу первого касания с серьёзным клиентом.",
  },
  {
    num: "04",
    title: "Собираю концепт",
    desc: "Персональная презентация компании: не шаблон, а уникальный digital-образ товара и производства в целом.",
  },
  {
    num: "05",
    title: "Генерирую результат",
    desc: "Мини-сайт по компании, видео-аудит с разбором, PDF-презентация — готовый пакет для отправки директору завода или тендерного отдела.",
  },
];

const PORTFOLIO_DIR = "/var/www/www-root/data/www/konversus.ru/portfolio";

function getRandomPortfolioImages(count = 8): string[] {
  try {
    const files = readdirSync(PORTFOLIO_DIR).filter((f) =>
      /\.(jpg|jpeg|png|webp)$/i.test(f)
    );
    // Fisher-Yates shuffle
    for (let i = files.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [files[i], files[j]] = [files[j], files[i]];
    }
    return files.slice(0, count);
  } catch {
    return [];
  }
}

const RESULTS = [
  { icon: "◈", title: "Мини-сайт компании", desc: "Публичная страница с концептом, которую не стыдно отправить первым письмом" },
  { icon: "◉", title: "Видео-аудит", desc: "Запись с разбором сайта и предложением — создаёт доверие до первого звонка" },
  { icon: "◐", title: "PDF-презентация", desc: "Профессиональный документ для тендера, переговоров или цепочки согласований" },
];

export default async function Home() {
  const portfolioImages = getRandomPortfolioImages(8);
  const s = await getAllSettings();
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-20 pt-6 sm:px-8 lg:px-10">

      {/* ── Шапка ── */}
      <header className="sticky top-4 z-20 border border-white/10 bg-black/40 px-5 py-4 backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-amber-200/20 bg-[linear-gradient(135deg,rgba(246,196,123,0.25),rgba(152,209,255,0.14))] text-sm font-semibold tracking-[0.22em] text-slate-50">
              ТА
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
                Специалист по digital-упаковке
              </div>
              <div className="text-sm font-semibold text-slate-200">
                Тимофеев Алексей — персональные концепты для B2B
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-0 text-sm text-slate-300">
            <a className="border border-white/10 px-4 py-2.5 transition-colors hover:border-amber-200/30 hover:bg-white/5" href="#process">
              Как работаю
            </a>
            <a className="border border-white/10 px-4 py-2.5 transition-colors hover:border-amber-200/30 hover:bg-white/5" href="#contacts">
              Контакты
            </a>
            <Link className="border border-white/10 px-4 py-2.5 transition-colors hover:border-amber-200/30 hover:bg-white/5" href="/cases">
              Кейсы
            </Link>
            <Link className="bg-[linear-gradient(135deg,#f6c47b,#ffe0b2)] px-5 py-2.5 font-semibold text-slate-950 transition-opacity hover:opacity-90" href="/dashboard">
              Открыть кабинет
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="grid gap-0 pb-0 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:pt-12">
        <div className="border border-white/10 bg-white/[0.04] p-7 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10">
          <div className="inline-flex items-center gap-2 border border-amber-200/20 bg-amber-200/[0.08] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300/70" />
            {s.hero_badge}
          </div>
          <div className="mt-5 font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Тимофеев Алексей · Digital Packaging Specialist
          </div>
          <h1 className="mt-4 max-w-[14ch] text-[2.8rem] font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:text-[4rem] lg:text-[5rem]">
            {s.hero_title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">
            {s.hero_subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-0">
            <a
              className="bg-[linear-gradient(135deg,#f6c47b,#ffe0b2)] px-7 py-3.5 text-sm font-bold text-slate-950 transition-opacity hover:opacity-90"
              href="#contacts"
            >
              {s.hero_cta_primary}
            </a>
            <a
              className="border border-white/10 px-7 py-3.5 text-sm font-semibold text-slate-100 transition-colors hover:border-amber-200/30 hover:bg-white/5"
              href="#process"
            >
              {s.hero_cta_secondary}
            </a>
          </div>

          <div className="mt-10 grid gap-0 sm:grid-cols-3">
            {[
              { v: "1 рабочий день", l: "от аудита до готового концепта" },
              { v: "Уникальный образ", l: "не шаблон — персональная упаковка компании" },
              { v: "B2B фокус", l: "производства, инженерия, промышленность" },
            ].map((s) => (
              <div key={s.l} className="border border-white/10 bg-black/20 p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-600">результат</div>
                <div className="mt-3 text-xl font-bold text-white leading-tight">{s.v}</div>
                <div className="mt-2 text-sm leading-6 text-slate-400">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Правая колонка — что получает клиент */}
        <div className="flex flex-col gap-0">
          <div className="border border-white/10 bg-[linear-gradient(160deg,rgba(152,209,255,0.06),rgba(246,196,123,0.04))] p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
              Что получает клиент
            </div>
            <div className="mt-4 text-2xl font-bold text-white leading-tight">
              Не сайт-визитку.<br />Не шаблонную презентацию.
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Уникальное цифровое оформление вашего товара и компании — персональная страница, которую отправляют вместо каталога. Создаёт доверие до первого звонка.
            </p>
            <div className="mt-6 grid gap-0">
              {RESULTS.map((r) => (
                <div key={r.title} className="flex gap-4 border-b border-white/[0.06] py-4 last:border-b-0">
                  <div className="shrink-0 text-amber-300/70 text-xl leading-none pt-0.5">{r.icon}</div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{r.title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-400">{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/10 bg-black/20 p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
              Для кого это
            </div>
            <div className="mt-4 text-sm leading-7 text-slate-300">
              Производственные компании, промышленные предприятия, b2b-поставщики — все, кому нужно выглядеть убедительно на тендере, в переписке или при первом касании с крупным заказчиком.
            </div>
            <div className="mt-5 grid grid-cols-2 gap-0 text-xs text-slate-400">
              {["Производства","Машиностроение","Стройматериалы","Промышленность","Поставщики","Дистрибьюторы"].map(t => (
                <div key={t} className="border border-white/[0.06] px-3 py-2 text-slate-400">{t}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Architect Widget ── */}
      <section className="mt-0 border border-white/10 bg-black/20">
        <div className="grid gap-0 lg:grid-cols-[1fr_1.1fr]">
          <div className="border-b border-white/10 p-7 sm:p-10 lg:border-b-0 lg:border-r">
            <div className="inline-flex items-center gap-2 border border-amber-200/20 bg-amber-200/[0.08] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300/70" />
              AI Бесплатный сервис
            </div>
            <h2 className="mt-5 text-2xl font-bold leading-tight tracking-[-0.03em] text-white sm:text-3xl">
              Карта роста<br />вашего бизнеса
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
              Вставьте ссылку на сайт, Авито, Ozon или Wildberries — за 30 секунд получите AI-анализ: где теряете клиентов, что мешает продажам и конкретный план роста.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-0">
              {[
                { icon: "📍", title: "Карта потерь", desc: "Где теряет деньги прямо сейчас" },
                { icon: "🚀", title: "План роста", desc: "Конкретные шаги с эффектом" },
                { icon: "🔍", title: "SEO-аудит", desc: "18 проверок за секунды" },
              ].map((b) => (
                <div key={b.title} className="border border-white/[0.06] bg-black/20 p-4">
                  <div className="text-xl">{b.icon}</div>
                  <div className="mt-2 text-xs font-semibold text-slate-100">{b.title}</div>
                  <div className="mt-1 text-[11px] leading-4 text-slate-500">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center p-7 sm:p-10">
            <div id="architect-widget-home" style={{ width: "100%", maxWidth: "520px" }} />
            <script
              dangerouslySetInnerHTML={{
                __html: `(function(){
  var el=document.getElementById('architect-widget-home');
  if(!el||el.dataset.kwInit)return;
  el.dataset.kwInit='1';
  var s=document.createElement('script');
  s.src='https://konversus.ru/architect-widget.js';
  s.setAttribute('data-theme','dark');
  s.setAttribute('data-container','architect-widget-home');
  document.head.appendChild(s);
})();`,
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Знакомство ── */}
      <section className="mt-0 grid gap-0 border border-white/10 lg:grid-cols-[300px_1fr]">
        <div className="relative overflow-hidden border-r border-white/10">
          <img
            src="https://konversus.ru/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg"
            alt="Тимофеев Алексей — UX/UI-дизайнер и web-разработчик"
            className="h-full w-full object-cover object-top"
            style={{ minHeight: "280px" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_70%,rgba(8,16,24,0.6))]" />
        </div>
        <div className="flex flex-col justify-center p-8 sm:p-10">
          <div className="inline-flex items-center gap-2 self-start border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">
            UX/UI-дизайнер · Web-разработчик
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl">
            Алексей Тимофеев
          </h2>
          <div className="mt-1 font-mono text-xs uppercase tracking-[0.22em] text-amber-300/60">
            {s.about_experience}
          </div>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
            {s.about_bio_1}
          </p>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
            {s.about_bio_2}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#contacts"
              className="border border-amber-300/20 bg-amber-300/[0.06] px-5 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-300/10"
            >
              Обсудить проект
            </a>
            <a
              href="#process"
              className="border border-white/10 px-5 py-2.5 text-sm text-slate-300 transition-colors hover:border-white/20 hover:text-white"
            >
              Как работаю →
            <a
              href="/about"
              className="border border-white/10 px-5 py-2.5 text-sm text-slate-300 transition-colors hover:border-white/20 hover:text-white"
            >
              Подробнее обо мне →
            </a>
            </a>
          </div>
        </div>
      </section>

      {/* ── Процесс ── */}
      <section className="mt-0 border border-white/10 bg-black/20 p-7 sm:p-10" id="process">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
          Как работаю — 5 шагов
        </div>
        <div className="mt-2 text-2xl font-bold text-white">
          От анализа до готового пакета за 1 рабочий день
        </div>
        <div className="mt-8 grid gap-0 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <div key={s.num} className="border border-white/[0.08] bg-black/20 p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber-300/60">{s.num}</div>
              <div className="mt-3 text-sm font-bold text-slate-100 leading-tight">{s.title}</div>
              <div className="mt-2 text-xs leading-5 text-slate-400">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Контакты ── */}
      <section className="mt-0 border border-white/10 bg-black/20 p-7 sm:p-10" id="contacts">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
          Контакты
        </div>
        <div className="mt-2 text-2xl font-bold text-white">
          Обсудим ваш проект
        </div>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
          Пишите в любой мессенджер или звоните. Расскажу что именно можно сделать с вашим производством — бесплатный короткий разбор в любом формате.
        </p>
        <div className="mt-8 grid gap-0 sm:grid-cols-3">
          <a
            href={s.contact_phone_href}
            className="group border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-amber-200/30 hover:bg-white/5"
          >
            <div className="text-xs font-mono uppercase tracking-[0.22em] text-slate-500">Телефон</div>
            <div className="mt-3 text-xl font-bold text-white">{s.contact_phone}</div>
            <div className="mt-2 text-xs text-slate-500">Позвонить или написать SMS</div>
          </a>
          <a
            href={s.contact_telegram_href}
            target="_blank"
            rel="noreferrer"
            className="group border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[#2aabee]/40 hover:bg-white/5"
          >
            <div className="text-xs font-mono uppercase tracking-[0.22em] text-slate-500">Telegram</div>
            <div className="mt-3 text-xl font-bold text-white">{s.contact_telegram}</div>
            <div className="mt-2 text-xs text-slate-500">Быстрее всего отвечу здесь</div>
          </a>
          <a
            href={s.contact_max_href}
            target="_blank"
            rel="noreferrer"
            className="group border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[#4a7ff7]/40 hover:bg-white/5"
          >
            <div className="text-xs font-mono uppercase tracking-[0.22em] text-slate-500">Max.ru (ВКонтакте)</div>
            <div className="mt-3 text-xl font-bold text-white">Написать в Max</div>
            <div className="mt-2 text-xs text-slate-500">Альтернативный мессенджер</div>
          </a>
        </div>
        <div className="mt-0 border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="text-xs font-mono uppercase tracking-[0.22em] text-slate-500">Email</div>
          <a className="mt-2 block text-base font-semibold text-slate-200 transition-colors hover:text-amber-200" href={`mailto:${s.contact_email}`}>
            {s.contact_email}
          </a>
        </div>
      </section>



      {/* ── Портфолио ── */}
      <PortfolioBlock initialImages={portfolioImages} />

      
      {/* ── Konversus Leads AI ── */}
      <section style={{
        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        padding: "80px 0", marginTop: 0,
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.15)", color: "#fff",
            borderRadius: 8, padding: "6px 16px",
            fontSize: "0.8rem", fontWeight: 600, marginBottom: 24,
          }}>
            🆕 Новый сервис
          </div>
          <h2 style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800,
            color: "#fff", lineHeight: 1.1, marginBottom: 16,
          }}>
            Автоматический поиск заказов
          </h2>
          <p style={{
            fontSize: "1.1rem", color: "rgba(255,255,255,0.75)",
            maxWidth: 600, margin: "0 auto 36px", lineHeight: 1.6,
          }}>
            Konversus Leads AI мониторит Profi.ru и другие площадки,
            анализирует заявки через ИИ, пишет отклики и присылает
            лучшие в Telegram. Больше не нужно сидеть и обновлять страницу.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://leads.konversus.ru" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#fff", color: "#4f46e5",
              borderRadius: 8, padding: "14px 28px",
              fontWeight: 700, fontSize: "1rem", textDecoration: "none",
              transition: "transform 0.15s",
            }}>
              Попробовать бесплатно →
            </a>
            <a href="https://leads.konversus.ru/docs" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.1)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8, padding: "14px 28px",
              fontWeight: 600, fontSize: "1rem", textDecoration: "none",
            }}>
              Документация
            </a>
          </div>
          <div style={{ display: "flex", gap: 32, justifyContent: "center", marginTop: 40, flexWrap: "wrap" }}>
            {[
              { num: "🧠", label: "AI-анализ заявок" },
              { num: "📝", label: "Готовые отклики" },
              { num: "📱", label: "Уведомления в Telegram" },
              { num: "⚡", label: "Проверка каждые 1-15 мин" },
            ].map(f => (
              <div key={f.label} style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", fontWeight: 500 }}>
                <span style={{ fontSize: "1.3rem", marginRight: 6 }}>{f.num}</span>
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      
      {/* ── Экосистема Konversus ── */}
      <section style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        padding: "60px 0", marginTop: 0,
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: "clamp(1.5rem, 3vw, 2.5rem)", fontWeight: 800,
            color: "#fff", textAlign: "center", marginBottom: 8,
          }}>
            Экосистема Konversus
          </h2>
          <p style={{
            textAlign: "center", color: "rgba(255,255,255,0.5)",
            fontSize: "1rem", marginBottom: 40,
          }}>
            Три сервиса для роста вашего бизнеса
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            <a href="https://ssl.konversus.ru" target="_blank" rel="noopener" style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: "28px 24px", textDecoration: "none", display: "block",
              transition: "border-color 0.15s",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>🛡️</div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: 6 }}>SSL Doctor</h3>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                Проверка безопасности сайта за 3 секунды. Узнайте всё о SSL, HTTPS и DNS вашего домена.
              </p>
              <span style={{ display: "inline-block", marginTop: 12, color: "#10b981", fontWeight: 600, fontSize: "0.85rem" }}>ssl.konversus.ru →</span>
            </a>
            <a href="https://leads.konversus.ru" target="_blank" rel="noopener" style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: "28px 24px", textDecoration: "none", display: "block",
              transition: "border-color 0.15s",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>🎯</div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: 6 }}>Leads AI</h3>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                Автоматический поиск заказов с Profi.ru. AI-анализ, готовые отклики, уведомления в Telegram.
              </p>
              <span style={{ display: "inline-block", marginTop: 12, color: "#6366f1", fontWeight: 600, fontSize: "0.85rem" }}>leads.konversus.ru →</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-0 border border-white/[0.06] px-7 py-5 text-center">
        <div className="text-xs font-mono uppercase tracking-[0.22em] text-slate-600">
          © 2026 Тимофеев Алексей · konversus.ru · Цифровая упаковка для производственных компаний
        </div>
      </footer>

    </div>
  );
}
