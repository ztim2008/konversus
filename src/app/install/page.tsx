import type { Metadata } from "next";
import Link from "next/link";
import { InstallCodePanel } from "@/components/install/install-code-panel";

export const metadata: Metadata = {
  title: "Установить виджет · AI Architect",
  description:
    "Добавьте виджет «Карта роста бизнеса» на свой сайт — два тега HTML, никаких зависимостей.",
  robots: { index: true, follow: true },
};

const STEPS = [
  {
    num: "01",
    title: "Скопируйте код",
    desc: "Выберите тему и ширину, нажмите «Копировать код».",
  },
  {
    num: "02",
    title: "Вставьте на сайт",
    desc: "Добавьте код в HTML-страницу — в любое место body.",
  },
  {
    num: "03",
    title: "Готово",
    desc: "Виджет загружается автоматически. Никаких сборщиков, npm или API-ключей.",
  },
];

export default function InstallPage() {
  return (
    <main className="inst-page">
      <div className="inst-inner">

        {/* Back */}
        <Link href="/architect" className="inst-back">
          ← Назад к анализу
        </Link>

        {/* Hero */}
        <div className="inst-hero">
          <div className="inst-hero-badge">Виджет</div>
          <h1 className="inst-hero-title">
            Установите на&nbsp;свой сайт
          </h1>
          <p className="inst-hero-sub">
            Два тега HTML — и виджет «Карта роста бизнеса» появляется на вашем сайте.
            Никаких библиотек, токенов и серверной части.
          </p>
        </div>

        {/* Steps */}
        <div className="inst-steps">
          {STEPS.map((s) => (
            <div key={s.num} className="inst-step">
              <div className="inst-step-num">{s.num}</div>
              <div className="inst-step-title">{s.title}</div>
              <div className="inst-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Code panel */}
        <div className="inst-panel-wrap">
          <div className="inst-panel-title">Настройте и скопируйте код</div>
          <InstallCodePanel />
        </div>

        {/* Notes */}
        <div className="inst-notes">
          <div className="inst-note">
            <span className="inst-note-icon">⚡</span>
            <div>
              <strong>Скорость</strong> — виджет загружается асинхронно и не блокирует рендер страницы.
            </div>
          </div>
          <div className="inst-note">
            <span className="inst-note-icon">🎨</span>
            <div>
              <strong>Тема</strong> — переключается через <code>data-theme="light"</code> или{" "}
              <code>data-theme="dark"</code>.
            </div>
          </div>
          <div className="inst-note">
            <span className="inst-note-icon">📐</span>
            <div>
              <strong>Ширина</strong> — по умолчанию 560px по центру. Добавьте{" "}
              <code>data-width="full"</code>, чтобы растянуть на всю ширину блока.
            </div>
          </div>
          <div className="inst-note">
            <span className="inst-note-icon">🫧</span>
            <div>
              <strong>Плавающая кнопка</strong> — выберите режим «Плавающая кнопка», и виджет
              появится как кнопка снизу справа (как онлайн-чат). Один скрипт, ничего не ломает,
              можно убрать в любой момент.
            </div>
          </div>
          <div className="inst-note">
            <span className="inst-note-icon">🔌</span>
            <div>
              <strong>Контейнер</strong> — хотите разместить в нестандартном месте? Используйте{" "}
              <code>data-container="ваш-id"</code> и div с этим id.
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
