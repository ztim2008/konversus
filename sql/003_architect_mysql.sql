-- Migration 003: AI Business Growth Architect
-- Run: mysql -u fpb_user -pS1LRdNJMo1XZKhZSHaqK4b -h 127.0.0.1 factory_proposal_builder < sql/003_architect_mysql.sql

CREATE TABLE IF NOT EXISTS architect_projects (
  id           CHAR(36)     NOT NULL,
  url          TEXT         NOT NULL,
  source_type  ENUM('website','ozon','wb','avito-seller','avito-listing') NOT NULL DEFAULT 'website',
  ip_hash      VARCHAR(64)  NOT NULL DEFAULT '',
  status       ENUM('pending','collecting','analyzing','done','failed') NOT NULL DEFAULT 'pending',
  snapshot_json LONGTEXT    NULL,
  result_json   LONGTEXT    NULL,
  model_used    VARCHAR(120) NULL,
  error_message VARCHAR(500) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_status (status),
  INDEX idx_ip_created (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
