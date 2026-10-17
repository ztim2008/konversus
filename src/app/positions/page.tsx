import type { Metadata } from "next";
import Link from "next/link";

import { createProjectAction, logoutAction } from "@/app/positions/actions";
import { getDailyCreditCap } from "@/lib/seo-positions/check";
import { creditsUsedSince, listProjects } from "@/lib/seo-positions/data";
import { canAccessProject, requireViewer } from "@/lib/seo-positions/users";

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
  const viewer = await requireViewer();
  const isOwner = viewer.role === "admin";
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const [allProjects, credits] = await Promise.all([listProjects(), creditsUsedSince(24)]);
  const projects = allProjects.filter((p) => canAccessProject(viewer, p.id));

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-24 text-sm text-[var(--foreground)] md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isOwner ? (
          <Link href="/dashboard" className="text-[var(--muted)] hover:text-[var(--foreground)]">
            ← Кабинет
          </Link>
        ) : (
          <span className="text-[var(--muted)]">{viewer.label}</span>
        )}
        {isOwner ? (
          <Link href="/positions/users" className="rounded-md border border-[var(--line)] px-3 py-1.5 hover:bg-[var(--surface-strong)]">
            Маркетологи
          </Link>
        ) : (
          <form action={logoutAction}>
            <button className="text-[var(--muted)] hover:text-[var(--foreground)]">Выйти</button>
          </form>
        )}
      </div>
      <h1 className="mt-1 text-2xl font-semibold">SEO-позиции</h1>
      <p className="mt-1 text-[var(--muted)]">
        Где сайт клиента в обычной выдаче Google по его запросам, по дням.
        {isOwner && (
          <>
            {" "}
            Кредитов Serper за сутки: <span className="font-mono text-[var(--foreground)]">{credits}</span> из{" "}
            <span className="font-mono text-[var(--foreground)]">{getDailyCreditCap()}</span>.
          </>
        )}
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

      {isOwner && (
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
      )}

      <HowTo isOwner={isOwner} />
    </main>
  );
}

function HowTo({ isOwner }: { isOwner: boolean }) {
  return (
    <details className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
      <summary className="cursor-pointer font-medium">Как пользоваться</summary>
      <div className="mt-3 space-y-4 leading-relaxed">
        {isOwner && (
          <div>
            <h3 className="font-medium">Проект для клиента</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-[var(--muted)]">
              <li>Внизу «Новый проект»: домен, город, запросы по одному в строке.</li>
              <li>В проекте «Проверить все сейчас» — первая точка на графике. Дальше проверка сама раз в сутки в 09:00 по Ташкенту.</li>
              <li>Клиенту отправляйте «Ссылку для клиента» внизу страницы проекта — там только просмотр, без входа.</li>
              <li>Что меняли на сайте — «Добавить отметку» под графиком: на графике появится пунктир, в отчёте — строка «что сделали».</li>
              <li>В начале месяца — «Отчёт за месяц», внизу «План на следующий месяц», кнопка «Скачать PDF».</li>
              <li>
                В самом низу отчёта — «Проверка сайта по чек-листу»: «Автопроверка» заполнит 17 пунктов из 32, остальные
                отметьте сами и «Сохранить проверку». Через месяц повторите — в отчёте будет «было / стало».
              </li>
            </ol>
          </div>
        )}
        {isOwner && (
          <div>
            <h3 className="font-medium">Доступ маркетологу</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-[var(--muted)]">
              <li>
                Кнопка «Маркетологи» вверху → логин латиницей, имя, галочки на проектах → «Создать и показать пароль».
              </li>
              <li>Скопируйте блок «Вход / Логин / Пароль» и отправьте маркетологу. Пароль виден одну минуту, потом только «Новый пароль».</li>
              <li>Маркетолог входит на /positions/login и видит только отмеченные проекты.</li>
              <li>Расстались — «Заблокировать» или «Удалить»: он сразу выходит со всех устройств.</li>
            </ol>
          </div>
        )}
        <div>
          <h3 className="font-medium">{isOwner ? "Что может маркетолог" : "Что можно делать"}</h3>
          <p className="mt-1 text-[var(--muted)]">
            Смотреть позиции и отчёт, запускать проверку, добавлять запросы и отметки, писать план в месячном отчёте.
            Удалять проекты и запросы и ставить расписание на паузу может только администратор.
          </p>
        </div>
        <div>
          <h3 className="font-medium">Как читать цифры</h3>
          <p className="mt-1 text-[var(--muted)]">
            Позиция — место сайта в обычной выдаче Google (без рекламы), с компьютера, в городе проекта. Google
            перетасовывает выдачу, сдвиг на 1–2 места за день — шум. Смотрите тренд за неделю и месяц.
          </p>
        </div>
      </div>
    </details>
  );
}
