-- Лид-радар Auto: очередь, платформа, скрин, batches (этап 1 ТЗ)
-- Идемпотентность: повторный накат может упасть на дублях колонок — накатывать один раз.

ALTER TABLE lead_radar_sites
  MODIFY COLUMN status ENUM(
    'new',
    'queued',
    'contacted',
    'replied',
    'won',
    'lost',
    'archived',
    'skipped',
    'skipped_no_email',
    'skipped_no_screenshot',
    'rejected_not_company',
    'bounced'
  ) NOT NULL DEFAULT 'new';

ALTER TABLE lead_radar_sites
  ADD COLUMN platform VARCHAR(100) NULL AFTER email,
  ADD COLUMN source ENUM('serp','maps','manual') NOT NULL DEFAULT 'maps' AFTER platform,
  ADD COLUMN serp_query VARCHAR(500) NULL AFTER source,
  ADD COLUMN serp_position INT NULL AFTER serp_query,
  ADD COLUMN privacy_issues JSON NULL AFTER problems,
  ADD COLUMN screenshot_path VARCHAR(500) NULL AFTER privacy_issues,
  ADD COLUMN screenshot_url VARCHAR(500) NULL AFTER screenshot_path,
  ADD COLUMN screenshot_at DATETIME NULL AFTER screenshot_url,
  ADD COLUMN email_source_url VARCHAR(500) NULL AFTER screenshot_at,
  ADD COLUMN kp_html MEDIUMTEXT NULL AFTER email_source_url,
  ADD COLUMN kp_subject VARCHAR(500) NULL AFTER kp_html,
  ADD COLUMN kp_tokens_in INT NULL AFTER kp_subject,
  ADD COLUMN kp_tokens_out INT NULL AFTER kp_tokens_in,
  ADD COLUMN hot_score INT NOT NULL DEFAULT 0 AFTER kp_tokens_out,
  ADD COLUMN queued_at DATETIME NULL AFTER hot_score,
  ADD COLUMN batch_date DATE NULL AFTER queued_at,
  ADD COLUMN reject_reason VARCHAR(255) NULL AFTER batch_date;

ALTER TABLE lead_radar_sites
  ADD INDEX idx_batch_date (batch_date),
  ADD INDEX idx_domain (domain),
  ADD INDEX idx_hot_score (hot_score);

CREATE TABLE IF NOT EXISTS lead_radar_batches (
  id CHAR(36) PRIMARY KEY,
  batch_date DATE NOT NULL,
  queued_count INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  opened_count INT NOT NULL DEFAULT 0,
  replied_count INT NOT NULL DEFAULT 0,
  bounce_count INT NOT NULL DEFAULT 0,
  tokens_total INT NOT NULL DEFAULT 0,
  report_sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_batch_date (batch_date),
  INDEX idx_batch_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
