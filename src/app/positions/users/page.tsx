import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import {
  createUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  toggleUserAction,
  updateUserProjectsAction,
} from "@/app/positions/actions";
import { DeleteConfirmButton } from "@/components/dashboard/delete-confirm-button";
import { requireCurrentAdmin } from "@/lib/auth/session";
import { listProjects, type SeoProject } from "@/lib/seo-positions/data";
import { publicBaseUrl } from "@/lib/seo-positions/page-data";
import { listUsers, PASSWORD_FLASH_COOKIE } from "@/lib/seo-positions/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Маркетологи — SEO-позиции",
  robots: { index: false, follow: false },
};

const inputClass = "w-full rounded-md border border-[var(--line)] bg-[var(--background)] p-2";
const btn = "rounded-md border border-[var(--line)] px-3 py-1.5 hover:bg-[var(--surface-strong)]";

function readFlash(raw: string | undefined): { login: string; password: string } | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return typeof v.login === "string" && typeof v.password === "string" ? v : null;
  } catch {
    return null;
  }
}

function ProjectChecks({ projects, selected }: { projects: SeoProject[]; selected: string[] }) {
  if (!projects.length) return <p className="text-[var(--muted)]">Проектов пока нет</p>;
  return (
    <div className="grid gap-1 sm:grid-cols-2">
      {projects.map((p) => (
        <label key={p.id} className="flex items-center gap-2">
          <input type="checkbox" name="projectIds" value={p.id} defaultChecked={selected.includes(p.id)} />
          <span>
            {p.name} <span className="font-mono text-[var(--muted)]">{p.domain}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

export default async function SeoUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCurrentAdmin();
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const flash = readFlash((await cookies()).get(PASSWORD_FLASH_COOKIE)?.value);
  const [users, projects] = await Promise.all([listUsers(), listProjects()]);
  const loginUrl = `${publicBaseUrl()}/positions/login`;
  const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Moscow" });

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-24 text-sm text-[var(--foreground)] md:px-6">
      <Link href="/positions" className="text-[var(--muted)] hover:text-[var(--foreground)]">
        ← SEO-позиции
      </Link>
      <h1 className="mt-1 text-2xl font-semibold">Маркетологи</h1>
      <p className="mt-1 text-[var(--muted)]">
        Маркетолог видит только отмеченные проекты: позиции, отчёт, отметки, план, проверка. Удалять проекты и запросы,
        ставить расписание на паузу и заходить в кабинет он не может. Вход: <span className="font-mono">{loginUrl}</span>
      </p>

      {error && <p className="mt-4 rounded-md border border-[var(--accent-warm)] p-3 text-[var(--accent-warm)]">{error}</p>}
      {flash && (
        <div className="mt-4 rounded-md border border-[var(--accent)] p-3">
          <p>Передайте маркетологу. Пароль виден одну минуту, потом только сброс.</p>
          <pre className="mt-2 whitespace-pre-wrap font-mono">{`Вход: ${loginUrl}\nЛогин: ${flash.login}\nПароль: ${flash.password}`}</pre>
        </div>
      )}

      <section className="mt-6 space-y-4">
        {users.length === 0 && <p className="text-[var(--muted)]">Маркетологов пока нет</p>}
        {users.map((u) => (
          <div key={u.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-base">{u.login}</span>
                {u.name && <span className="ml-2">{u.name}</span>}
                <span className="ml-2 text-[var(--muted)]">
                  {u.isActive ? "активен" : "заблокирован"} · вход {u.lastLoginAt ? dateFmt.format(new Date(u.lastLoginAt)) : "ещё не входил"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={resetUserPasswordAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="login" value={u.login} />
                  <button className={btn}>Новый пароль</button>
                </form>
                <form action={toggleUserAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="active" value={u.isActive ? "1" : "0"} />
                  <button className={btn}>{u.isActive ? "Заблокировать" : "Разблокировать"}</button>
                </form>
                <DeleteConfirmButton
                  action={deleteUserAction}
                  idName="userId"
                  idValue={u.id}
                  label="Удалить"
                  confirmMessage={`Удалить доступ ${u.login}?`}
                  className={`${btn} text-[var(--muted)] hover:text-[var(--accent-warm)]`}
                />
              </div>
            </div>
            <form action={updateUserProjectsAction} className="mt-3 border-t border-[var(--line)] pt-3">
              <input type="hidden" name="userId" value={u.id} />
              <ProjectChecks projects={projects} selected={u.projectIds} />
              <button className={`${btn} mt-3`}>Сохранить проекты</button>
            </form>
          </div>
        ))}
      </section>

      <form action={createUserAction} className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 md:grid-cols-2">
        <h2 className="font-medium md:col-span-2">Новый маркетолог</h2>
        <label className="grid gap-1">
          <span className="text-[var(--muted)]">Логин (латиница)</span>
          <input name="login" required pattern="[A-Za-z0-9._\-]{3,64}" className={`${inputClass} font-mono`} placeholder="anna" />
        </label>
        <label className="grid gap-1">
          <span className="text-[var(--muted)]">Имя</span>
          <input name="name" className={inputClass} placeholder="Анна, агентство «Пример»" />
        </label>
        <div className="md:col-span-2">
          <p className="mb-2 text-[var(--muted)]">Доступ к проектам</p>
          <ProjectChecks projects={projects} selected={[]} />
        </div>
        <div className="md:col-span-2">
          <button className="rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-[var(--background)]">
            Создать и показать пароль
          </button>
        </div>
      </form>
    </main>
  );
}
