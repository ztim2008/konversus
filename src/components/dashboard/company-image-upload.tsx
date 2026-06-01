"use client";

import { useRef, useState } from "react";

type Props = {
  currentUrl?: string | null;
  inputName?: string;
};

export function CompanyImageUpload({ currentUrl, inputName = "previewImageUrl" }: Props) {
  const [url, setUrl] = useState<string | null>(currentUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("image", file);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json() as { url?: string; error?: string };

      if (!res.ok || !json.url) {
        setError(json.error ?? "Ошибка загрузки");
      } else {
        setUrl(json.url);
      }
    } catch {
      setError("Не удалось загрузить файл");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="db-img-upload">
      {/* Hidden input that goes with the Server Action form */}
      <input type="hidden" name={inputName} value={url ?? ""} />

      <button
        type="button"
        className="db-img-upload__thumb"
        onClick={() => fileRef.current?.click()}
        title="Загрузить фото"
      >
        {loading ? (
          <span className="db-img-upload__spinner" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Превью компании" className="db-img-upload__img" />
        ) : (
          <span className="db-img-upload__placeholder">Нет фото</span>
        )}
        <span className="db-img-upload__overlay">↑</span>
      </button>

      {error && <div className="db-img-upload__error">{error}</div>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  );
}
