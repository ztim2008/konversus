"use client";

import { useEffect } from "react";

/**
 * Инжектит произвольный HTML-код (включая <script> теги, виджеты чатов,
 * пиксели, счётчики) в конец <body>. Работает на всех страницах сайта.
 *
 * Скрипты создаются через document.createElement("script"), что гарантирует
 * их исполнение браузером — в отличие от innerHTML.
 */
export function BodyScriptInjector({ html }: { html: string }) {
  useEffect(() => {
    if (!html || !html.trim()) return;

    const container = document.createElement("div");
    container.innerHTML = html;

    const injected: Node[] = [];

    container.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value)
      );
      newScript.textContent = oldScript.textContent;
      document.body.appendChild(newScript);
      injected.push(newScript);
    });

    // Не-скриптовые ноды (например, div-якоря для виджетов, noscript и т.п.)
    Array.from(container.childNodes).forEach((node) => {
      const el = node as Element;
      if (el.tagName !== "SCRIPT") {
        document.body.appendChild(el.cloneNode(true));
      }
    });

    return () => {
      injected.forEach((n) => n.parentNode?.removeChild(n));
    };
  }, [html]);

  return null;
}
