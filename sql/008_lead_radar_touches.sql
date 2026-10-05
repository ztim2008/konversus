-- Номер касания и Message-ID первого письма, чтобы второе и третье шли в ту же переписку.
-- Старые строки остаются касанием 1. Цепочка включается только у новых писем, где message_id заполнен.
ALTER TABLE lead_follow_ups
  ADD COLUMN touch_no TINYINT NOT NULL DEFAULT 1 AFTER type,
  ADD COLUMN message_id VARCHAR(255) NULL AFTER touch_no;
