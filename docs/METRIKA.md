# Яндекс Метрика — стратегия для экосистемы

## Рекомендация: ОДИН основной счётчик + отдельные для продуктов

### Счётчик №1 — Экосистема (основной)
- **ID**: `109448101` (создать новый)
- **Где**: konversus.ru, ssl.konversus.ru, leads.konversus.ru
- **Что отслеживаем**:
  - Переходы между модулями
  - Общий трафик экосистемы
  - С каких модулей приходят клиенты
  - Конверсия: посетитель → регистрация → оплата

### Счётчики №2-4 — Продуктовые (аналитика внутри модуля)
- **SSL Doctor**: свой счётчик (воронка: проверка → проблема → помощь)
- **Leads AI**: свой счётчик (воронка: регистрация → подключение → заявки)
- **Архитектор**: свой счётчик (воронка: анализ → заказ концепта)

## Как поставить ОДИН счётчик на все модули

В каждом layout.tsx добавить:

```tsx
<Script id="yandex-metrika" strategy="afterInteractive">
  {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(109448101,"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}
</Script>
```

## Цели (общие для экосистемы)

| Цель | Идентификатор | Где срабатывает |
|------|--------------|-----------------|
| Проверка домена | `ssl-check` | SSL Doctor — нажатие «Проверить» |
| Проблема найдена | `ssl-problem` | SSL Doctor — healthScore < 80 |
| Нужна помощь | `ssl-help` | SSL Doctor — кнопка «Нужна помощь» |
| Регистрация | `register` | Любой модуль — /auth?tab=register |
| Подключение источника | `source-connected` | Leads AI — источник активирован |
| Первая заявка | `first-lead` | Leads AI — первая заявка в БД |
| Анализ сайта | `architect-analyze` | Архитектор — запуск анализа |

## Вебвизор

Включить на основном счётчике — видеть как пользователи переходят между модулями, где застревают, что непонятно.
