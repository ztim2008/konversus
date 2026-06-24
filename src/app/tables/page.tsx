"use client";

import { useState, useCallback, useMemo } from "react";

type Cell = { text: string };
type TableData = { headers: string[][]; rows: Cell[][] };
type DetectedFormat = "HTML" | "ExcelTSV" | "CSV" | "Markdown" | "unknown";

function detectFormat(text: string): DetectedFormat {
  const s = text.trim();
  if (!s) return "unknown";
  if (/^\s*</.test(s) && /<\/(\w+)>/g.test(s)) return "HTML";
  const lines = s.split("\n").filter(Boolean);
  if (lines.length < 2) return "unknown";
  if (s.includes("\t")) return "ExcelTSV";
  if (s.includes("|") && lines.some((l) => /^\|[\s:-]+\|$/.test(l.trim()))) return "Markdown";
  if (s.includes(",")) {
    const cc = lines.map((l) => l.split(",").length);
    const mode = cc.sort((a, b) => cc.filter((v) => v === a).length - cc.filter((v) => v === b).length).pop() || 0;
    if (cc.filter((c) => c === mode).length >= lines.length * 0.7) return "CSV";
  }
  return "unknown";
}

function parseHTML(html: string): TableData {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = doc.querySelector("table") || doc.querySelectorAll("table")[0];
  if (!table) throw new Error("Не найден тег &lt;table&gt;");
  const rows = table.querySelectorAll("tr");
  if (!rows.length) throw new Error("В таблице нет строк");
  const t: number[] = [];
  let first = true;
  const hd: string[][] = [];
  const bd: Cell[][] = [];
  rows.forEach((row) => {
    const cells = row.querySelectorAll("th, td");
    let col = 0;
    const rd: Cell[] = [];
    cells.forEach((cell) => {
      while (t[col]) { t[col]--; col++; }
      const txt = (cell.textContent || "").trim();
      const cs = Math.max(1, parseInt(cell.getAttribute("colspan") || "1") || 1);
      const rs = Math.max(1, parseInt(cell.getAttribute("rowspan") || "1") || 1);
      rd.push({ text: txt });
      for (let c = 0; c < cs; c++) t[col + c] = Math.max(t[col + c] || 0, rs - 1);
      col += cs;
    });
    if (first) { hd.push(rd.map((c) => c.text)); first = false; }
    else bd.push(rd);
  });
  return { headers: hd, rows: bd };
}

function parseDelimited(text: string, sep: string): TableData {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && l !== sep.repeat(3));
  if (!lines.length) throw new Error("Нет данных");
  const data = lines.map((l) =>
    l.split(sep).map((c) => c.replace(/^["\s]+|["\s]+$/g, "").trim())
  );
  return { headers: [data[0]], rows: data.slice(1).map((r) => r.map((t) => ({ text: t }))) };
}

function parseMarkdown(text: string): TableData {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l);
  const data: string[][] = [];
  lines.forEach((l) => {
    if (/^\|[\s:-]+\|$/.test(l)) return;
    if (l.startsWith("|")) l = l.slice(1);
    if (l.endsWith("|")) l = l.slice(0, -1);
    data.push(l.split("|").map((c) => c.trim()));
  });
  if (!data.length) throw new Error("Нет данных");
  return { headers: [data[0]], rows: data.slice(1).map((r) => r.map((t) => ({ text: t }))) };
}

function parseSpaces(text: string): TableData {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) throw new Error("Мало строк");
  const heads = lines[0].trim().split(/\s{2,}/).filter(Boolean);
  const cols = heads.length;
  const b = lines.slice(1).map((l) => {
    const parts = l.trim().split(/\s{2,}/).filter(Boolean);
    return Array.from({ length: cols }, (_, i) => ({ text: parts[i] || "" }));
  });
  return { headers: [heads], rows: b };
}

