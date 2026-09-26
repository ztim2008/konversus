-- Атрибуция клика «Позвонить» из письма (мост /api/lead-radar/call)

ALTER TABLE lead_radar_sites
  ADD COLUMN call_clicked_at DATETIME NULL AFTER replied_at;

ALTER TABLE lead_radar_batches
  ADD COLUMN call_click_count INT NOT NULL DEFAULT 0 AFTER replied_count;
