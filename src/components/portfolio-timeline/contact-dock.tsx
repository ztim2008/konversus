"use client";

import { MessageCircle, Phone, Send, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type DockItem = {
  id: string;
  label: string;
  hint: string;
  href: string;
  external?: boolean;
  icon: ReactNode;
};

type ContactDockProps = {
  phone: string;
  phoneHref: string;
  vkHref: string;
  telegram: string;
  telegramHref: string;
  maxHref: string;
};

function VkMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.598-.188 1.368 1.259 2.183 1.815.616.42 1.084.328 1.084.328l2.178-.03s1.14-.07.599-.964c-.044-.073-.314-.661-1.616-1.867-1.363-1.262-1.181-1.058.462-3.24.999-1.329 1.398-2.141 1.273-2.488-.12-.331-.854-.244-.854-.244l-2.455.015s-.182-.025-.317.056-.208.186-.208.186-.373.99-.87 1.833c-1.049 1.78-1.47 1.876-1.642 1.764-.4-.26-.3-1.045-.3-1.603 0-1.743.264-2.47-.516-2.658-.259-.063-.45-.104-1.113-.111-.85-.009-1.57.003-1.977.164-.27.107-.478.346-.351.36.157.017.512.096.7.352.243.33.234 1.07.234 1.07s.14 2.056-.327 2.311c-.32.174-.76-.181-1.704-1.804-.483-.84-.848-1.77-.848-1.77s-.07-.173-.196-.266c-.152-.112-.365-.147-.365-.147l-2.333.015s-.35.01-.479.162c-.114.135-.009.414-.009.414s1.793 4.198 3.825 6.315c1.863 1.94 3.978 1.812 3.978 1.812h.958z"
      />
    </svg>
  );
}

function MaxMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 16.2V8.1A2.1 2.1 0 0 1 7.1 6h9.8A2.1 2.1 0 0 1 19 8.1v5.2a2.1 2.1 0 0 1-2.1 2.1H9.1L5 18.4v-2.2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M8.2 10.1h7.6M8.2 13h4.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function ContactDock({ phone, phoneHref, vkHref, telegram, telegramHref, maxHref }: ContactDockProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const items: DockItem[] = [];
  if (phoneHref) items.push({ id: "phone", label: "Телефон", hint: phone, href: phoneHref, icon: <Phone size={18} strokeWidth={1.75} /> });
  if (vkHref) items.push({ id: "vk", label: "ВК", hint: "ВКонтакте", href: vkHref, external: true, icon: <VkMark /> });
  if (telegramHref) {
    items.push({
      id: "telegram",
      label: "Telegram",
      hint: telegram,
      href: telegramHref,
      external: true,
      icon: <Send size={18} strokeWidth={1.75} />,
    });
  }
  if (maxHref) items.push({ id: "max", label: "Макс", hint: "Написать в Макс", href: maxHref, external: true, icon: <MaxMark /> });

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={rootRef} className="ptl-dock">
      {open ? (
        <div id={menuId} className="ptl-dock-menu" role="group" aria-label="Контакты">
          {items.map((item, index) => (
            <a
              key={item.id}
              className="ptl-dock-item"
              style={{ animationDelay: `${index * 40}ms` }}
              href={item.href}
              {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              aria-label={item.hint ? `${item.label}, ${item.hint}` : item.label}
            >
              <span className="ptl-dock-label">{item.label}</span>
              <span className="ptl-dock-circle">{item.icon}</span>
            </a>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="ptl-dock-main"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? "Закрыть контакты" : "Контакты"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={22} strokeWidth={1.75} /> : <MessageCircle size={22} strokeWidth={1.75} />}
      </button>
      <style>{`
        .ptl-dock {
          position: fixed;
          z-index: 900;
          right: max(20px, env(safe-area-inset-right));
          bottom: max(20px, env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }
        .ptl-dock-menu {
          display: flex;
          flex-direction: column-reverse;
          align-items: flex-end;
          gap: 10px;
        }
        .ptl-dock-item {
          display: flex;
          align-items: center;
          text-decoration: none;
          color: var(--foreground);
          animation: ptl-dock-rise 220ms ease-out both;
        }
        .ptl-dock-label {
          margin-right: 8px;
          padding: 7px 10px;
          border: 1px solid var(--line);
          background: var(--surface-strong);
          color: var(--foreground);
          font-size: 13px;
          line-height: 1;
        }
        .ptl-dock-circle,
        .ptl-dock-main {
          display: grid;
          place-items: center;
          border-radius: 999px;
          transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
        }
        .ptl-dock-circle {
          width: 46px;
          height: 46px;
          border: 1px solid var(--line);
          background: var(--surface-strong);
          color: var(--foreground);
        }
        .ptl-dock-item:hover .ptl-dock-circle,
        .ptl-dock-item:focus-visible .ptl-dock-circle {
          border-color: var(--accent);
          background: var(--surface);
        }
        .ptl-dock-item:focus-visible {
          outline: none;
        }
        .ptl-dock-item:focus-visible .ptl-dock-label {
          border-color: var(--accent);
        }
        .ptl-dock-main {
          position: relative;
          width: 56px;
          height: 56px;
          border: 0;
          background: var(--foreground);
          color: var(--background);
          cursor: pointer;
        }
        .ptl-dock-main:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }
        .ptl-dock-main[aria-expanded="false"]::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          border: 1px solid var(--accent-warm);
          animation: ptl-dock-pulse 2.2s ease-out infinite;
          pointer-events: none;
        }
        @keyframes ptl-dock-rise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ptl-dock-pulse {
          0% { transform: scale(1); opacity: 0.75; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ptl-dock-item { animation: none; }
          .ptl-dock-main[aria-expanded="false"]::after { animation: none; opacity: 0.45; transform: scale(1.12); }
        }
      `}</style>
    </div>
  );
}
