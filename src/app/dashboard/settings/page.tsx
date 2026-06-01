import Link from "next/link";

import { requireCurrentAdmin } from "@/lib/auth/session";
import { getAllSettings } from "@/lib/data/settings";
import { saveSettingsAction } from "./actions";

export const metadata = {
  title: "Настройки сайта · konversus.ru",
};

function Field({
  name, label, hint, value, multiline = false, rows = 3, mono = false, placeholder,
}: {
  name: string; label: string; hint?: string; value: string;
  multiline?: boolean; rows?: number; mono?: boolean; placeholder?: string;
}) {
  const base =
    "w-full border border-[var(--builder-line)] bg-[var(--builder-bg)] px-3 py-2.5 text-sm text-[var(--builder-text)] placeholder:text-[var(--builder-muted)] focus:border-amber-300/40 focus:outline-none transition-colors resize-y";
  return (
    <div className="grid gap-1.5">
      <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--builder-muted)]">{label}</label>
      {multiline ? (
        <textarea name={name} defaultValue={value} rows={rows} placeholder={placeholder}
          className={`${base} ${mono ? "font-mono text-xs" : ""}`} />
      ) : (
        <input type="text" name={name} defaultValue={value} placeholder={placeholder}
          className={`${base} ${mono ? "font-mono text-xs" : ""}`} />
      )}
      {hint && <p className="text-[11px] text-[var(--builder-muted)] leading-5">{hint}</p>}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--builder-muted)]">{title}</div>
      <div className="h-px flex-1 bg-[var(--builder-line)]" />
    </div>
  );
}

