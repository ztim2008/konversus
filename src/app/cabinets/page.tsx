import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, LineChart, type LucideIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Кабинеты — Konversus",
  description: "Входы в рабочие кабинеты Konversus: админка проекта и SEO-позиции.",
  robots: { index: false, follow: false },
};

type Cabinet = {
  title: string;
  description: string;
  sections: string[];
  /** Кто входит и с каким логином. */
  access: string;
  loginHref: string;
  icon: LucideIcon;
};

// Новый кабинет — новый объект в списке. Первый — главный, он крупнее.
const CABINETS: Cabinet[] = [
  {
    title: "Админка Konversus",
    description: "Главный кабинет проекта: лиды, коммерческие предложения, Лид-радар lead-web.pro, отзывы и настройки.",
    sections: ["Лид-радар", "Лиды", "Архитектор сайта", "Отзывы", "Настройки"],
    access: "Логин и пароль администратора.",
    loginHref: "/auth",
    icon: LayoutDashboard,
  },
  {
    title: "SEO-позиции",
    description:
      "Рост позиций сайта клиента в обычной выдаче Google: места по запросам по дням, кто поднялся и кто упал, отчёт за месяц для клиента, чек-лист сайта, техника сайта и реклама.",
    sections: ["Проекты и запросы", "График позиций", "Отчёт за месяц", "Чек-лист сайта", "Реклама"],
    access: "Маркетологи — по своему логину. Администратор входит через админку, отдельный пароль не нужен.",
    loginHref: "/positions/login",
    icon: LineChart,
  },
];

export default function CabinetsPage() {
  const [main, ...rest] = CABINETS;
  return (
    <main className="mx-auto w-full max-w-[960px] px-4 pb-20 pt-28 text-[var(--foreground)] md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Кабинеты</h1>
      <p className="mt-2 max-w-[60ch] text-[var(--muted)]">
        Рабочие разделы Konversus, куда входят по логину и паролю. Клиентам логин не нужен: отчёты им отправляются ссылкой.
      </p>

      <CabinetCard cabinet={main} primary />
      <div className="mt-4 grid gap-4">
        {rest.map((c) => (
          <CabinetCard key={c.loginHref} cabinet={c} />
        ))}
      </div>
    </main>
  );
}

function CabinetCard({ cabinet, primary = false }: { cabinet: Cabinet; primary?: boolean }) {
  const Icon = cabinet.icon;
  return (
    <section
      className={`flex flex-col gap-5 rounded-lg border bg-[var(--surface)] md:flex-row md:items-center md:justify-between ${
        primary ? "mt-8 border-[var(--accent)] p-6 md:p-8" : "border-[var(--line)] p-6"
      }`}
    >
      <div className="flex gap-4">
        <Icon size={primary ? 28 : 22} strokeWidth={1.75} className="mt-1 shrink-0 text-[var(--muted)]" aria-hidden />
        <div>
          <h2 className={primary ? "text-2xl font-semibold" : "text-xl font-semibold"}>{cabinet.title}</h2>
          <p className="mt-2 max-w-[60ch] leading-relaxed text-[var(--muted)]">{cabinet.description}</p>
          <p className="mt-3 text-sm text-[var(--foreground)]">{cabinet.sections.join(" · ")}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{cabinet.access}</p>
        </div>
      </div>
      <Link
        href={cabinet.loginHref}
        className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-md px-6 font-semibold md:self-center ${
          primary
            ? "bg-[var(--accent)] text-[var(--background)] hover:bg-[var(--foreground)]"
            : "border border-[var(--line)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
        }`}
      >
        Войти
        <ArrowRight size={16} aria-hidden />
      </Link>
    </section>
  );
}
