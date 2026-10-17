"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Перечитывает данные страницы, пока идёт проверка. Без перезагрузки и без выдуманных промежуточных значений. */
export function AutoRefresh({ active, intervalMs = 4000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  const wasActive = useRef(false);
  useEffect(() => {
    if (!active) {
      if (!wasActive.current) return;
      wasActive.current = false;
      // Опрос мог прийти позже запуска новой проверки и показать старое состояние — перечитываем ещё раз.
      const id = setTimeout(() => router.refresh(), intervalMs);
      return () => clearTimeout(id);
    }
    wasActive.current = true;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);
  return null;
}