export default async function SettingsPage() {
  await requireCurrentAdmin();
  const s = await getAllSettings();

  return (
    <div className="builder-shell flex min-h-screen flex-col">

      <header className="flex items-center justify-between border-b border-[var(--builder-line)] bg-[var(--builder-surface)] px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard"
            className="text-xs font-mono uppercase tracking-widest text-[var(--builder-muted)] transition-colors hover:text-[var(--builder-text)]">
            ← Кабинет
          </Link>
          <div className="h-4 w-px bg-[var(--builder-line)]" />
          <h1 className="text-sm font-semibold text-[var(--builder-text)]">Настройки сайта</h1>
        </div>
        <div className="text-xs font-mono text-[var(--builder-muted)]">konversus.ru</div>
      </header>

      <form action={saveSettingsAction} className="flex flex-1 flex-col">

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--builder-line)] bg-[var(--builder-surface)]/95 px-6 py-3 backdrop-blur-sm">
          <p className="text-xs text-[var(--builder-muted)]">Все изменения применяются на сайте сразу после сохранения</p>
          <button type="submit"
            className="bg-amber-400 px-6 py-2 text-xs font-mono font-semibold uppercase tracking-[0.18em] text-slate-950 transition-opacity hover:opacity-90">
            Сохранить всё
          </button>
        </div>

        <div className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-3xl space-y-10">

            {/* ── Hero ── */}
            <section>
              <SectionHeader title="Главная — Hero-блок" />
              <div className="space-y-4">
                <Field name="hero_badge" label="Бейдж доступности" value={s.hero_badge}
                  placeholder="Доступен для новых проектов" hint="Маленькая строка над заголовком" />
                <Field name="hero_title" label="Главный заголовок H1" value={s.hero_title}
                  multiline rows={3} hint="Крупный заголовок на первом экране" />
                <Field name="hero_subtitle" label="Подзаголовок (описание)" value={s.hero_subtitle}
                  multiline rows={4} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="hero_cta_primary" label="Кнопка 1 (золотая)" value={s.hero_cta_primary}
                    placeholder="Обсудить проект" />
                  <Field name="hero_cta_secondary" label="Кнопка 2 (контурная)" value={s.hero_cta_secondary}
                    placeholder="Как это работает" />
                </div>
              </div>
            </section>

            {/* ── О себе ── */}
            <section>
              <SectionHeader title="Главная — О себе" />
              <div className="space-y-4">
                <Field name="about_experience" label="Строка опыта (золотая)" value={s.about_experience}
                  placeholder="17 лет в digital" />
                <Field name="about_bio_1" label="Биография — первый абзац" value={s.about_bio_1}
                  multiline rows={5} />
                <Field name="about_bio_2" label="Биография — второй абзац" value={s.about_bio_2}
                  multiline rows={4} />
              </div>
            </section>

            {/* ── Контакты ── */}
            <section>
              <SectionHeader title="Контакты на главной" />
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="contact_phone" label="Телефон (отображение)" value={s.contact_phone}
                    placeholder="+7 921 201-32-52" />
                  <Field name="contact_phone_href" label="Телефон (href)" value={s.contact_phone_href}
                    placeholder="tel:+79212013252" mono />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="contact_telegram" label="Telegram (отображение)" value={s.contact_telegram}
                    placeholder="@bilarius" />
                  <Field name="contact_telegram_href" label="Telegram (ссылка)" value={s.contact_telegram_href}
                    placeholder="https://t.me/bilarius" mono />
                </div>
                <Field name="contact_max_href" label="Max.ru (ссылка)" value={s.contact_max_href}
                  mono placeholder="https://max.ru/join/..." />
                <Field name="contact_email" label="Email" value={s.contact_email}
                  placeholder="bilariuss@yandex.ru" />
              </div>
            </section>

            {/* ── SEO ── */}
            <section>
              <SectionHeader title="SEO и метаданные" />
              <div className="space-y-4">
                <Field name="seo_title" label="Title страницы" value={s.seo_title}
                  hint="Отображается в вкладке браузера и в поиске. Рекомендуется до 60 символов." />
                <Field name="seo_description" label="Meta Description" value={s.seo_description}
                  multiline rows={3} hint="Описание сниппета в поисковой выдаче. Рекомендуется 120–160 символов." />
                <Field name="seo_keywords" label="Keywords (через запятую)" value={s.seo_keywords}
                  multiline rows={3} hint="Ключевые фразы через запятую. Используются в meta keywords и OG." />
                <Field name="seo_og_image" label="OG Image URL" value={s.seo_og_image}
                  mono placeholder="https://konversus.ru/og-image.jpg"
                  hint="Картинка для превью в соцсетях и мессенджерах. Рекомендуется 1200×630px." />
              </div>
            </section>

            {/* ── Аналитика ── */}
            <section>
              <SectionHeader title="Аналитика и верификация" />
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="ym_id" label="Яндекс.Метрика ID" value={s.ym_id}
                    mono placeholder="109448101" hint="Только цифры. Счётчик работает на всех страницах." />
                  <Field name="ga_id" label="Google Analytics ID" value={s.ga_id}
                    mono placeholder="G-XXXXXXXXXX" hint="Оставьте пустым если GA не используется." />
                </div>
                <Field name="yw_verification" label="Яндекс.Вебмастер (verification key)" value={s.yw_verification}
                  mono placeholder="f9c5fd333ceeca7f"
                  hint="Код из <meta name='yandex-verification'>. Нужен для подтверждения сайта в Яндекс.Вебмастере." />
              </div>
            </section>

            {/* ── Вставка кода ── */}
            <section>
              <SectionHeader title="Вставка кода — сквозной по всем страницам" />
              <div className="mb-4 border border-amber-300/20 bg-amber-300/[0.04] p-4">
                <p className="text-xs leading-6 text-amber-200/80">
                  <strong className="text-amber-300">Что сюда вставлять:</strong> виджеты онлайн-чатов (Jivochat, CallTouch, Carrot Quest), пиксели ретаргетинга, VK Pixel, счётчики, любые сторонние скрипты.
                  Вставляйте полный код как есть — включая теги{" "}
                  <code className="text-amber-300/90">&lt;script&gt;...&lt;/script&gt;</code>.
                  Код выполняется на <strong className="text-amber-300">всех страницах</strong>, включая публичные лендинги.
                </p>
              </div>
              <Field
                name="body_scripts"
                label="Код для вставки в <body>"
                value={s.body_scripts}
                multiline rows={12} mono
                placeholder={`<!-- Пример: Jivochat -->\n<script src="//code.jivo.ru/widget/XXXXXX" async></script>\n\n<!-- Пример: VK Pixel -->\n<script>\n  !function(){var t=document.createElement("script");\n  ...\n}();\n</script>`}
                hint="Код применяется на всех страницах сайта после сохранения. Пустое поле — ничего не вставляется."
              />
            </section>

            {/* ── Статус интеграций ── */}
            <section>
              <SectionHeader title="Статус интеграций" />
              <div className="divide-y divide-[var(--builder-line)] border border-[var(--builder-line)]">
                {([
                  { label: "Яндекс.Метрика", value: s.ym_id || "—", ok: !!s.ym_id, url: `https://metrika.yandex.ru/dashboard?id=${s.ym_id}` },
                  { label: "Яндекс.Вебмастер", value: s.yw_verification || "—", ok: !!s.yw_verification, url: "https://webmaster.yandex.ru" },
                  { label: "Google Analytics", value: s.ga_id || "не подключён", ok: !!s.ga_id, url: "https://analytics.google.com" },
                  { label: "Кастомный код", value: s.body_scripts ? `${s.body_scripts.length} симв.` : "пусто", ok: !!s.body_scripts, url: null },
                  { label: "Sitemap", value: "/sitemap.xml", ok: true, url: "https://konversus.ru/sitemap.xml" },
                  { label: "Robots.txt", value: "/robots.txt", ok: true, url: "https://konversus.ru/robots.txt" },
                ] as const).map((i) => (
                  <div key={i.label} className="flex items-center gap-4 p-4">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${i.ok ? "bg-emerald-400/70" : "bg-slate-600"}`} />
                    <div className="w-40 shrink-0 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--builder-muted)]">{i.label}</div>
                    <div className="flex-1 font-mono text-xs text-[var(--builder-text)] break-all">{i.value}</div>
                    {i.url && (
                      <a href={i.url} target="_blank" rel="noreferrer"
                        className="shrink-0 border border-[var(--builder-line)] px-3 py-1.5 text-xs text-[var(--builder-muted)] transition-colors hover:border-amber-300/30 hover:text-amber-300">
                        ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <div className="flex justify-end pb-4">
              <button type="submit"
                className="bg-amber-400 px-8 py-3 text-xs font-mono font-semibold uppercase tracking-[0.2em] text-slate-950 transition-opacity hover:opacity-90">
                Сохранить все настройки
              </button>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}
