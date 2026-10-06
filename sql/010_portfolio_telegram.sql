-- Первая публикация хроники уходит в Telegram-группу. Повторное сохранение не шлёт пост снова.

alter table portfolio_entries
  add column telegram_announced_at datetime(3) null;
