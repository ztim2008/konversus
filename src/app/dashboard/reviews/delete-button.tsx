"use client";

import { useTransition } from "react";

import { deleteFeedbackAction } from "./actions";

export function DeleteFeedbackButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Удалить этот отзыв? Действие необратимо.")) return;
    startTransition(() => deleteFeedbackAction(id));
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="border border-red-900/40 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-red-500/60 transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
    >
      {isPending ? "…" : "Удалить"}
    </button>
  );
}
