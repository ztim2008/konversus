import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/positions/actions";
import { getViewer } from "@/lib/seo-positions/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вход — SEO-позиции",
  robots: { index: false, follow: false },
};

const inputClass = "w-full rounded-md border border-[var(--line)] bg-[var(--background)] p-2";

export default async function SeoLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getViewer()) redirect("/positions");
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <main className="mx-auto w-full max-w-[380px] px-4 pb-16 pt-32 text-sm text-[var(--foreground)]">
      <h1 className="text-2xl font-semibold">SEO-позиции</h1>
      <p className="mt-1 text-[var(--muted)]">Вход для маркетологов</p>
      {error && <p className="mt-4 rounded-md border border-[var(--accent-warm)] p-3 text-[var(--accent-warm)]">{error}</p>}
      <form action={loginAction} className="mt-6 grid gap-3">
        <label className="grid gap-1">
          <span className="text-[var(--muted)]">Логин</span>
          <input name="login" required autoComplete="username" autoCapitalize="none" className={inputClass} />
        </label>
        <label className="grid gap-1">
          <span className="text-[var(--muted)]">Пароль</span>
          <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </label>
        <button className="mt-2 rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-[var(--background)]">Войти</button>
      </form>
      <a href="/auth" className="mt-6 inline-block text-[var(--muted)] hover:text-[var(--foreground)]">
        Вход для администратора
      </a>
    </main>
  );
}
