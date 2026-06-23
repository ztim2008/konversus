"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { detectSourceType, SOURCE_TYPE_LABELS, validateUrl } from "@/lib/architect/url-detector";
import type { SourceType } from "@/lib/architect/types";

export default function ArchitectInputForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [detectedType, setDetectedType] = useState<SourceType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleUrlChange(value: string) {
    setUrl(value);
    setError("");
    if (value.trim().length > 8) {
      const trimmed = value.trim().startsWith("http") ? value.trim() : `https://${value.trim()}`;
      setDetectedType(detectSourceType(trimmed));
    } else {
      setDetectedType(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const normalized = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    if (!validateUrl(normalized)) {
      setError("Введите корректный URL");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/architect/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });
      const data = (await res.json()) as { id?: string; error?: string; redirect_url?: string };

      if (!res.ok || !data.id) {
        setError(data.error ?? "Произошла ошибка. Попробуйте снова.");
        setLoading(false);
        return;
      }

      router.push(`/architect/${data.id}`);
    } catch {
      setError("Сеть недоступна. Проверьте подключение.");
      setLoading(false);
    }
  }

  const typeLabel = detectedType ? SOURCE_TYPE_LABELS[detectedType] : null;

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
      <div className="arc-input-wrap">
        <input
          type="text"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="вставьте ссылку на бизнес..."
          className="arc-url-input"
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
        />
        <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", height: 24, display: "flex", alignItems: "center" }}>
          {typeLabel && (
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: ".05em",
              color: "#22c55e", background: "rgba(34,197,94,.12)",
              padding: "3px 8px", borderRadius: 3, whiteSpace: "nowrap",
            }}>
              {typeLabel}
            </span>
          )}
        </div>
      </div>

      {error && <p className="arc-input-error">{error}</p>}

      <button type="submit" disabled={loading || !url.trim()} className="arc-submit-btn">
        {loading ? (
          <>
            <span className="arc-spinner" />
            Запускаем анализ...
          </>
        ) : (
          "🔍 Просканировать сайт"
        )}
      </button>

      <p className="arc-input-hint">
        Поддерживаются: сайты, Ozon, Wildberries, Авито
      </p>
    </form>
  );
}
