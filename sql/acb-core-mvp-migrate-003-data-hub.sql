-- Core MVP migration: add Data Hub base tables for Avito-connected listings and audits

CREATE TABLE IF NOT EXISTS acb_avito_connections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  external_account_id VARCHAR(64) NOT NULL,
  account_name VARCHAR(255) NULL,
  account_email VARCHAR(255) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  last_sync_at DATETIME NULL,
  last_error_code VARCHAR(64) NULL,
  last_error_message TEXT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_user_external_account (user_id, external_account_id),
  KEY idx_connection_status (status),
  KEY idx_connection_last_sync (last_sync_at),
  CONSTRAINT fk_acb_avito_connections_user FOREIGN KEY (user_id) REFERENCES acb_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acb_avito_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  connection_id BIGINT UNSIGNED NOT NULL,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT NULL,
  scope TEXT NULL,
  expires_at DATETIME NULL,
  refreshed_at DATETIME NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_avito_tokens_connection (connection_id),
  KEY idx_avito_tokens_expires (expires_at),
  CONSTRAINT fk_acb_avito_tokens_connection FOREIGN KEY (connection_id) REFERENCES acb_avito_connections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acb_avito_listings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  connection_id BIGINT UNSIGNED NOT NULL,
  external_listing_id VARCHAR(64) NOT NULL,
  external_category_id VARCHAR(64) NULL,
  category_name VARCHAR(255) NULL,
  title VARCHAR(255) NOT NULL,
  description MEDIUMTEXT NULL,
  price_value DECIMAL(12,2) NULL,
  price_currency VARCHAR(8) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  listing_url VARCHAR(512) NULL,
  city VARCHAR(255) NULL,
  region VARCHAR(255) NULL,
  contact_name VARCHAR(255) NULL,
  payload_json LONGTEXT NULL,
  source_created_at DATETIME NULL,
  source_updated_at DATETIME NULL,
  last_synced_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_connection_external_listing (connection_id, external_listing_id),
  KEY idx_avito_listings_user_status (user_id, status),
  KEY idx_avito_listings_city (city),
  KEY idx_avito_listings_category (category_name),
  KEY idx_avito_listings_last_synced (last_synced_at),
  CONSTRAINT fk_acb_avito_listings_user FOREIGN KEY (user_id) REFERENCES acb_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_acb_avito_listings_connection FOREIGN KEY (connection_id) REFERENCES acb_avito_connections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acb_avito_listing_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  listing_id BIGINT UNSIGNED NOT NULL,
  external_image_id VARCHAR(64) NULL,
  image_url VARCHAR(512) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_main TINYINT(1) NOT NULL DEFAULT 0,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_listing_external_image (listing_id, external_image_id),
  KEY idx_listing_image_order (listing_id, sort_order),
  KEY idx_listing_image_main (listing_id, is_main),
  CONSTRAINT fk_acb_avito_listing_images_listing FOREIGN KEY (listing_id) REFERENCES acb_avito_listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acb_avito_listing_metric_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  listing_id BIGINT UNSIGNED NOT NULL,
  snapshot_at DATETIME NOT NULL,
  views_count INT UNSIGNED NOT NULL DEFAULT 0,
  contacts_count INT UNSIGNED NOT NULL DEFAULT 0,
  favorites_count INT UNSIGNED NOT NULL DEFAULT 0,
  conversion_rate DECIMAL(8,4) NULL,
  payload_json LONGTEXT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_metric_listing_snapshot (listing_id, snapshot_at),
  CONSTRAINT fk_acb_avito_metric_snapshots_listing FOREIGN KEY (listing_id) REFERENCES acb_avito_listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acb_listing_audits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NULL,
  source_mode VARCHAR(32) NOT NULL DEFAULT 'api_listing',
  overall_score TINYINT UNSIGNED NOT NULL,
  text_score TINYINT UNSIGNED NULL,
  photo_score TINYINT UNSIGNED NULL,
  infographic_score TINYINT UNSIGNED NULL,
  market_score TINYINT UNSIGNED NULL,
  priority_level VARCHAR(16) NOT NULL DEFAULT 'medium',
  summary TEXT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_listing_audits_listing_created (listing_id, created_at),
  KEY idx_listing_audits_user_created (user_id, created_at),
  CONSTRAINT fk_acb_listing_audits_user FOREIGN KEY (user_id) REFERENCES acb_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_acb_listing_audits_listing FOREIGN KEY (listing_id) REFERENCES acb_avito_listings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acb_listing_audit_findings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  audit_id BIGINT UNSIGNED NOT NULL,
  zone VARCHAR(32) NOT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'warning',
  code VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_audit_findings_sort (audit_id, sort_order),
  KEY idx_audit_findings_zone (audit_id, zone),
  CONSTRAINT fk_acb_listing_audit_findings_audit FOREIGN KEY (audit_id) REFERENCES acb_listing_audits(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acb_listing_versions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  based_on_audit_id BIGINT UNSIGNED NULL,
  version_label VARCHAR(128) NOT NULL,
  title VARCHAR(255) NULL,
  description MEDIUMTEXT NULL,
  visual_brief MEDIUMTEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  applied_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_listing_versions_status (listing_id, status),
  KEY idx_listing_versions_audit (based_on_audit_id),
  CONSTRAINT fk_acb_listing_versions_user FOREIGN KEY (user_id) REFERENCES acb_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_acb_listing_versions_listing FOREIGN KEY (listing_id) REFERENCES acb_avito_listings(id) ON DELETE CASCADE,
  CONSTRAINT fk_acb_listing_versions_audit FOREIGN KEY (based_on_audit_id) REFERENCES acb_listing_audits(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;