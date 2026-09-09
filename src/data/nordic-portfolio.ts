/** Каталог живых проектов на Nordic. title/description — с meta страниц (август 2026). */

export type NordicPortfolioItem = {
  id: string;
  title: string;
  url: string;
  external: boolean;
  category: "product" | "site";
  tag: string;
  description: string;
  image: string;
};

export const NORDIC_PORTFOLIO: NordicPortfolioItem[] = [
  {
    id: "leads",
    title: "Konversus Leads AI — Умный поиск заказов",
    url: "https://leads.konversus.ru",
    external: true,
    category: "product",
    tag: "Продукт · AI",
    description:
      "Автоматический мониторинг заказов с Profi.ru. AI-анализ, Telegram-уведомления и готовые отклики.",
    image: "/portfolio/services/leads.jpg",
  },
  {
    id: "chat",
    title: "Telegram-консультант для сайта",
    url: "https://chat.konversus.ru",
    external: true,
    category: "product",
    tag: "Продукт · AI",
    description: "Ваш сайт начнёт отвечать на вопросы 24/7. AI изучает ваш сайт и отвечает клиентам.",
    image: "/portfolio/services/chat.jpg",
  },
  {
    id: "architect",
    title: "AI-Аудитор сайта — узнайте где теряете клиентов",
    url: "/architect",
    external: false,
    category: "product",
    tag: "Продукт · AI",
    description:
      "Бесплатный AI-аудит: SEO, скорость, безопасность, мобильность. Скриншот сайта, CMS-детекция, контакты. Конкретные проблемы с ценами исправления.",
    image: "/portfolio/services/architect.jpg",
  },
  {
    id: "konversus",
    title: "Цифровая упаковка для производственных компаний — Тимофеев Алексей",
    url: "https://konversus.ru",
    external: true,
    category: "product",
    tag: "Продукт · хаб",
    description:
      "Нахожу производство, анализирую сайт, создаю уникальный цифровой образ товара и компании. Клиент получает персональную презентацию: мини-сайт, видео-аудит и PDF для B2B-продаж.",
    image: "/portfolio/services/konversus.jpg",
  },
  {
    id: "nordic-builder",
    title: "НОРДИК — Новый Российский конструктор сайтов",
    url: "https://nordic-builder.ru",
    external: true,
    category: "product",
    tag: "Конструктор",
    description:
      "Локальный российский конструктор сайтов: собираете страницы из блоков, настраиваете дизайн и экспортируете статический сайт в ZIP. Без привязки к платформе.",
    image: "/portfolio/services/nordic-builder.jpg",
  },
  {
    id: "craft-nordic",
    title: "Craft — сайт с Крафтума на свой хостинг",
    url: "https://craft.nordic-builder.ru",
    external: true,
    category: "product",
    tag: "Конструктор",
    description:
      "Уходите с Крафтума на личный хостинг. Сайт как был, домен остаётся вашим — его только отвязать.",
    image: "/portfolio/services/craft-nordic.jpg",
  },
  {
    id: "nordic-store",
    title: "Nordic Builder",
    url: "https://nordic-builder.store",
    external: true,
    category: "product",
    tag: "Магазин",
    description: "Витрина Nordic Builder на отдельном домене .store.",
    image: "/portfolio/services/nordic-store.jpg",
  },
  {
    id: "proektmap",
    title: "Готовые решения AI — от цели до работающего продукта — ProektMap",
    url: "https://proektmap.ru",
    external: true,
    category: "site",
    tag: "Сайт на Nordic",
    description:
      "Маршруты создания AI-продуктов с проверяемым прогрессом: решение, действие, артефакт и контрольная точка.",
    image: "/portfolio/services/proektmap.jpg",
  },
  {
    id: "prokuklyash",
    title: "Кукляш — интерьерные игрушки ручной работы",
    url: "https://prokuklyash.ru",
    external: true,
    category: "site",
    tag: "Сайт на Nordic",
    description:
      "Премиальный каталог интерьерных игрушек ручной работы: куклы, зверята и текстильные персонажи для тёплого дома и подарков.",
    image: "/portfolio/services/prokuklyash.jpg",
  },
  {
    id: "marketfon",
    title: "Баннеры, карточки, фоны и портфолио для Авито",
    url: "https://маркет-фон.рф",
    external: true,
    category: "site",
    tag: "Сайт на Nordic",
    description:
      "Хаб инструментов для Авито: баннеры, фоны, карточки, портфолио работ, Canvas-редактор и бесплатный SalesDoc — профиль доверия авитолога для отправки клиентам в мессенджерах.",
    image: "/portfolio/services/marketfon.jpg",
  },
  {
    id: "kupolcert",
    title: "Купол — сертификация",
    url: "https://kupolcert.ru",
    external: true,
    category: "site",
    tag: "Сайт",
    description:
      "Сертификация и разрешительная документация: поможем определить нужные документы, сопроводим оформление от заявки до готового сертификата, декларации или СГР.",
    image: "/portfolio/services/kupolcert.jpg",
  },
  {
    id: "reverans",
    title: "Художественная гимнастика для детей в Москве | Реверанс",
    url: "https://reverans.online",
    external: true,
    category: "site",
    tag: "Сайт",
    description:
      "Спортивный клуб художественной гимнастики Реверанс для детей от 3 лет в Москве. Индивидуальный подход, тренировки и соревнования.",
    image: "/portfolio/services/reverans.jpg",
  },
];
