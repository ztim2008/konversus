import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BITRIX_SOLUTIONS } from "@/lib/data/bitrix-solutions";

export function BitrixSolutionsBlock() {
  return (
    <section id="bitrix-solutions" className="my-20 scroll-mt-24 border-t border-[var(--line)] pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Решения для 1С-Битрикс</h2>
          <p className="mt-3 max-w-xl text-[var(--muted)]">Модули с установщиком для интернет-магазинов: проверены на живых проектах.</p>
        </div>
        <Link href="/bitrix" className="inline-flex items-center gap-2 font-semibold text-[var(--accent)] hover:text-[var(--foreground)]">
          Все решения
          <ArrowRight size={16} />
        </Link>
      </div>

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {BITRIX_SOLUTIONS.map((solution) => (
          <li key={solution.slug}>
            <Link
              href={`/bitrix/${solution.slug}`}
              className="group flex h-full gap-5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 hover:border-[var(--accent)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={solution.icon} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-lg" />
              <div className="min-w-0">
                <p className="font-semibold text-[var(--foreground)]">{solution.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{solution.summary}</p>
                <p className="mt-4 text-sm text-[var(--foreground)]">
                  {solution.price}
                  <span className="text-[var(--muted)]"> · {solution.status}</span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
