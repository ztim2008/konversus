"use client";

import { useState } from "react";

import { PROFILE_PHOTO, SKILL_GROUPS } from "./profile";

function SkillGroup({
  title,
  items,
  limit,
  compact,
}: {
  title: string;
  items: readonly string[];
  limit: number;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const visible = open ? items : items.slice(0, limit);
  const hidden = items.length - visible.length;

  return (
    <section className={compact ? "mt-2.5" : "mt-6"}>
      <h2 className={compact ? "text-[11px] font-medium text-[var(--foreground)]" : "text-[13px] font-medium text-[var(--foreground)]"}>
        {title}
      </h2>
      <p className={compact ? "mt-0.5 text-[11px] leading-snug text-[var(--muted)]" : "mt-2 text-[13px] leading-relaxed text-[var(--muted)]"}>
        {visible.join(" · ")}
      </p>
      {items.length > limit ? (
        <button
          type="button"
          className="mt-0.5 text-[11px] font-medium text-[#2bae93]"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? "Свернуть" : `Ещё ${hidden}`}
        </button>
      ) : null}
    </section>
  );
}

function Groups({ limit, compact }: { limit: number; compact?: boolean }) {
  return (
    <>
      {SKILL_GROUPS.map((group) => (
        <SkillGroup key={group.title} title={group.title} items={group.items} limit={limit} compact={compact} />
      ))}
    </>
  );
}

export function PortfolioSidebar() {
  return (
    <aside className="border-b border-[var(--line)] px-5 py-8 min-[900px]:sticky min-[900px]:top-16 min-[900px]:w-[280px] min-[900px]:shrink-0 min-[900px]:self-start min-[900px]:overflow-visible min-[900px]:border-b-0 min-[900px]:border-r min-[900px]:px-5 min-[900px]:py-4">
      <img
        src={PROFILE_PHOTO}
        alt="Алексей Тимофеев"
        width={640}
        height={640}
        className="h-24 w-24 object-cover min-[900px]:h-14 min-[900px]:w-14"
      />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--foreground)] min-[900px]:mt-3 min-[900px]:text-lg">
        Алексей Тимофеев
      </h1>
      <p className="mt-3 text-sm leading-snug text-[var(--foreground)] min-[900px]:mt-1.5 min-[900px]:text-[12px] min-[900px]:leading-snug">
        AI Engineer / AI Developer
        <br />
        Дизайнер цифровых продуктов и визуального контента
      </p>
      <p className="mt-4 max-w-[28ch] text-sm leading-relaxed text-[var(--muted)] min-[900px]:mt-2 min-[900px]:text-[11px] min-[900px]:leading-snug">
        AI, сайты, автоматизация и визуальный контент. Создаю цифровые решения от идеи и архитектуры до работающего продукта.
      </p>
      <a
        href="https://t.me/bilarius"
        className="mt-4 inline-block text-sm text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-4 min-[900px]:mt-2 min-[900px]:text-[12px]"
      >
        Telegram
      </a>

      <div className="mt-8 min-[900px]:hidden">
        <details>
          <summary className="cursor-pointer text-sm text-[var(--foreground)]">Навыки</summary>
          <Groups limit={8} />
        </details>
      </div>
      <div className="mt-4 hidden min-[900px]:block">
        <Groups limit={4} compact />
      </div>
    </aside>
  );
}
