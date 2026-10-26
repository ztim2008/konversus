import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BITRIX_LICENSE, BITRIX_SOLUTIONS, BITRIX_SUPPORT } from "@/lib/data/bitrix-solutions";

export const metadata: Metadata = {
  title: "Решения для 1С-Битрикс",
  description: "Модули и компоненты для 1С-Битрикс от konversus.ru: описание, установка, поддержка и лицензия.",
  alternates: { canonical: "https://konversus.ru/bitrix" },
};

export default function BitrixCatalogPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-24 pt-16">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">Решения для 1С-Битрикс</h1>
        <p className="mt-5 text-lg leading-relaxed text-[var(--muted)]">
          Модули и компоненты konversus.ru. Каждое решение сначала работает на живом магазине, потом выходит отдельным модулем с установщиком.
        </p>
      </header>

      <dl className="mt-12 grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
        <div className="bg-[var(--background)] p-5">
          <dt className="text-sm text-[var(--muted)]">Разработчик</dt>
          <dd className="mt-1 text-[var(--foreground)]">konversus.ru</dd>
        </div>
        <div className="bg-[var(--background)] p-5">
          <dt className="text-sm text-[var(--muted)]">Поддержка</dt>
          <dd className="mt-1 text-[var(--foreground)]">
            <a href={`mailto:${BITRIX_SUPPORT.email}`} className="hover:text-[var(--accent)]">{BITRIX_SUPPORT.email}</a>
            <span className="block text-sm text-[var(--muted)]">{BITRIX_SUPPORT.hours}, ответ {BITRIX_SUPPORT.response}</span>
          </dd>
        </div>
        <div className="bg-[var(--background)] p-5">
          <dt className="text-sm text-[var(--muted)]">Лицензия</dt>
          <dd className="mt-1 text-[var(--foreground)]">Одна лицензия — один сайт</dd>
        </div>
      </dl>

      <section className="mt-16">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Модули</h2>
        <ul className="mt-6 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {BITRIX_SOLUTIONS.map((solution) => (
            <li key={solution.slug}>
              <Link href={`/bitrix/${solution.slug}`} className="group grid gap-5 py-7 sm:grid-cols-[72px_1fr_auto] sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={solution.icon} alt="" width={72} height={72} className="rounded-lg" />
                <div>
                  <p className="text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">{solution.title}</p>
                  <p className="mt-1 max-w-xl text-[var(--muted)]">{solution.summary}</p>
                  <p className="mt-3 font-mono text-sm text-[var(--muted)]">
                    {solution.moduleId} · {solution.version} · {solution.php}
                  </p>
                </div>
                <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                  <span className="font-semibold text-[var(--foreground)]">{solution.price}</span>
                  <span className="text-sm text-[var(--muted)]">{solution.status}</span>
                  <ArrowRight size={18} className="text-[var(--muted)] group-hover:text-[var(--accent)]" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-16 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{BITRIX_LICENSE}</p>
    </div>
  );
}
