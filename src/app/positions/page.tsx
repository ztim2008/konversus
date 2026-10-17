import type { Metadata } from "next";
import Link from "next/link";

import { createProjectAction } from "@/app/positions/actions";
import { requireCurrentAdmin } from "@/lib/auth/session";
import { getDailyCreditCap } from "@/lib/seo-positions/check";
import { creditsUsedSince, listProjects } from "@/lib/seo-positions/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SEO-позиции",
  robots: { index: false, follow: false },
};

const inputClass = "w-full rounded-md border border-[var(--line)] bg-[var(--background)] p-2";

export default async function SeoProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCurrentAdmin();
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const [projects, credits] = await Promise.all([listProjects(), creditsUsedSince(24)]);

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-24 text-sm text-[var(--foreground)] md:px-6">
      <Link href="/dashboard" className="text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Кабинет
      </Link>
      <h1 className="mt-1 text-2xl font-semibold">SEO-позиции</h1>
      <p className="mt-1 text-[var(--muted)]">
        Где сайт клиента в обычной выдаче Google по его запросам, по дням. Кредитов Serper за сутки:{" "}
        <span className="font-mono text-[var(--foreground)]">{credits}</span> из{" "}
        <span className="font-mono text-[var(--foreground)]">{getDailyCreditCap()}</span>.
      </p>

      {error && <p className="mt-4 rounded-md border border-[var(--accent-warm)] p-3 text-[var(--accent-warm)]">{error}</p>}

      <section className="mt-6 overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
              <th className="px-3 py-2 font-medium">Проект</th>
              <th className="px-3 py-2 font-medium">Домен</th>
              <th className="px-3 py-2 font-medium">Город</th>
              <th className="px-3 py-2 font-medium">Расписание</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-[var(--muted)]">
                  Проектов пока нет
                </td>
              </tr>
            )}
            {projects.map((p) => (
              <tr key={p.id} className="h-11 border-b border-[var(--line)] last:border-0">
                <td className="px-3">
                  <Link href={`/positions/${p.id}`} className="hover:text-[var(--accent)]">
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 font-mono">{p.domain}</td>
                <td className="px-3 text-[var(--muted)]">{p.location}</td>
                <td className="px-3 text-[var(--muted)]">{p.isActive ? "раз в сутки" : "пауза"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form action={createProjectAction} className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 md:grid-cols-2">
        <h2 className="font-medium md:col-span-2">Новый проект</h2>
        <label className="grid gap-1">
          <span className="text-[var(--muted)]">Домен сайта</span>
          <input name="domain" required className={inputClass} placeholder="master-kotlov.uz" />
        </label>
        <label className="grid gap-1">
          <span className="text-[var(--muted)]">Название</span>
          <input name="name" className={inputClass} placeholder="Мастер Котлов, Ташкент" />
        </label>
        <label className="grid gap-1">
          <span className="text-[var(--muted)]">Город для Google (как в Serper)</span>
          <input name="location" required defaultValue="Tashkent, Uzbekistan" className={inputClass} />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="grid gap-1">
            <span className="text-[var(--muted)]">Страна</span>
            <input name="gl" required defaultValue="uz" maxLength={2} className={`${inputClass} font-mono`} />
          </label>
          <label className="grid gap-1">
            <span className="text-[var(--muted)]">Язык</span>
            <input name="hl" required defaultValue="ru" maxLength={5} className={`${inputClass} font-mono`} />
          </label>
          <label className="grid gap-1">
            <span className="text-[var(--muted)]">Глубина</span>
            <select name="maxPages" defaultValue="5" className={inputClass}>
              <option value="3">топ-30</option>
              <option value="5">топ-50</option>
              <option value="10">топ-100</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1 md:col-span-2">
          <span className="text-[var(--muted)]">Запросы, по одному в строке</span>
          <textarea name="keywords" rows={5} className={inputClass} placeholder="ремонт котлов в Ташкенте" />
        </label>
        <p className="text-xs text-[var(--muted)] md:col-span-2">
          Глубина — сколько страниц выдачи листать, если сайт не нашёлся раньше. Каждая страница — 1 кредит Serper.
        </p>
        <div className="md:col-span-2">
          <button className="rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-[var(--background)]">Создать</button>
        </div>
      </form>
    </main>
  );
}
