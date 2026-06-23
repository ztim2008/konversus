"use client";

import { useState } from "react";
import { Search, AlertTriangle, CheckCircle, Info, ExternalLink, Shield, Smartphone, Zap, FileText } from "lucide-react";

interface ScanResult {
  url: string;
  scannedAt: string;
  problems: { id: string; severity: string; category: string; title: string; description: string; detail?: string; priceFrom?: number; priceTo?: number; loss?: string }[];
  score: number;
}

const CAT_ICONS: Record<string, any> = {
  "SEO": FileText,
  "Безопасность": Shield,
  "Скорость": Zap,
  "Мобильность": Smartphone,
};

export function AuditorForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch {
      setError("Не удалось подключиться к серверу");
    }
    setLoading(false);
  }

  const critical = result?.problems.filter(p => p.severity === "critical") || [];
  const warnings = result?.problems.filter(p => p.severity === "warning") || [];
  const ok = result?.problems.filter(p => p.severity === "ok") || [];
  const totalPriceFrom = [...critical, ...warnings].reduce((sum, p) => sum + (p.priceFrom || 0), 0);
  const totalPriceTo = [...critical, ...warnings].reduce((sum, p) => sum + (p.priceTo || 0), 0);

  return (
    <div>
      {/* Input */}
      <form onSubmit={handleScan} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          type="text" value={url} onChange={e => setUrl(e.target.value)}
          placeholder="Введите адрес сайта: example.ru"
          style={{
            flex: 1, padding: "14px 18px", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
            color: "#fafafa", fontSize: "clamp(0.9rem, 3vw, 1rem)", outline: "none",
          }}
        />
        <button type="submit" disabled={loading}
          style={{
            padding: "14px 24px", borderRadius: 12, border: "none",
            background: loading ? "rgba(34,197,94,0.3)" : "#22c55e",
            color: "#fff", fontWeight: 700, fontSize: "clamp(0.85rem, 2.5vw, 0.95rem)",
            cursor: loading ? "wait" : "pointer", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <Search size={18} />
          {loading ? "Проверяю..." : "Проверить"}
        </button>
      </form>

      {error && (
        <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.9rem", marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Score */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.2rem",
              background: result.score >= 80 ? "rgba(34,197,94,0.15)" : result.score >= 50 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
              color: result.score >= 80 ? "#22c55e" : result.score >= 50 ? "#f59e0b" : "#ef4444",
            }}>
              {result.score}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "clamp(1rem, 3.5vw, 1.2rem)", color: "#fafafa" }}>
                {result.score >= 80 ? "Сайт в хорошем состоянии" : result.score >= 50 ? "Есть над чем работать" : "Требуется срочное вмешательство"}
              </p>
              <p style={{ fontSize: "0.8rem", color: "#71717a" }}>
                {result.url} · проверен {new Date(result.scannedAt).toLocaleString("ru")}
              </p>
            </div>
          </div>

          {/* Problems */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...critical, ...warnings, ...ok].map(p => {
              const SevIcon = p.severity === "critical" ? AlertTriangle : p.severity === "warning" ? Info : CheckCircle;
              const sevColor = p.severity === "critical" ? "#ef4444" : p.severity === "warning" ? "#f59e0b" : "#22c55e";
              const sevBg = p.severity === "critical" ? "rgba(239,68,68,0.08)" : p.severity === "warning" ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.05)";
              const CatIcon = CAT_ICONS[p.category] || FileText;

              return (
                <div key={p.id} style={{ padding: "16px 18px", borderRadius: 12, background: sevBg, border: `1px solid ${sevColor}15` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <SevIcon size={18} style={{ color: sevColor, marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "clamp(0.85rem, 3vw, 0.95rem)", color: "#fafafa" }}>{p.title}</span>
                        <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 100, background: "rgba(255,255,255,0.06)", color: "#a1a1aa", display: "flex", alignItems: "center", gap: 4 }}>
                          <CatIcon size={10} /> {p.category}
                        </span>
                      </div>
                      <p style={{ fontSize: "clamp(0.8rem, 2.5vw, 0.9rem)", color: "#a1a1aa", lineHeight: 1.6, marginBottom: p.loss ? 6 : 0 }}>
                        {p.description}
                      </p>
                      {p.loss && (
                        <p style={{ fontSize: "0.8rem", color: sevColor, fontWeight: 500, marginBottom: p.priceFrom ? 4 : 0 }}>
                          ⚠️ {p.loss}
                        </p>
                      )}
                      {p.priceFrom && (
                        <p style={{ fontSize: "0.85rem", color: "#fafafa", fontWeight: 600, marginTop: 6 }}>
                          Исправить: {p.priceFrom.toLocaleString()} – {p.priceTo?.toLocaleString()} ₽
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total price */}
          {totalPriceFrom > 0 && (
            <div style={{ marginTop: 20, padding: "20px 22px", borderRadius: 14, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", textAlign: "center" }}>
              <p style={{ fontSize: "0.85rem", color: "#a1a1aa", marginBottom: 4 }}>
                Примерная стоимость исправления всех проблем
              </p>
              <p style={{ fontSize: "clamp(1.2rem, 4vw, 1.5rem)", fontWeight: 800, color: "#22c55e" }}>
                от {totalPriceFrom.toLocaleString()} до {totalPriceTo.toLocaleString()} ₽
              </p>
              <p style={{ fontSize: "0.75rem", color: "#52525b", marginTop: 6 }}>
                ⚠️ Цены ориентировочные. Точная смета после обсуждения проекта.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
