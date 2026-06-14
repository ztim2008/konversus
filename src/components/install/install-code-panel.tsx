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
  { id: "bubble", label: "Плавающая кнопка", hint: "кнопка снизу, раскрывается в попап" },
] as const;

const POSITIONS = [
  { id: "right", label: "Справа" },
  { id: "left", label: "Слева" },
] as const;

const TRIGGERS = [
  { id: "click", label: "По клику", hint: "только ручное открытие" },
  { id: "time", label: "По таймеру", hint: "открыть через N секунд" },
  { id: "scroll", label: "При прокрутке", hint: "открыть при прокрутке на N%" },
  { id: "exit", label: "При уходе", hint: "когда курсор уходит к вкладке" },
] as const;

type ThemeId = "dark" | "light";
type WidthId = "narrow" | "full";
type ModeId = "inline" | "bubble";
type PositionId = "right" | "left";
type TriggerId = "click" | "time" | "scroll" | "exit";

interface BubbleOpts {
  position: PositionId;
  trigger: TriggerId;
  delay: number;
  scroll: number;
}

function buildCode(
  theme: ThemeId,
  width: WidthId,
  mode: ModeId,
  bubble: BubbleOpts
): string {
  const widthAttr = width === "full" ? '\n  data-width="full"' : "";
  const modeAttr = mode === "bubble" ? '\n  data-mode="bubble"' : "";
  const containerLine = mode === "bubble" ? "" : '<div id="architect-widget"></div>\n';

  let bubbleAttrs = "";
  if (mode === "bubble") {
    if (bubble.position === "left") bubbleAttrs += '\n  data-position="left"';
    if (bubble.trigger !== "click") {
      bubbleAttrs += `\n  data-open-trigger="${bubble.trigger}"`;
      if (bubble.trigger === "time") bubbleAttrs += `\n  data-open-delay="${bubble.delay}"`;
      if (bubble.trigger === "scroll") bubbleAttrs += `\n  data-open-scroll="${bubble.scroll}"`;
    }
  }

  return `${containerLine}<script\n  src="https://konversus.ru/architect-widget.js"\n  data-theme="${theme}"${widthAttr}${modeAttr}${bubbleAttrs}\n><\/script>`;
}

export function InstallCodePanel() {
  const [theme, setTheme] = useState<ThemeId>("dark");
  const [width, setWidth] = useState<WidthId>("narrow");
  const [mode, setMode] = useState<ModeId>("bubble");
  const [position, setPosition] = useState<PositionId>("right");
  const [trigger, setTrigger] = useState<TriggerId>("click");
  const [delay, setDelay] = useState(6);
  const [scroll, setScroll] = useState(50);
  const [copied, setCopied] = useState(false);

  const code = buildCode(theme, width, mode, {
    position,
    trigger,
    delay: delay * 1000,
    scroll,
  });

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
        {mode === "bubble" && (
          <>
            <div className="icp-control-group">
              <span className="icp-control-label">Сторона</span>
              <div className="icp-tabs">
                {POSITIONS.map((p) => (
                  <button
                    key={p.id}
                    className={"icp-tab" + (position === p.id ? " icp-tab--active" : "")}
                    onClick={() => setPosition(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="icp-control-group">
              <span className="icp-control-label">Открытие</span>
              <div className="icp-tabs">
                {TRIGGERS.map((t) => (
                  <button
                    key={t.id}
                    className={"icp-tab" + (trigger === t.id ? " icp-tab--active" : "")}
                    onClick={() => setTrigger(t.id)}
                    title={t.hint}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {trigger === "time" && (
              <div className="icp-control-group icp-control-group--inline">
                <span className="icp-control-label">Через</span>
                <input
                  type="number" min={1} max={120} value={delay}
                  onChange={(e) => setDelay(Math.max(1, Math.min(120, Number(e.target.value) || 6)))}
                  className="icp-num-input"
                />
                <span className="icp-control-suffix">сек</span>
              </div>
            )}
            {trigger === "scroll" && (
              <div className="icp-control-group icp-control-group--inline">
                <span className="icp-control-label">Прокрутка</span>
                <input
                  type="number" min={5} max={95} value={scroll}
                  onChange={(e) => setScroll(Math.max(5, Math.min(95, Number(e.target.value) || 50)))}
                  className="icp-num-input"
                />
                <span className="icp-control-suffix">%</span>
              </div>
            )}
          </>
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
