"use client";

import { useMemo, useState } from "react";
import { Mail } from "lucide-react";

import {
  catalogLetterSubject,
  catalogLetterText,
} from "@/lib/lead-radar/catalog-letter";

type EditorSite = {
  id: string;
  domain: string;
  name: string;
  email?: string | null;
  h1_text?: string | null;
  problems?: string | string[] | null;
};

function parseList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function initialFields(site: EditorSite) {
  const lines = parseList(site.problems);
  const skuLine = lines.find((line) => /^артикул\s*:/i.test(line));
  const problems = lines
    .filter((line) => line !== skuLine)
    .join(" / ")
    .trim();
  return {
    productName: (site.h1_text || "").trim(),
    sku: skuLine ? skuLine.replace(/^артикул\s*:\s*/i, "").trim() : "",
    problems,
  };
}

export function CatalogLetterEditor({
  site,
  testMode,
  onSent,
}: {
  site: EditorSite;
  testMode: boolean;
  onSent: (message: string) => void;
}) {
  const seed = initialFields(site);
  const [productName, setProductName] = useState(seed.productName);
  const [sku, setSku] = useState(seed.sku);
  const [problems, setProblems] = useState(seed.problems);
  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const preview = useMemo(() => {
    if (!productName.trim() || problems.trim().length < 8) return "";
    return catalogLetterText({ productName, sku, problems });
  }, [productName, sku, problems]);

  const ready =
    !!site.email &&
    productName.trim().length > 1 &&
    problems.trim().length >= 8 &&
    !!before &&
    !!after &&
    !sending;

  async function send() {
    if (!ready || !before || !after) return;
    const target = testMode ? "себе, тестовым письмом" : site.email;
    if (!confirm(`Отправить письмо с двумя фото на ${target}?`)) return;

    setSending(true);
    setError("");
    try {
      const body = new FormData();
      body.set("siteId", site.id);
      body.set("productName", productName.trim());
      body.set("sku", sku.trim());
      body.set("problems", problems.trim());
      body.set("testMode", testMode ? "1" : "0");
      body.set("before", before);
      body.set("after", after);
      const res = await fetch("/api/lead-radar/catalog-letter", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Не отправилось");
      }
      onSent(`Письмо ушло на ${data.sentTo} · ${site.domain}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  }

  const subject = productName.trim()
    ? catalogLetterSubject(productName)
    : "Тема появится, когда будет название товара";

  return (
    <div
      className="rounded-xl border border-white/10 bg-black/20 p-3"
      onClick={(event) => event.stopPropagation()}
    >
      <p className="text-xs text-gray-400">
        Письмо Алексея. Уходит только отсюда, когда загружены «было» и «стало».
      </p>
      <p className="mt-2 text-xs text-gray-500">
        Тема: <span className="text-gray-300">{subject}</span>
      </p>
      <div className="mt-3 grid gap-2">
        <label className="block text-xs text-gray-500">
          Название товара
          <input
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-gray-500">
          Артикул, если есть
          <input
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-gray-500">
          1–2 проблемы с фото
          <textarea
            value={problems}
            onChange={(event) => setProblems(event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs text-gray-500">
            Было
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => setBefore(event.target.files?.[0] || null)}
              className="mt-1 block w-full text-xs text-gray-300"
            />
          </label>
          <label className="block text-xs text-gray-500">
            Стало
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => setAfter(event.target.files?.[0] || null)}
              className="mt-1 block w-full text-xs text-gray-300"
            />
          </label>
        </div>
      </div>
      {preview ? (
        <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-gray-300">
          {preview}
        </pre>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
      <button
        type="button"
        disabled={!ready}
        onClick={() => void send()}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        <Mail size={14} />
        {sending ? "Отправляем…" : testMode ? "Тест с фото" : "Отправить с фото"}
      </button>
    </div>
  );
}
