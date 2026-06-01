"use client";

import { useState, useTransition } from "react";
import { submitFeedbackAction } from "./actions";

type FeedbackFormProps = {
  slug: string;
};

const AUTHOR_PHOTO = "https://konversus.ru/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg";
const AUTHOR_NAME = "Дизайнер Тимофеев Алексей";
const AUTHOR_VK = "https://vk.ru/bilarius";

export function FeedbackForm({ slug }: FeedbackFormProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (rating) formData.set("rating", String(rating));
    formData.set("slug", slug);

    startTransition(async () => {
      const result = await submitFeedbackAction(formData);
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error ?? "Ошибка отправки.");
      }
    });
  }

  const activeRating = hovered ?? rating;

  return (
    <section className="feedback-section screen-only">
      <div className="feedback-inner">

        {/* Профиль автора */}
        <div className="feedback-author">
          <a href={AUTHOR_VK} target="_blank" rel="noopener noreferrer" className="feedback-author-photo-wrap">
            <img src={AUTHOR_PHOTO} alt={AUTHOR_NAME} className="feedback-author-photo" />
          </a>
          <div className="feedback-author-info">
            <a href={AUTHOR_VK} target="_blank" rel="noopener noreferrer" className="feedback-author-name">
              {AUTHOR_NAME}
              <svg className="feedback-vk-icon" viewBox="0 0 24 24" fill="currentColor" width="15" height="15" aria-hidden="true">
                <path d="M21.547 7h-3.29a.743.743 0 0 0-.655.392s-1.312 2.416-1.79 3.209c-1.373 2.3-1.953 2.543-2.18 2.394-.524-.33-.395-1.38-.395-2.116V7.335C13.237 7 13 7 12.5 7h-3.86c-.37 0-.59.28-.59.59 0 .617.908.76.999 2.497v3.764c0 .657-.118.776-.381.776-.698 0-2.393-2.426-3.396-5.199C4.86 7.867 4.741 7 4.048 7H.757C.34 7 0 7.34 0 7.757c0 .424.074 1.248.737 3.051C1.968 14.47 5.666 19 9.555 19c2.179 0 2.447-.49 2.447-1.334v-1.667c0-.418.088-.5.38-.5.215 0 .586.108 1.45 1.08C14.954 17.852 15.437 19 16.212 19h3.29c.418 0 .628-.209.507-.619-.243-.794-2.757-3.38-2.872-3.538-.215-.277-.157-.4 0-.647 0 0 2.478-3.487 2.736-4.671.118-.42 0-.525-.47-.525z"/>
              </svg>
            </a>
            <div className="feedback-author-role">Буду рад вашей обратной связи</div>
          </div>
        </div>

        {submitted ? (
          <div className="feedback-thanks">
            <div className="feedback-thanks-icon">✓</div>
            <div className="feedback-thanks-title">Спасибо за отзыв</div>
            <div className="feedback-thanks-copy">Ваш комментарий получен и виден только мне.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="feedback-title">Оставьте отзыв о концепте</div>

            {/* Звёзды */}
            <div className="feedback-stars" role="group" aria-label="Ваша оценка">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`feedback-star${activeRating !== null && star <= activeRating ? " is-active" : ""}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(null)}
                  aria-label={`${star} звезд`}
                >
                  ★
                </button>
              ))}
              {rating && (
                <span className="feedback-stars-label">
                  {["", "Плохо", "Ниже ожиданий", "Нормально", "Хорошо", "Отлично"][rating]}
                </span>
              )}
            </div>

            {/* Имя */}
            <label className="feedback-field">
              <span className="feedback-label">Ваше имя <span style={{ opacity: 0.45 }}>(необязательно)</span></span>
              <input className="feedback-input" type="text" name="authorName" placeholder="Иван Иванов" maxLength={120} />
            </label>

            {/* Комментарий */}
            <label className="feedback-field">
              <span className="feedback-label">Комментарий <span style={{ opacity: 0.45 }}>(необязательно)</span></span>
              <textarea
                className="feedback-textarea"
                name="comment"
                placeholder="Что понравилось, что можно изменить..."
                maxLength={2000}
                rows={4}
              />
            </label>

            {error && <div className="feedback-error">{error}</div>}

            <button
              className="feedback-submit"
              type="submit"
              disabled={isPending}
            >
              {isPending ? "Отправляю..." : "Отправить отзыв"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
