# Бэклог: inline Send/Skip в Telegram-боте

**Статус:** 🟦 не сейчас · после UX mobile / привычки «утро TG → день админка»  
**Дата плана:** 2026-09-11  
**Связь:** [UX/UI план](2026-09-lead-radar-ux-ui.md) · волна 4 бэклог

---

## Зачем

Напарник разбирает пачку с телефона без открытия админки.  
TG перестаёт быть только зеркалом и становится пультом дня.

**Не делать**, пока разбор почти всегда с ноутбука в «Сегодня».

---

## Принципы (инварианты)

1. Тот же human-in-the-loop: кнопка = человек, не автоотправка пачки.  
2. Один контур логики: `sendQueuedLead` / `skipQueuedLead` (не дублировать SMTP).  
3. Только доверенный `telegram_chat_id` (whitelist).  
4. Идемпотентность: повторный клик → «уже отправлено / уже пропуск».  
5. Send — с подтверждением (вторая кнопка или «да/нет»).

---

## Этапы внедрения

### A. Только Skip (низкий риск) — 0.5–1 день

DoD:

- [ ] Утренние карточки / уведомления: inline `⏭ Пропуск`  
- [ ] `callback_query` → webhook → `skipQueuedLead`  
- [ ] Ответ в чат: «пропущено · слот свободен» (уже есть текст-нотификация)  
- [ ] Кнопка снимается / disabled после клика  

### B. Send с подтверждением — 1–1.5 дня

DoD:

- [ ] Inline `✅ Отправить` → сообщение «Точно отправить {domain}?» + `Да` / `Отмена`  
- [ ] `Да` → `sendQueuedLead` (не testMode в проде)  
- [ ] Ошибки: no_email / no_kp / not_queued — текст в чат  
- [ ] Лог: кто (chat_id) · когда · site_id  

### C. Полировка — по желанию

- [ ] Кнопки на утренних 5 карточках + deep-link «ещё N в админке»  
- [ ] Rate-limit / debounce двойных кликов  
- [ ] Опционально: Quiet hours (не слать Send ночью)

---

## Технический скелет

```
TG message + inline_keyboard
  callback_data: "lr:skip:{siteId}" | "lr:sendask:{siteId}" | "lr:send:{siteId}"
       ↓
POST /api/lead-radar/telegram-callback  (секрет / проверка chat_id)
       ↓
skipQueuedLead | sendQueuedLead
       ↓
answerCallbackQuery + editMessageReplyMarkup
```

Новые сущности (graph при старте работ):

- `api.lead_radar_tg_callback`  
- опционально таблица `lead_radar_tg_actions` (audit)

Env / settings:

- уже есть `telegram_bot_token`, `telegram_chat_id`  
- webhook URL на публичный HTTPS konversus.ru  

---

## Оценка эффекта

| Метрика | Ожидание |
|---------|----------|
| Время Skip с телефона | −1 экран админки |
| Ошибки «отправил не того» | ↑ без confirm → поэтому этап B обязателен |
| Сложность поддержки | webhook + идемпотентность |

---

## Триггер старта

Владелец говорит: «делаем TG inline» — после того как mobile «Сегодня» либо явно отложен, и есть боль разбора из чата.
