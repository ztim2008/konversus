import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createAdsTokenAction } from "@/app/positions/actions";
import { AdsStrip } from "@/components/seo-positions/ads-section";
import { PendingButton } from "@/components/seo-positions/pending-button";
import { ADS_FLASH_COOKIE, loadAdsData } from "@/lib/seo-positions/ads";
import { googleAdsScript } from "@/lib/seo-positions/ads-script";
import { dayList, summarizeAds } from "@/lib/seo-positions/ads-summary";
import { getProject } from "@/lib/seo-positions/data";
import { publicBaseUrl } from "@/lib/seo-positions/page-data";
import { localDayAgo, timeZoneFor } from "@/lib/seo-positions/tz";
import { canAccessProject, requireViewer } from "@/lib/seo-positions/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Реклама — SEO-позиции",
  robots: { index: false, follow: false },
};

export default async function SeoAdsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const viewer = await requireViewer();
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project || !canAccessProject(viewer, project.id)) notFound();

  const tz = timeZoneFor(project.gl);
  const to = localDayAgo(project.gl, 1);
  const from = localDayAgo(project.gl, 30);
  const days = dayList(from, to);
  const [data, token] = await Promise.all([loadAdsData(project.id, from, to), (await cookies()).get(ADS_FLASH_COOKIE)?.value]);
  const google = data.links.find((l) => l.source === "google");
  const summary = summarizeAds(days, data.covered, data.rows);
  const fmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: tz });
  const btn = "rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-[var(--background)]";

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-24 text-sm text-[var(--foreground)] md:px-6">
      <Link href={`/positions/${project.id}`} className="text-[var(--muted)] hover:text-[var(--foreground)]">
        ← {project.name}
      </Link>
      <h1 className="mt-1 text-2xl font-semibold">Реклама</h1>
      <p className="mt-1 text-[var(--muted)]">
        Когда реклама шла и когда стояла, расход и клики — в месячном отчёте и подложкой на графике позиций. Данные
        присылает сам рекламный аккаунт, доступ к нему не нужен.
      </p>

      <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
        <h2 className="font-medium">Google Ads</h2>
        <p className="mt-1 text-[var(--muted)]">
          {!google
            ? "Не подключено."
            : google.syncedAt
              ? `Последняя выгрузка ${fmt.format(google.syncedAt)}${google.accountName ? ` · ${google.accountName}` : ""}${google.currency ? ` · ${google.currency}` : ""}.`
              : `Ключ создан ${fmt.format(google.createdAt)}, данных от скрипта ещё не было.`}
        </p>

        {google?.syncedAt && (
          <div className="mt-3">
            <AdsStrip days={days} states={summary.states} />
          </div>
        )}

        {token ? (
          <div className="mt-4 space-y-2">
            <p>
              Скрипт с ключом показан один раз, на 10 минут. Скопируйте его целиком и вставьте в аккаунт Google Ads клиента:
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-[var(--muted)]">
              <li>Инструменты → Массовые действия → Скрипты → «+».</li>
              <li>Вставить скрипт вместо текста по умолчанию, «Авторизовать».</li>
              <li>«Запустить». В журнале должно быть «Ответ: 200».</li>
              <li>Расписание: «Ежедневно», 6:00.</li>
            </ol>
            <textarea
              readOnly
              rows={16}
              className="w-full rounded-md border border-[var(--line)] bg-[var(--background)] p-2 font-mono text-xs"
              defaultValue={googleAdsScript(`${publicBaseUrl()}/api/seo-positions/ads`, token)}
            />
          </div>
        ) : (
          <form action={createAdsTokenAction} className="mt-4 flex flex-wrap items-center gap-3">
            <input type="hidden" name="projectId" value={project.id} />
            <PendingButton pendingText="Создаю…" className={btn}>
              {google ? "Новый ключ и скрипт" : "Получить скрипт"}
            </PendingButton>
            {google && <span className="text-[var(--muted)]">Старый скрипт перестанет отправлять данные — замените его в аккаунте.</span>}
          </form>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
        <h2 className="font-medium">Яндекс Директ</h2>
        <p className="mt-1 text-[var(--muted)]">Следующим шагом — через API Директа: клиент один раз нажимает «Разрешить».</p>
      </section>
    </main>
  );
}
