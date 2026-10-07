import { Fragment } from "react";

export type ResumeContacts = {
  phone: string;
  phoneHref: string;
  email: string;
  telegram: string;
  telegramHref: string;
  maxHref: string;
};

const PHOTO = "/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg";
const MAX_URL = "https://max.ru/u/f9LHodD0cOLcEBDs06CKJvYgNLDUtG5shhyHj-Vd6ZhQkV6uB5UgvlCAwlE";

const PRODUCTS = [
  { title: "Konversus", href: "https://konversus.ru" },
  { title: "Leads AI", href: "https://leads.konversus.ru" },
  { title: "AI-аудитор", href: "https://konversus.ru/architect" },
  { title: "НОРДИК", href: "https://nordic-builder.ru" },
] as const;

const SITE_GROUPS = [
  {
    title: "Дома",
    items: [
      { title: "Дома из бруса", note: "под ключ, гарантия 15 лет", href: "https://clck.ru/3VJncB" },
      { title: "Дома под ключ", note: "строительство", href: "https://построим-дом.рф" },
      { title: "Дома из газобетона", note: "строительство", href: "https://русуралстрой74.рф" },
      { title: "Дома и срубы из сибирского кедра", note: "кедр", href: "https://resurssibir.ru" },
    ],
  },
  {
    title: "Бани",
    items: [
      { title: "Бани каркасные и из бруса", note: "под ключ", href: "https://stroy-banya53.ru/" },
      { title: "Бани из бруса и под усадку", note: "каркас и брус", href: "https://as-banya.ru/" },
      { title: "Бани из бруса и каркас", note: "Пестово", href: "https://bani-s-pestovo.ru/" },
      { title: "Мобильные бани", note: "под ключ", href: "https://bani53.ru/" },
      { title: "Готовые мобильные бани", note: "под ключ", href: "https://perevoznye-bani.ru/" },
      { title: "Каркасные модульные бани", note: "модули", href: "https://custombuilt.ru" },
      { title: "Модульные бани", note: "под ключ", href: "https://modulbani.ru" },
    ],
  },
  {
    title: "Кровля",
    items: [
      { title: "Кровля в Ярославле", note: "монтаж и ремонт", href: "https://jaroslavl.krovla-pro.ru/" },
      { title: "Кровля в Санкт-Петербурге", note: "под ключ", href: "https://spb.krysha-pod-klyuch.ru" },
      { title: "Строительство и кровля в Москве", note: "реконструкция, отделка, фасад", href: "https://stroylidersk.ru" },
    ],
  },
  {
    title: "Площадка и поставка",
    items: [
      { title: "Павильоны, беседки, хозблоки", note: "деревянные постройки", href: "https://zapilim.pro" },
      { title: "Доставка стройматериалов", note: "песок, щебень, бетон", href: "https://pav-96.ru" },
      { title: "Укладка асфальта", note: "Пермь, гарантия 3 года", href: "https://proasfalt159.ru/" },
      { title: "Бассейны под ключ", note: "строительство", href: "https://poolmaster.pro" },
      { title: "Демонтаж в Омске", note: "снос и вывоз", href: "https://демонтажомск.рф" },
      { title: "Тротуарная плитка в Калуге", note: "от 1050 ₽/м², гарантия 5 лет", href: "https://trotuar40.ru" },
    ],
  },
] as const;

const HOBBIES = [
  { title: "Аэрография", text: "Роспись.", href: "https://vk.ru/album4540202_28885734" },
  { title: "Графика", text: "Цифровая и печатная графика.", href: "https://vk.ru/album4540202_185378451" },
  { title: "Картины", text: "Живопись.", href: "https://vk.ru/album4540202_186725162" },
] as const;

const SKILL_LINES = [
  {
    title: "Дизайн",
    text: "Figma · Photoshop · Веб-дизайн · Графический дизайн · UX/UI · Прототипирование · Адаптивный дизайн · Дизайн-системы · Типографика · Иллюстрация · Инфографика · Векторная графика · Наставничество",
  },
  {
    title: "Разработка",
    text: "HTML · Вёрстка сайтов · Tilda · Next.js · React · WordPress · 1С-Битрикс · НОРДИК",
  },
  {
    title: "AI",
    text: "Midjourney · Runway · Kling · генерация изображений · генерация видео · AI-аватары",
  },
  {
    title: "E-commerce",
    text: "Wildberries · Ozon · Avito · Lamoda · Яндекс Маркет · Яндекс Кит · A/B-тестирование визуала",
  },
] as const;

