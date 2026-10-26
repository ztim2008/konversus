-- Макс и WhatsApp с сайта, код платной рекламы (коллтрекинг, пиксель VK) через запятую.
ALTER TABLE lead_radar_sites
  ADD COLUMN max_url VARCHAR(255) NULL AFTER telegram,
  ADD COLUMN whatsapp VARCHAR(64) NULL AFTER max_url,
  ADD COLUMN ad_signals VARCHAR(255) NULL AFTER whatsapp;
