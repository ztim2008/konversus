import Link from "next/link";

import { listProposals } from "@/lib/data/proposals";
import { getShareLinksForProposals, getSharePath } from "@/lib/data/share-links";
import { WorksGrid } from "@/components/works-grid";
import type { ProposalBlock, ProposalBlockPayload } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Работы · Тимофеев Алексей",
  description: "Концепты и digital-упаковка для производственных компаний.",
};

const PAGE_SIZE = 12;

function extractCoverImage(structure: ProposalBlock[]): string | null {
  for (const block of structure) {
    const p = block.payload as ProposalBlockPayload | undefined;
    if (!p) continue;
    if (p.backgroundImageUrl) return p.backgroundImageUrl;
    if (p.photoUrl) return p.photoUrl;
    if (Array.isArray(p.photos) && p.photos.length > 0) return p.photos[0]?.url ?? null;
  }
  return null;
}

export default async function WorksPage() {
  const proposals = await listProposals();
  const shareMap = await getShareLinksForProposals(proposals.map((p) => p.id));

  const visible = proposals.filter((p) => {
    const sl = shareMap[p.id];
    return sl && sl.status === "active";
  });

  const total = visible.length;
  const initialItems = visible.slice(0, PAGE_SIZE).map((p) => ({
    id: p.id,
    title: p.title,
    headline: p.headline ?? null,
    cover: extractCoverImage(p.structure as ProposalBlock[]),
    href: getSharePath(shareMap[p.id]),
  }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-20 pt-6 sm:px-8 lg:px-10">

      <header className="sticky top-4 z-20 border border-white/10 bg-black/40 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-11 w-11 shrink-0 items-center justify-center border border-amber-200/20 bg-[linear-gradient(135deg,rgba(246,196,123,0.25),rgba(152,209,255,0.14))] text-sm font-semibold tracking-[0.22em] text-slate-50 transition-opacity hover:opacity-70"
            >
              ТА
            </Link>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">Портфолио проектов</div>
              <div className="text-sm font-semibold text-slate-200">Концепты для производственных компаний</div>
            </div>
          </div>
          <Link href="/" className="border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:border-amber-200/30 hover:bg-white/5">
            ← Главная
          </Link>
        </div>
      </header>

      <div className="mt-10 mb-8 flex items-end justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">Работы</div>
          <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">Проекты и концепты</h1>
        </div>
        {total > 0 && (
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300/60">
            {total} {total === 1 ? "проект" : total < 5 ? "проекта" : "проектов"}
          </div>
        )}
      </div>

      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 border border-white/10 bg-white/[0.02] py-24 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-600">Пока пусто</div>
          <div className="text-sm text-slate-500">Здесь появятся концепты с активными share-ссылками</div>
        </div>
      ) : (
        <WorksGrid initialItems={initialItems} initialTotal={total} />
      )}

      <footer className="mt-0 border border-white/[0.06] px-7 py-5 text-center">
        <div className="text-xs font-mono uppercase tracking-[0.22em] text-slate-600">
          © 2026 Тимофеев Алексей · konversus.ru
        </div>
      </footer>

    </main>
  );
}
