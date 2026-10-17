export type AuditValue = "1" | "0" | "-";

export type AuditItem = { no: number; text: string; auto?: boolean };
export type AuditSection = { title: string; items: AuditItem[] };

export const AUDIT_SECTIONS: AuditSection[] = [
  {
    title: "Шапка страницы",
    items: [
      { no: 1, text: "Есть логотип.", auto: true },
      { no: 2, text: "Логотип кликабелен.", auto: true },
      { no: 3, text: "Логотип читабелен и релевантен тематике." },
      { no: 4, text: "Телефон указан в шапке.", auto: true },
      { no: 5, text: "Есть ссылки на популярные разделы (каталог, оплата, контакты, акции)." },
      { no: 6, text: "Шапка закреплена при скролле вниз на десктопе.", auto: true },
    ],
  },
  {
    title: "Первый экран",
    items: [
      { no: 7, text: "С первого экрана понятно, что продается на сайте." },
      { no: 8, text: "Сразу считывается география работы." },
      { no: 9, text: "Присутствует ключевое УТП. Понятно, почему стоит купить здесь." },
      { no: 10, text: "Есть призыв к действию: форма обратной связи, обратный звонок или иное.", auto: true },
    ],
  },
  {
    title: "Дизайн страницы",
    items: [
      { no: 11, text: "Дизайн релевантен тематике." },
      { no: 12, text: "Цветовая гамма выглядит привлекательно." },
      { no: 13, text: "Все элементы читабельны." },
      { no: 14, text: "Шрифты единообразны и смотрятся гармонично." },
      { no: 15, text: "Нет фальш-кнопок (некликабельных элементов, на которые хочется кликнуть)." },
    ],
  },
  {
    title: "Форма обратной связи",
    items: [
      { no: 16, text: "Форму легко найти, она всегда в быстром доступе." },
      { no: 17, text: "При отправке формы пользователю понятно, что его запрос получили." },
      { no: 18, text: "Обязательных полей не более 3-х.", auto: true },
      { no: 19, text: "Работает проверка телефона и почты по маске (чтобы отфильтровать спам-заявки).", auto: true },
    ],
  },
  {
    title: "Социальные доказательства",
    items: [
      { no: 20, text: "Есть раздел «Отзывы».", auto: true },
      { no: 21, text: "Есть прочие элементы (лицензии, сертификаты и другое).", auto: true },
    ],
  },
  {
    title: "Элементы, привлекающие внимание",
    items: [
      {
        no: 22,
        text: "Есть элементы, побуждающие совершить конверсию (попапы со скидками, слайдер, квизы и прочее).",
      },
      { no: 23, text: "Отсутствуют элементы, мешающие совершить конверсию." },
    ],
  },
  {
    title: "Мобильная версия",
    items: [
      { no: 24, text: "Есть адаптивная вёрстка сайта.", auto: true },
      { no: 25, text: "Есть мобильное меню.", auto: true },
      { no: 26, text: "Удобные навигация и поиск на мобильном сайте." },
      { no: 27, text: "Есть кнопка «вверх» для перехода на первый экран.", auto: true },
      { no: 28, text: "Номер телефона кликабелен.", auto: true },
      { no: 29, text: "Есть кнопки социальных сетей.", auto: true },
      { no: 30, text: "Шапка закрепляется при скролле страницы.", auto: true },
    ],
  },
  {
    title: "Счётчик Яндекс Метрики",
    items: [
      { no: 31, text: "Установлен счётчик Яндекс Метрики.", auto: true },
      { no: 32, text: "Счётчик срабатывает на всех страницах сайта.", auto: true },
    ],
  },
];

export const AUDIT_ITEMS: AuditItem[] = AUDIT_SECTIONS.flatMap((s) => s.items);

export function isAuditValue(v: unknown): v is AuditValue {
  return v === "1" || v === "0" || v === "-";
}

export type AuditEntry = { value: AuditValue | null; comment: string; source: "auto" | "manual" };

/** Итог как в таблице: сумма «да» из оценённых «да / нет». */
export function auditScore(entries: Map<number, AuditEntry>) {
  let yes = 0;
  let rated = 0;
  for (const item of AUDIT_ITEMS) {
    const v = entries.get(item.no)?.value;
    if (v === "1") yes++;
    if (v === "1" || v === "0") rated++;
  }
  return { yes, rated };
}
