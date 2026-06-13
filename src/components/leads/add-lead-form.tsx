"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function AddLeadForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const url = fd.get("url") as string;
    const company_name = fd.get("company_name") as string;

    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, company_name: company_name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сервера");
      setSuccess(true);
      formRef.current?.reset();
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lh-add-wrap">
      <button
        className="lh-btn lh-btn-primary"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "✕ Закрыть" : "+ Добавить лид"}
      </button>

      {open && (
        <div className="lh-add-form-wrap">
          <form ref={formRef} className="lh-add-form" onSubmit={handleSubmit}>
            <div className="lh-form-field">
              <label className="lh-form-label">URL сайта *</label>
              <input
                type="url"
                name="url"
                required
                placeholder="https://example.ru"
                className="lh-form-input"
                disabled={loading}
              />
            </div>
            <div className="lh-form-field">
              <label className="lh-form-label">Название компании</label>
              <input
                type="text"
                name="company_name"
                placeholder="Необязательно — определится автоматически"
                className="lh-form-input"
                disabled={loading}
              />
            </div>
            {error && <div className="lh-form-error">{error}</div>}
            {success && (
              <div className="lh-form-success">
                ✓ Лид добавлен, анализ запущен
              </div>
            )}
            <button
              type="submit"
              className="lh-btn lh-btn-primary"
              style={{ width: "100%" }}
              disabled={loading}
            >
              {loading ? "Запускаем анализ..." : "Запустить анализ →"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
