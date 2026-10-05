-- Телефон уже есть. Ссылка на Telegram со страницы компании.
ALTER TABLE lead_radar_sites
  ADD COLUMN telegram VARCHAR(200) NULL AFTER phone;
