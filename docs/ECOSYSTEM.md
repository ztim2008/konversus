# Экосистема Konversus — архитектура и масштабирование

## Обзор

`konversus.ru` — хаб, объединяющий все digital-сервисы в единую экосистему. Каждый новый сервис добавляется как поддомен или раздел и подключается к общей навигации.

## Структура

```
konversus.ru (ХАБ)
├── /                        Главная — витрина сервисов
├── /about                   Портфолио и контакты
├── /architect               Аудит сайта
├── /dashboard/secret-shopper Тайный покупатель (поиск клиентов)
│
├── leads.konversus.ru       Ловец лидов (Profi.ru, Kwork, ...)
├── ssl.konversus.ru         SSL Doctor
├── nordic-builder.ru        Конструктор сайтов
└── маркет-фон.рф             Портфолио
```

## Общие компоненты

### KonversusNav
Файл: `src/components/konversus-nav.tsx`

Навигация с мега-меню «Продукты». Используется на всех страницах хаба.

**Как добавить новый сервис:**

1. Открыть `src/components/konversus-nav.tsx`
2. Найти массив `PRODUCTS`
3. Добавить новый объект:

```typescript
{
  name: "Имя сервиса",
  description: "Краткое описание (1 строка)",
  href: "https://новый-сервис.konversus.ru",
  icon: Globe,          // иконка из lucide-react
  color: "#цвет",        // акцентный цвет
  badge: "Новое",        // опционально: метка
},
```

4. Импортировать иконку из `lucide-react` если нужно

### KonversusFooter
Файл: `src/components/konversus-footer.tsx`

Футер с тремя колонками: Продукты, О проекте, Контакты.

**Как добавить сервис в футер:**

1. Найти массив `PRODUCTS` в `konversus-footer.tsx`
2. Добавить запись: `{ name: "Имя", href: "https://...", ext: true }`

## Подключение к поддомену

Для подключения навигации на поддомене (например `leads.konversus.ru`):

### Вариант A: Копирование компонента
Скопировать `konversus-nav.tsx` и `konversus-footer.tsx` в проект поддомена, настроить импорты.

### Вариант B: Общий npm-пакет
Опубликовать компоненты как `@konversus/ui` и импортировать.

## Яндекс Метрика

Единый счётчик `109448101` для всех проектов. Подключается в `<head>` каждого сайта.

## Дизайн-токены

- Фон: `#09090b` (корень), `#18181b` (поверхность)
- Текст: `#fafafa` (заголовки), `#d4d4d8` (основной), `#71717a` ( muted)
- Акценты: `#22c55e` (ловец лидов), `#3b82f6` (SSL), `#8b5cf6` (архитектор)
- Шрифт: Inter (основной), JetBrains Mono (код)
- Иконки: Lucide (локально)
- Сетка: 0px gaps, плотная
- Радиусы: `--radius-sm` (8px), `--radius-md` (12px), `--radius-lg` (16px)
- Тема: тёмная по умолчанию

## Контакты

- Telegram: [@bilarius](https://t.me/bilarius)
- Email: bilariuss@yandex.ru
- Телефон: +7 921 201-32-52
- VK: [vk.com/bilarius](https://vk.com/bilarius)
- Behance: [timofeev_aleksey](https://www.behance.net/timofeev_aleksey)