const fmtLbl: Record<DetectedFormat, string> = {
  HTML: "HTML-таблица", ExcelTSV: "Excel / Google Таблицы", CSV: "CSV-файл", Markdown: "Markdown", unknown: "Неизвестный",
};

const S = (s: React.CSSProperties) => s;

export default function TablesPage() {
  const [input, setInput] = useState("");
  const [url, setUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [tableIndex, setTableIndex] = useState(0);
  const [parsed, setParsed] = useState<TableData[] | null>(null);
  const [detected, setDetected] = useState<DetectedFormat>("unknown");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");

  const handlePaste = useCallback((val: string) => {
    setInput(val);
    if (!val.trim()) { setDetected("unknown"); setParsed(null); setError(""); return; }
    setDetected(detectFormat(val));
    setError("");
  }, []);

  const parseInput = useCallback(() => {
    setError(""); setParsed(null);
    const val = input.trim();
    if (!val) { setError("Вставьте данные"); return; }
    try {
      let r: TableData;
      const f = detectFormat(val);
      if (f === "HTML") r = parseHTML(val);
      else if (f === "ExcelTSV") r = parseDelimited(val, "\t");
      else if (f === "CSV") r = parseDelimited(val, ",");
      else if (f === "Markdown") r = parseMarkdown(val);
      else r = parseSpaces(val);
      setParsed([r]);
      setTableIndex(0);
    } catch (e: any) { setError(e.message || "Ошибка"); }
  }, [input]);

  const fetchUrl = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true); setError(""); setParsed(null);
    try {
      const r = await fetch("/api/fetch-url?url=" + encodeURIComponent(url));
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      setInput(""); setDetected("HTML");
      setParsed([parseHTML(d.html)]);
      setTableIndex(0);
    } catch (e: any) { setError(String(e)); }
    finally { setLoading(false); }
  }, [url]);

  const ct = useMemo(() => {
    if (!parsed || !parsed.length) return null;
    return parsed[tableIndex] ?? null;
  }, [parsed, tableIndex]);

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const copyText = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const exportHtml = useCallback(() => {
    if (!ct) return;
    const hd = ct.headers.length ? ct.headers : [];
    const lines: string[] = [];
    lines.push("<div style=\"overflow-x:auto;max-width:100%;\">");
    lines.push("<table style=\"border-collapse:collapse;width:100%;font-size:14px;\">");
    if (hd.length) {
      lines.push("  <thead>");
      hd.forEach((hr) => {
        lines.push("    <tr>");
        hr.forEach((c) => lines.push("      <th style=\"border:1px solid #d1d5db;padding:10px 12px;text-align:left;font-weight:700;background:#f3f4f6;\">" + esc(c) + "</th>"));
        lines.push("    </tr>");
      });
      lines.push("  </thead>");
    }
    lines.push("  <tbody>");
    ct.rows.forEach((r) => {
      lines.push("    <tr>");
      r.forEach((c) => lines.push("      <td style=\"border:1px solid #d1d5db;padding:8px 12px;\">" + esc(c.text) + "</td>"));
      lines.push("    </tr>");
    });
    lines.push("  </tbody>");
    lines.push("</table>");
    lines.push("</div>");
    copyText(lines.join("\n"), "html");
  }, [ct]);

  const exportCsv = useCallback(() => {
    if (!ct) return;
    const all = [...ct.headers, ...ct.rows.map((r) => r.map((c) => c.text))];
    copyText(all.map((r) => r.map((c) => '"' + (c || "").replace(/"/g, '""') + '"').join(",")).join("\n"), "csv");
  }, [ct]);

  const exportJson = useCallback(() => {
    if (!ct) return;
    const keys: string[] = [];
    if (ct.headers.length) {
      ct.headers.forEach((hr) => { hr.forEach((h, ci) => { if (h) keys[ci] = (keys[ci] || "") + (keys[ci] ? " " : "") + h; }); });
    } else {
      ct.rows[0]?.forEach((_, i) => { keys[i] = "col_" + (i + 1); });
    }
    const data = ct.rows.map((r) => { const o: Record<string, string> = {}; keys.forEach((k, i) => { o[k] = r[i]?.text ?? ""; }); return o; });
    copyText(JSON.stringify(data, null, 2), "json");
  }, [ct]);

  return (
    <div style={S({ maxWidth: 1000, margin: "0 auto", padding: "clamp(24px,5vw,48px) clamp(16px,4vw,32px)", color: "#e2e8f0", fontFamily: "system-ui,sans-serif" })}>
      <div style={S({ marginBottom: 32 })}>
        <div style={S({ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.28em", color: "#475569", marginBottom: 8 })}>Инструмент</div>
        <h1 style={S({ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", color: "#fff", margin: "0 0 8px" })}>Парсер таблиц</h1>
        <p style={S({ fontSize: 14, lineHeight: 1.6, color: "#94a3b8", margin: 0, maxWidth: 600 })}>Скопируйте таблицу откуда угодно и вставьте сюда. Инструмент сам определит формат и покажет результат.</p>
      </div>

      <textarea value={input} onChange={(e) => handlePaste(e.target.value)}
        placeholder="Вставьте таблицу (Ctrl+V) из Excel, Google Таблиц, сайта..."
        rows={8}
        style={S({ width: "100%", padding: 14, fontSize: 13, fontFamily: "ui-monospace,monospace", lineHeight: 1.6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#e2e8f0", resize: "vertical", outline: "none", boxSizing: "border-box" })}
      />

      {detected !== "unknown" && (
        <div style={S({ marginTop: 10, fontSize: 12, color: "#94a3b8" })}>
          <span>Распознан формат: <strong style={{ color: "#f6c47b" }}>{fmtLbl[detected]}</strong></span>
        </div>
      )}

      <div style={S({ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" })}>
        <button onClick={parseInput} disabled={!input.trim()}
          style={S({ padding: "10px 28px", fontSize: 13, fontWeight: 600, background: !input.trim() ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#f6c47b,#ffe0b2)", color: !input.trim() ? "#475569" : "#0a1622", border: "none", borderRadius: 6, cursor: !input.trim() ? "not-allowed" : "pointer" })}
        >Разобрать</button>
        <button onClick={() => setShowUrl(!showUrl)}
          style={S({ padding: "10px 20px", fontSize: 13, fontWeight: 500, background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, cursor: "pointer" })}
        >{showUrl ? "Скрыть" : "Загрузить по ссылке"}</button>
      </div>

      {showUrl && (
        <div style={S({ display: "flex", gap: 8, marginTop: 12 })}>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/page.html"
            style={S({ flex: 1, padding: "10px 14px", fontSize: 13, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#e2e8f0", outline: "none" })}
          />
          <button onClick={fetchUrl} disabled={loading || !url.trim()}
            style={S({ padding: "10px 24px", fontSize: 13, fontWeight: 600, background: loading ? "rgba(246,196,123,0.3)" : "#f6c47b", color: loading ? "#94a3b8" : "#0a1622", border: "none", borderRadius: 6, cursor: loading ? "wait" : "pointer" })}
          >{loading ? "Загрузка..." : "Загрузить"}</button>
        </div>
      )}

      {error && <div style={S({ marginTop: 16, padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, color: "#f87171", fontSize: 13 })}>{error}</div>}

      {parsed && parsed.length > 0 && (
        <div style={S({ marginTop: 24 })}>
          <div style={S({ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 })}>
            <div style={S({ fontSize: 12, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" })}>
              Просмотр
              <span style={S({ color: "#475569", marginLeft: 8, fontWeight: 400, textTransform: "none" })}>
                ({ct?.headers.length ?? 0} заголовков, {ct?.rows.length ?? 0} строк)
              </span>
            </div>
            <div style={S({ display: "flex", gap: 6 })}>
              {[["html", "HTML"], ["csv", "CSV"], ["json", "JSON"]].map(([fmt, label]) => (
                <button key={fmt} onClick={() => { if (fmt === "html") exportHtml(); if (fmt === "csv") exportCsv(); if (fmt === "json") exportJson(); }}
                  style={S({ padding: "7px 16px", fontSize: 12, fontWeight: 600, background: copied === fmt ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)", border: copied === fmt ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: copied === fmt ? "#22c55e" : "#94a3b8", cursor: "pointer" })}
                >{copied === fmt ? "Скопировано" : label}</button>
              ))}
            </div>
          </div>
          <div style={S({ overflowX: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, background: "rgba(255,255,255,0.02)" })}>
            <table style={S({ borderCollapse: "collapse", width: "100%", fontSize: 13, minWidth: 400 })}>
              {ct && ct.headers.length > 0 && (
                <thead>{ct.headers.map((hrow, ri) => (
                  <tr key={ri}>{hrow.map((h, ci) => (
                    <th key={ci} style={S({ border: "1px solid rgba(255,255,255,0.08)", padding: "10px 12px", textAlign: "left", fontWeight: 700, background: "rgba(255,255,255,0.04)", color: "#e2e8f0", fontSize: 12, whiteSpace: "nowrap" })}>{h || "\u00A0"}</th>
                  ))}</tr>
                ))}</thead>
              )}
              <tbody>{ct?.rows.map((row, ri) => (
                <tr key={ri} style={S({ borderBottom: "1px solid rgba(255,255,255,0.04)" })}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={S({ border: "1px solid rgba(255,255,255,0.04)", padding: "8px 12px", color: "#cbd5e1", fontSize: 13 })}>{cell.text || "\u00A0"}</td>
                  ))}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      <div style={S({ marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 })}>
        <button onClick={() => setShowManual(!showManual)}
          style={S({ padding: "10px 20px", fontSize: 13, fontWeight: 500, background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, cursor: "pointer", width: "100%", textAlign: "center" })}
        >{showManual ? "Скрыть инструкцию" : "Как пользоваться (инструкция для новичков)"}</button>

        {showManual && (
          <div style={S({ marginTop: 16, padding: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, fontSize: 13, lineHeight: 1.7, color: "#94a3b8" })}>

            <p><strong style={{ color: "#e2e8f0" }}>Парсер таблиц</strong> — это простой инструмент, который извлекает таблицы из любого источника: Excel, Google Таблицы, веб-страницы, CSV-файлы, Markdown и даже обычный текст.</p>

            <h3 style={S({ color: "#f6c47b", fontSize: 14, margin: "24px 0 8px", fontWeight: 700 })}>Способ 1: Вставить таблицу (самый простой)</h3>
            <ol style={S({ margin: "4px 0 0", paddingLeft: 20 })}>
              <li style={{ marginBottom: 6 }}>Выделите таблицу в любом приложении (Excel, Word, Google Таблицы, браузер) и нажмите <strong style={{ color: "#e2e8f0" }}>Ctrl+C</strong> (или ПКМ → Копировать).</li>
              <li style={{ marginBottom: 6 }}>Кликните в поле ввода выше и нажмите <strong style={{ color: "#e2e8f0" }}>Ctrl+V</strong>.</li>
              <li style={{ marginBottom: 6 }}>Инструмент автоматически определит формат данных и покажет его название.</li>
              <li>Нажмите кнопку <strong style={{ color: "#e2e8f0" }}>Разобрать</strong>.</li>
            </ol>

            <h3 style={S({ color: "#f6c47b", fontSize: 14, margin: "24px 0 8px", fontWeight: 700 })}>Способ 2: Загрузить по ссылке</h3>
            <ol style={S({ margin: "4px 0 0", paddingLeft: 20 })}>
              <li style={{ marginBottom: 6 }}>Нажмите <strong style={{ color: "#e2e8f0" }}>Загрузить по ссылке</strong>.</li>
              <li style={{ marginBottom: 6 }}>Вставьте адрес страницы, на которой есть таблица.</li>
              <li>Нажмите <strong style={{ color: "#e2e8f0" }}>Загрузить</strong> — таблица будет найдена и показана.</li>
            </ol>

            <h3 style={S({ color: "#f6c47b", fontSize: 14, margin: "24px 0 8px", fontWeight: 700 })}>Какие форматы поддерживаются</h3>
            <table style={S({ borderCollapse: "collapse", fontSize: 12, marginTop: 8, width: "100%" })}>
              <thead>
                <tr>
                  <th style={S({ border: "1px solid rgba(255,255,255,0.08)", padding: "8px 10px", textAlign: "left", fontWeight: 700, background: "rgba(255,255,255,0.04)", color: "#e2e8f0" })}>Формат</th>
                  <th style={S({ border: "1px solid rgba(255,255,255,0.08)", padding: "8px 10px", textAlign: "left", fontWeight: 700, background: "rgba(255,255,255,0.04)", color: "#e2e8f0" })}>Откуда брать</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["HTML-таблица", "Любой сайт, веб-страница с таблицей"],
                  ["Excel / Google Таблицы", "Скопировать ячейки из Excel, Google Таблиц, Numbers"],
                  ["CSV-файл", "Экспорт из банков, CRM, 1С, бухгалтерских программ"],
                  ["Markdown", "GitHub, редакторы Obsidian, Notion"],
                  ["Текст с пробелами", "Терминал, логи, консольные отчёты"],
                ].map(([fmt, src], i) => (
                  <tr key={i}>
                    <td style={S({ border: "1px solid rgba(255,255,255,0.04)", padding: "6px 10px", color: "#e2e8f0" })}>{fmt}</td>
                    <td style={S({ border: "1px solid rgba(255,255,255,0.04)", padding: "6px 10px", color: "#94a3b8" })}>{src}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={S({ color: "#f6c47b", fontSize: 14, margin: "24px 0 8px", fontWeight: 700 })}>Как сохранить результат</h3>
            <p style={{ margin: "4px 0 0" }}>После разбора таблицы вы можете скопировать её в одном из трёх форматов:</p>
            <ul style={S({ margin: "4px 0 0", paddingLeft: 20 })}>
              <li style={{ marginBottom: 4 }}><strong style={{ color: "#e2e8f0" }}>HTML</strong> — для вставки на сайт (Tilda, WordPress и др.). Код адаптивный: на мобильных устройствах таблица будет прокручиваться.</li>
              <li style={{ marginBottom: 4 }}><strong style={{ color: "#e2e8f0" }}>CSV</strong> — для Excel, Google Таблиц, 1С и любых программ.</li>
              <li><strong style={{ color: "#e2e8f0" }}>JSON</strong> — для разработчиков: можно использовать в коде или API.</li>
            </ul>

            <h3 style={S({ color: "#f6c47b", fontSize: 14, margin: "24px 0 8px", fontWeight: 700 })}>Как вставить на Tilda</h3>
            <ol style={S({ margin: "4px 0 0", paddingLeft: 20 })}>
              <li style={{ marginBottom: 6 }}>Разберите таблицу и нажмите <strong style={{ color: "#e2e8f0" }}>HTML</strong> — код скопируется в буфер обмена.</li>
              <li style={{ marginBottom: 6 }}>В Tilda откройте редактор страницы.</li>
              <li style={{ marginBottom: 6 }}>Добавьте блок <strong style={{ color: "#e2e8f0" }}>Другой код</strong> (категория «Другое»).</li>
              <li style={{ marginBottom: 6 }}>Вставьте скопированный код (Ctrl+V).</li>
              <li>Сохраните блок и опубликуйте страницу. Таблица будет отображаться корректно на всех устройствах.</li>
            </ol>
          </div>
        )}
      </div>

      <style>{`
        textarea::placeholder { color: #334155; }
        input::placeholder { color: #334155; }
        textarea:focus, input:focus { border-color: rgba(246,196,123,0.3) !important; }
      `}</style>
    </div>
  );
}