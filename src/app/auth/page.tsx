import { redirect } from "next/navigation";

import { signInAction } from "@/app/auth/actions";
import { getCurrentAdmin } from "@/lib/auth/session";

type AuthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

export const metadata = {
  title: "Вход",
  robots: { index: false, follow: false },
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const [params, user] = await Promise.all([searchParams, getCurrentAdmin()]);

  if (user) {
    redirect("/dashboard");
  }

  const error = getSearchValue(params, "error");
  const message = getSearchValue(params, "message");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">

        {/* Логотип */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border border-amber-200/20 bg-[linear-gradient(135deg,rgba(246,196,123,0.25),rgba(152,209,255,0.14))] text-xs font-bold tracking-widest text-slate-50">
            ТА
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-600">
            konversus.ru
          </div>
        </div>

        {error ? (
          <div className="mb-4 border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mb-4 border border-sky-400/20 bg-sky-400/[0.08] px-4 py-3 text-sm text-sky-300">
            {message}
          </div>
        ) : null}

        <form action={signInAction} className="border border-white/10 bg-white/[0.03] p-6">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Email</span>
              <input
                className="w-full border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Пароль</span>
              <input
                className="w-full border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
          </div>
          <button
            className="mt-5 w-full bg-[linear-gradient(135deg,#f6c47b,#ffe0b2)] px-5 py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
            type="submit"
          >
            Войти
          </button>
        </form>

      </div>
    </main>
  );
}