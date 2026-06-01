"use client";

import { useEffect, useState } from "react";

export function FeedbackFab() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Показываем FAB когда feedback-секция НЕ видна
        setVisible(!entry.isIntersecting);
      },
      { rootMargin: "0px 0px -20% 0px", threshold: 0.1 },
    );

    const target = document.getElementById("feedback");
    if (target) observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <a
      href="#feedback"
      className="fpb-feedback-fab screen-only"
      aria-label="Оставить отзыв о концепте"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      Оставить отзыв
    </a>
  );
}
