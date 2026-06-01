import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — Страница не найдена",
  description: "Такой страницы не существует или она была перемещена. Вернитесь на главную.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="fpb-404">
      <div className="fpb-404__watermark">404</div>

      <div className="fpb-404__center">
        <div className="fpb-404__badge">
          <span className="fpb-404__badge-mark">КВ</span>
          <span className="fpb-404__badge-name">Студия КОНВЕРСУС</span>
        </div>

        <h1 className="fpb-404__title">Страница не найдена</h1>
        <p className="fpb-404__text">
          Такой адрес не существует или был перемещён.<br />
          Возможно, ссылка устарела — проверьте URL или вернитесь на главную.
        </p>

        <div className="fpb-404__actions">
          <Link className="fpb-404__btn-primary" href="https://konversus.ru">
            На главную
          </Link>
          <Link className="fpb-404__btn-ghost" href="https://t.me/bilarius">
            Написать в Telegram
          </Link>
        </div>
      </div>

      <footer className="fpb-404__footer">
        <span className="fpb-404__footer-copy">© {new Date().getFullYear()} Студия КОНВЕРСУС</span>
        <a className="fpb-404__footer-link" href="https://konversus.ru">konversus.ru</a>
      </footer>
    </div>
  );
}