export function ResumeSheet({ contacts }: { contacts: ResumeContacts }) {
  return (
    <article className="resume-sheet">
      <header className="resume-head">
        <img src={PHOTO} alt="Алексей Тимофеев" width={640} height={640} />
        <div>
          <h1>Алексей Тимофеев</h1>
          <p className="resume-role">Собираю digital для производств, услуг и B2B: сайты, упаковку, визуал</p>
          <p className="resume-place">Великий Новгород · удалённо, Москва</p>
          <p className="resume-contacts">
            <a href={contacts.phoneHref}>{contacts.phone}</a>
            <span aria-hidden="true"> · </span>
            <a href={contacts.telegramHref}>{contacts.telegram || "@bilarius"}</a>
            <span aria-hidden="true"> · </span>
            <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
          </p>
          <p className="resume-contacts">
            Портфолио: <a href="https://konversus.ru/portfolio/timeline">konversus.ru/portfolio/timeline</a>
            <span aria-hidden="true"> · </span>
            <a href="https://kwork.ru/user/bilarius">Kwork</a>
            <span aria-hidden="true"> · </span>
            <a href={MAX_URL}>Max</a>
            <span aria-hidden="true"> · </span>
            <a href="https://russait.ru">russait.ru</a>
          </p>
        </div>
      </header>

      <h2>Коротко</h2>
      <p>17 лет в digital. Делаю сайты, упаковку и визуал для производств, услуг и B2B — там, где нужна не «просто страница», а работающий инструмент, который приносит заявки.</p>
      <p>Сайт собираю в том стеке, который подходит задаче: свой код, конструктор или система, на которой проект уже стоит. Не навязываю лишнее — подстраиваюсь под клиента.</p>
      <p>Семь лет параллельно веду визуал для маркетплейсов: карточки, баннеры, серии. 60–70 карточек в неделю без потери качества — за счёт шаблонов, библиотек и автоматизации.</p>
      <p>AI подключаю к делу: разбор страницы, чат по материалам сайта, поиск заказов с готовым откликом. На выходе — следующее действие, не отчёт ради отчёта.</p>

      <h2>Чем занимаюсь</h2>
      <h3>Сайты. Три способа сборки под задачу:</h3>
      <p><strong>Свой код</strong> — Next.js и React, когда нужна своя логика: каталог, заявки, разбор страницы.</p>
      <p><strong>Конструктор</strong> — НОРДИК, Tilda, перенос с Craftum. Когда страницу надо собрать блоками и отдать без программиста в штате.</p>
      <p><strong>Система управления</strong> — WordPress и 1С-Битрикс, когда сайт уже на них и его доделывают, а не переписывают с нуля.</p>
      <p>На странице всегда одно и то же: что продаёте, почему вам, куда оставить заявку.</p>

      <h3>Карточки и визуал</h3>
      <p>Wildberries, Ozon, Avito, Lamoda, Яндекс Маркет, Яндекс Кит. Семь лет. Серия держит цвет товара и характеристики, слайды не спорят друг с другом. Темп — 60–70 карточек в неделю. Midjourney, Runway и Kling — когда нет съёмки, а кадр, ролик или аватар нужны. Figma и Photoshop — основная сборка макета.</p>

      <h3>Упаковка</h3>
      <p>Презентация, коммерческое предложение, баннер. Макет уезжает клиенту в переписку и читается без автора рядом.</p>

      <h3>AI</h3>
      <p>Аудит показывает, где страница теряет обращение. Чат отвечает по материалам сайта. Поиск заказов собирает площадки и готовит отклик. На выходе — следующее действие менеджера, не отчёт ради отчёта.</p>

      <h2>Опыт</h2>
      <h3>Карточки и упаковка для маркетплейсов · 7 лет</h3>
      <p>Wildberries, Ozon, Avito, Lamoda, Яндекс Маркет, Яндекс Кит. Серийный визуал: фото, инфографика, видео, аватары. С 2022 года — проектная работа для продавцов Авито: карточки, баннеры, фоны и портфолио объявлений. Инструменты для этой работы собраны на <a href="https://маркет-фон.рф">маркет-фон.рф</a>. Это не штат Авито.</p>

      <h3>Konversus — свои продукты</h3>
      <p>Сайты и упаковка для производств, услуг и B2B.</p>
      <ul>
        <li><a href="https://leads.konversus.ru">Leads AI</a> — ищет заказы и готовит отклик.</li>
        <li><a href="https://konversus.ru/architect">AI-аудитор</a> — показывает, где страница теряет заявки.</li>
        <li><a href="https://nordic-builder.ru">НОРДИК</a> — конструктор сайтов.</li>
      </ul>

      <h2>Навыки</h2>
      {SKILL_LINES.map((line) => (
        <p key={line.title}>
          <strong>{line.title}:</strong> {line.text}
        </p>
      ))}

      <h2 className="resume-next">Продукты</h2>
      <p className="resume-inline">
        {PRODUCTS.map((item, index) => (
          <Fragment key={item.href}>
            {index > 0 ? <span aria-hidden="true"> · </span> : null}
            <a href={item.href}>{item.title}</a>
          </Fragment>
        ))}
      </p>

      <h2>Сайты</h2>
      <table className="resume-sites">
        <thead>
          <tr>
            <th>Проект</th>
            <th>Что на сайте</th>
          </tr>
        </thead>
        <tbody>
          {SITE_GROUPS.map((group) => (
            <Fragment key={group.title}>
              <tr className="resume-group">
                <td colSpan={2}>{group.title}</td>
              </tr>
              {group.items.map((item) => (
                <tr key={item.href}>
                  <td>
                    <a href={item.href}>{item.title}</a>
                  </td>
                  <td>{item.note}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>

      <h2>Увлечения</h2>
      <ul>
        {HOBBIES.map((item) => (
          <li key={item.href}>
            <strong>{item.title}.</strong> {item.text} <a href={item.href}>Альбом</a>
          </li>
        ))}
      </ul>

      <h2>Дополнительно</h2>
      <p>Права категории B и C · свой автомобиль · русский — родной · гражданство: Россия · самозанятость: есть · удалённо, Москва; не готов к командировкам.</p>
    </article>
  );
}

export const resumeSheetCss = `
.resume-stage { padding: 20px 16px 72px; }
.resume-toolbar {
  width: min(680px, 100%);
  margin: 0 auto 16px;
}
.resume-toolbar a {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--foreground);
  color: var(--foreground);
  padding: 10px 16px;
  font-size: 16px;
  text-decoration: none;
}
.resume-sheet {
  width: min(680px, 100%);
  margin: 0 auto;
  background: #fff;
  color: #111;
  padding: 28px 22px 36px;
  font-family: var(--font-manrope), sans-serif;
  font-size: 17px;
  line-height: 1.5;
}
.resume-head { display: flex; gap: 20px; align-items: flex-start; }
.resume-head img {
  width: 168px;
  height: 168px;
  border-radius: 50%;
  object-fit: cover;
  object-position: center 18%;
  flex: none;
}
.resume-sheet h1 {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
  font-weight: 650;
  letter-spacing: -0.03em;
}
.resume-role { margin: 10px 0 0; font-size: 18px; line-height: 1.35; font-weight: 650; }
.resume-place { margin: 6px 0 0; font-size: 16px; color: #333; }
.resume-contacts { margin: 10px 0 0; font-size: 16px; line-height: 1.45; }
.resume-sheet h2 {
  margin: 28px 0 10px;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 650;
}
.resume-sheet h3 {
  margin: 16px 0 6px;
  font-size: 18px;
  line-height: 1.3;
  font-weight: 650;
}
.resume-sheet p { margin: 0 0 12px; }
.resume-sheet ul { margin: 0 0 12px; padding-left: 1.15em; }
.resume-sheet li { margin: 0 0 6px; }
.resume-sheet a {
  color: #2bae93;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.resume-sites {
  width: 100%;
  border-collapse: collapse;
  font-size: 16px;
}
.resume-sites th, .resume-sites td {
  padding: 8px 10px 8px 0;
  border-bottom: 1px solid #ddd;
  text-align: left;
  vertical-align: baseline;
}
.resume-sites th { font-weight: 650; }
.resume-sites td:last-child, .resume-sites th:last-child { text-align: right; color: #333; }
.resume-sites tr.resume-group td {
  padding-top: 14px;
  font-weight: 650;
  color: #111;
  text-align: left;
}
@media (max-width: 640px) {
  .resume-head { flex-direction: column; }
  .resume-head img { width: 148px; height: 148px; }
  .resume-sheet h1 { font-size: 28px; }
  .resume-sheet { padding: 22px 16px 32px; font-size: 17px; }
  .resume-sites td:last-child { text-align: left; display: block; padding-top: 0; }
  .resume-sites td:first-child { display: block; border-bottom: 0; padding-bottom: 0; }
  .resume-sites tr.resume-group td { display: table-cell; }
}
@page { size: 110mm 190mm; margin: 8mm; }
@media print {
  .resume-toolbar, nav, footer, noscript, body > :not(main) { display: none !important; }
  html, body, main, .resume-stage {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    min-height: 0 !important;
    height: auto !important;
  }
  body::before { display: none !important; }
  .resume-sheet {
    width: auto;
    max-width: none;
    padding: 0;
    font-size: 15px;
  }
  .resume-head img { width: 34mm; height: 34mm; }
  .resume-sheet h1 { font-size: 22px; }
  .resume-role, .resume-sheet h3 { font-size: 16px; }
  .resume-sheet h2 { font-size: 18px; }
  .resume-next { break-before: page; }
  .resume-sheet a { color: #1f8f78; }
}
`;
