-- ИНН с сайта и форма: ip (12 цифр или слово ИП), company (10 цифр), unknown.
ALTER TABLE lead_radar_sites
  ADD COLUMN inn VARCHAR(12) NULL AFTER telegram,
  ADD COLUMN legal_form VARCHAR(16) NOT NULL DEFAULT 'unknown' AFTER inn;
