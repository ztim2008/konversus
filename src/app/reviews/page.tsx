import Link from "next/link";

import { getAllFeedback } from "@/lib/data/feedback";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Отзывы клиентов · Тимофеев Алексей",
  description:
    "Реальные отзывы клиентов о цифровой упаковке производственных компаний. Тимофеев Алексей — UX/UI-дизайнер и web-разработчик, 17 лет в digital.",
};

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? "text-amber-300" : "text-white/10"}>
          ★
        </span>
      ))}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ReviewsPage() {
  const allFeedback = await getAllFeedback(200);
  const withContent = allFeedback.filter((f) => f.comment || f.rating);

  const totalCount = withContent.length;
  const withRating = withContent.filter((f) => f.rating);
  const avgRating =
    withRating.length > 0
      ? Math.round((withRating.reduce((s, f) => s + f.rating!, 0) / withRating.length) * 10) / 10
      : null;

  return (
    <div className="fpb-page" style={{ background: "var(--background)", minHeight: "100vh" }}>
      {/* Шапка */}
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "16px clamp(20px, 5vw, 48px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(246,196,123,0.2)",
              background: "linear-gradient(135deg,rgba(246,196,123,0.2),rgba(152,209,255,0.12))",
              fontWeight: 700,
              fontSize: "11px",
              letterSpacing: "0.2em",
              color: "#f3f5f7",
              flexShrink: 0,
            }}
          >
            ТА
          </div>
          <div style={{ fontSize: "13px", color: "#94a3b8" }}>konversus.ru</div>
        </Link>
        <Link
          href="/#contacts"
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#f6c47b",
            textDecoration: "none",
            border: "1px solid rgba(246,196,123,0.2)",
            padding: "8px 18px",
          }}
        >
          Обсудить проект
        </Link>
      </header>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "clamp(32px, 6vw, 64px) clamp(20px, 5vw, 40px)" }}>

        {/* Заголовок */}
        <div style={{ marginBottom: "48px" }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.28em",
              color: "#475569",
              marginBottom: "12px",
            }}
          >
            Отзывы клиентов
          </div>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: 800,
              lineHeight: "0.95",
              letterSpacing: "-0.04em",
              color: "#fff",
              margin: "0 0 16px",
            }}
          >
            Что говорят клиенты
          </h1>
          <p style={{ fontSize: "15px", lineHeight: "1.7", color: "#94a3b8", maxWidth: "560px" }}>
            Тимофеев Алексей — UX/UI-дизайнер и web-разработчик. 17 лет создаю digital-проекты для производственных компаний.
          </p>

          {/* Итоговые цифры */}
          <div
            style={{
              display: "flex",
              gap: "0",
              marginTop: "32px",
              flexWrap: "wrap",
            }}
          >
            {[
              { v: `${totalCount}`, l: "отзывов" },
              { v: avgRating ? `${avgRating} ★` : "—", l: "средняя оценка" },
              { v: "250+", l: "клиентов за 17 лет" },
            ].map((s) => (
              <div
                key={s.l}
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(0,0,0,0.2)",
                  padding: "16px 24px",
                }}
              >
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                  {s.v}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Карточки отзывов */}
        {withContent.length === 0 ? (
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(0,0,0,0.15)",
              padding: "48px",
              textAlign: "center",
              color: "#475569",
            }}
          >
            Отзывы пока не поступали
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0" }}>
            {withContent.map((f) => (
              <div
                key={f.id}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  padding: "28px 0",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "16px",
                  alignItems: "start",
                }}
              >
                <div>
                  {/* Компания и концепт */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#e2e8f0",
                      }}
                    >
                      {f.companyName}
                    </span>
                    <span style={{ color: "#334155", fontSize: "11px" }}>·</span>
                    <span style={{ fontSize: "11px", color: "#475569" }}>{f.proposalTitle}</span>
                  </div>

                  {/* Оценка */}
                  {f.rating && (
                    <div style={{ marginBottom: "10px" }}>
                      <Stars rating={f.rating} />
                    </div>
                  )}

                  {/* Комментарий */}
                  {f.comment && (
                    <p
                      style={{
                        fontSize: "14px",
                        lineHeight: "1.75",
                        color: "#cbd5e1",
                        margin: 0,
                        maxWidth: "640px",
                      }}
                    >
                      «{f.comment}»
                    </p>
                  )}

                  {/* Автор и дата */}
                  <div
                    style={{
                      marginTop: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    {f.authorName && (
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#7db3ff" }}>
                        {f.authorName}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "10px",
                        color: "#334155",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {formatDate(f.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div
          style={{
            marginTop: "64px",
            border: "1px solid rgba(246,196,123,0.15)",
            background: "rgba(246,196,123,0.04)",
            padding: "32px 40px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>
              Хотите такой же результат?
            </div>
            <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "6px" }}>
              Расскажу что можно сделать с вашим производством — бесплатный разбор
            </div>
          </div>
          <Link
            href="/#contacts"
            style={{
              background: "linear-gradient(135deg,#f6c47b,#ffe0b2)",
              color: "#0a1622",
              fontWeight: 700,
              fontSize: "14px",
              padding: "12px 28px",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            Обсудить проект
          </Link>
        </div>

      </div>
    </div>
  );
}
