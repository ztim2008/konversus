import type { CSSProperties } from "react";

type RichTextBlockProps = {
  html: string;
  eyebrow?: string;
  style?: CSSProperties;
};

/**
 * Server-компонент для rich-text блока.
 *
 * suppressHydrationWarning на секции + на div предотвращает React #418 при
 * гидрации — браузер может нормализовать Tiptap HTML иначе чем Node.js SSR,
 * поэтому явно говорим React не сравнивать этот поддерево.
 */
export function RichTextBlock({ html, eyebrow, style }: RichTextBlockProps) {
  return (
    <section className="block" style={style} suppressHydrationWarning>
      {eyebrow && <div className="section-kicker">{eyebrow}</div>}
      <div
        className="rich-text-content"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
