"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

type ClientHtmlBlockProps = {
  html: string;
  className?: string;
  style?: CSSProperties;
  wrapperTag?: "div" | "section";
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
  eyebrow?: string;
};

/**
 * Клиентский компонент для вставки произвольного HTML (Tiptap, Custom HTML).
 *
 * Сервер рендерит пустой контейнер → гидрация проходит без ошибок.
 * После монтирования useEffect устанавливает innerHTML через DOM API.
 * Это единственный способ избежать React #418 при вставке HTML,
 * который браузер может нормализовать иначе чем Node.js SSR.
 */
export function ClientHtmlBlock({
  html,
  className,
  style,
  wrapperTag: WrapperTag = "div",
  wrapperClassName,
  wrapperStyle,
  eyebrow,
}: ClientHtmlBlockProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html;
    }
  }, [html]);

  if (wrapperClassName || wrapperStyle || eyebrow) {
    return (
      <section className={wrapperClassName} style={wrapperStyle}>
        {eyebrow && <div className="section-kicker">{eyebrow}</div>}
        <div className={className} style={style} ref={ref} />
      </section>
    );
  }

  return <div className={className} style={style} ref={ref} />;
}
