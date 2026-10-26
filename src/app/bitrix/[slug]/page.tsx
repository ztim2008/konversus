import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail } from "lucide-react";

import { BITRIX_LICENSE, BITRIX_SOLUTIONS, BITRIX_SUPPORT, findBitrixSolution } from "@/lib/data/bitrix-solutions";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BITRIX_SOLUTIONS.map((solution) => ({ slug: solution.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const solution = findBitrixSolution((await params).slug);
  if (!solution) {
    return {};
  }
  return {
    title: `${solution.name}: ${solution.title} — модуль для 1С-Битрикс`,
    description: solution.summary,
    alternates: { canonical: `https://konversus.ru/bitrix/${solution.slug}` },
    openGraph: { images: [{ url: solution.banner, width: 1280, height: 720 }] },
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] py-12">
      <h2 className="text-xl font-semibold text-[var(--foreground)]">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function List({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`max-w-3xl space-y-3 pl-5 leading-relaxed text-[var(--muted)] ${ordered ? "list-decimal" : "list-disc"}`}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </Tag>
  );
}

export default async function BitrixSolutionPage({ params }: Props) {
  const solution = findBitrixSolution((await params).slug);
  if (!solution) {
    notFound();
  }

  const facts = [
    { label: "Версия", value: solution.version },
    { label: "Код модуля", value: solution.moduleId },
    { label: "Редакции", value: solution.editions },
    { label: "Требуется", value: solution.php },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-24 pt-12">
      <Link href="/bitrix" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
        Решения для 1С-Битрикс
      </Link>

      <header className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={solution.icon} alt="" width={56} height={56} className="rounded-lg" />
            <span className="font-mono text-[var(--muted)]">{solution.name}</span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">{solution.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">{solution.summary}</p>
        </div>

        <aside className="self-start rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <p className="text-2xl font-semibold text-[var(--foreground)]">{solution.price}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{solution.status}</p>
          <a
            href={`mailto:${BITRIX_SUPPORT.email}?subject=${encodeURIComponent(solution.name)}`}
            className="mt-6 flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] font-semibold text-[var(--background)] hover:bg-[var(--foreground)]"
          >
            <Mail size={16} />
            Написать в поддержку
          </a>
          <dl className="mt-6 space-y-3 border-t border-[var(--line)] pt-5 text-sm">
            {facts.map((fact) => (
              <div key={fact.label} className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">{fact.label}</dt>
                <dd className="text-right text-[var(--foreground)]">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </header>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={solution.banner} alt={`${solution.name}: ${solution.title}`} width={1280} height={720} className="mt-14 w-full rounded-lg border border-[var(--line)]" />

      <div className="mt-14">
        <Section title="Какие задачи решает">
          <List items={solution.tasks} />
        </Section>

        <Section title="Возможности">
          <List items={solution.features} />
        </Section>

        <Section title="Скриншоты">
          <div className="grid gap-8 sm:grid-cols-2">
            {solution.screenshots.map((shot) => (
              <figure key={shot.src}>
                <a href={shot.src} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.src} alt={shot.caption} width={1280} height={720} loading="lazy" className="w-full rounded-lg border border-[var(--line)]" />
                </a>
                <figcaption className="mt-3 text-sm text-[var(--muted)]">{shot.caption}</figcaption>
              </figure>
            ))}
          </div>
        </Section>

        <Section title="Требования">
          <List items={[...solution.requirements, `Модули Битрикса: ${solution.modules.join(", ")}.`]} />
        </Section>

        <Section title="Ограничения">
          <List items={solution.limitations} />
        </Section>

        <Section title="Установка и настройка">
          <List items={solution.install} ordered />
          <dl className="mt-10 grid max-w-3xl gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)]">
            {solution.settings.map((setting) => (
              <div key={setting.tab} className="grid gap-1 bg-[var(--background)] p-4 sm:grid-cols-[140px_1fr]">
                <dt className="font-semibold text-[var(--foreground)]">{setting.tab}</dt>
                <dd className="text-[var(--muted)]">{setting.text}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Компоненты">
          <dl className="max-w-3xl space-y-4">
            {solution.components.map((component) => (
              <div key={component.code} className="grid gap-1 sm:grid-cols-[260px_1fr]">
                <dt className="font-mono text-sm text-[var(--foreground)]">{component.code}</dt>
                <dd className="text-[var(--muted)]">{component.text}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 max-w-3xl text-[var(--muted)]">Параметры не обязательны: адреса и настройки компоненты берут из модуля.</p>
        </Section>

        <Section title="Удаление">
          <p className="max-w-3xl leading-relaxed text-[var(--muted)]">{solution.uninstall}</p>
        </Section>

        <Section title="Поддержка">
          <dl className="max-w-3xl space-y-3">
            <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
              <dt className="text-[var(--muted)]">Email</dt>
              <dd>
                <a href={`mailto:${BITRIX_SUPPORT.email}`} className="text-[var(--foreground)] hover:text-[var(--accent)]">{BITRIX_SUPPORT.email}</a>
              </dd>
            </div>
            <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
              <dt className="text-[var(--muted)]">Часы работы</dt>
              <dd className="text-[var(--foreground)]">{BITRIX_SUPPORT.hours}</dd>
            </div>
            <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
              <dt className="text-[var(--muted)]">Время ответа</dt>
              <dd className="text-[var(--foreground)]">{BITRIX_SUPPORT.response}</dd>
            </div>
          </dl>
          <p className="mt-6 max-w-3xl text-[var(--muted)]">В обращении укажите адрес сайта, версию модуля и шаги, которые привели к ошибке.</p>
        </Section>

        <Section title="Лицензия">
          <p className="max-w-3xl leading-relaxed text-[var(--muted)]">
            Правообладатель модуля {solution.name} — konversus.ru. {BITRIX_LICENSE}
          </p>
        </Section>
      </div>
    </div>
  );
}
