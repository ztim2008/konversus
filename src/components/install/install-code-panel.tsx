"use client";

import { useState } from "react";

const THEMES = [
  { id: "dark", label: "Тёмная" },
  { id: "light", label: "Светлая" },
] as const;

const WIDTHS = [
  { id: "narrow", label: "По центру (560px)" },
  { id: "full", label: "На всю ширину" },
] as const;

const MODES = [
  { id: "inline", label: "В блоке", hint: "виджет встраивается в страницу" },
  { id: "bubble", label: "Плавающая кнопка", hint: "кнопка снизу справа, раскрывается в попап" },
] as const;

type ThemeId = "dark" | "light";
type WidthId = "narrow" | "full";
type ModeId = "inline" | "bubble";

function buildCode(theme: ThemeId, width: WidthId, mode: ModeId): string {
  const widthAttr = width === "full" ? '\n  data-width="full"' : "";
  const modeAttr = mode === "bubble" ? '\n  data-mode="bubble"' : "";
  const containerLine = mode === "bubble"
    ? ""
    : '<div id="architect-widget"></div>\n';
  return `${containerLine}<script\n  src="https://konversus.ru/architect-widget.js"\n  data-theme="${theme}"${widthAttr}${modeAttr}\n><\/script>`;
}

export function InstallCodePanel() {
  const [theme, setTheme] = useState<ThemeId>("dark");
  const [width, setWidth] = useState<WidthId>("narrow");
  const [mode, setMode] = useState<ModeId>("inline");
  const [copied, setCopied] = useState(false);

  const code = buildCode(theme, width, mode);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="icp-root">
      {/* Controls */}
      <div className="icp-controls">
        <div className="icp-control-group">
          <span className="icp-control-label">Режим</span>
          <div className="icp-tabs">
            {MODES.map((m) => (
              <button
                key={m.id}
                className={"icp-tab" + (mode === m.id ? " icp-tab--active" : "")}
                onClick={() => setMode(m.id)}
                title={m.hint}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="icp-control-group">
          <span className="icp-control-label">Тема</span>
          <div className="icp-tabs">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={"icp-tab" + (theme === t.id ? " icp-tab--active" : "")}
                onClick={() => setTheme(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {mode === "inline" && (
          <div className="icp-control-group">
            <span className="icp-control-label">Ширина</span>
            <div className="icp-tabs">
              {WIDTHS.map((w) => (
                <button
                  key={w.id}
                  className={"icp-tab" + (width === w.id ? " icp-tab--active" : "")}
                  onClick={() => setWidth(w.id)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Code block */}
      <div className="icp-code-wrap">
        <pre className="icp-code"><code>{code}</code></pre>
        <button
          className={"icp-copy-btn" + (copied ? " icp-copy-btn--copied" : "")}
          onClick={handleCopy}
        >
          {copied ? "✓ Скопировано" : "Копировать код"}
        </button>
      </div>
    </div>
  );
}
