-- Core MVP migration: add market benchmark tables on top of Data Hub

CREATE TABLE IF NOT EXISTS acb_benchmark_queries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NULL,
  city VARCHAR(255) NULL,
  region VARCHAR(255) NULL,
  category_name VARCHAR(255) NULL,
  service_name VARCHAR(255) NULL,
  price_min DECIMAL(12,2) NULL,
  price_max DECIMAL(12,2) NULL,
  query_mode VARCHAR(32) NOT NULL DEFAULT 'market',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_benchmark_queries_user (user_id, created_at),
  KEY idx_benchmark_queries_listing (listing_id),
  KEY idx_benchmark_queries_scope (city, category_name, service_name),
  CONSTRAINT fk_acb_benchmark_queries_user FOREIGN KEY (user_id) REFERENCES acb_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_acb_benchmark_queries_listing FOREIGN KEY (listing_id) REFERENCES acb_avito_listings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acb_benchmark_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  query_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NULL,
  benchmark_score TINYINT UNSIGNED NOT NULL,
  title_gap_score TINYINT UNSIGNED NULL,
  photo_gap_score TINYINT UNSIGNED NULL,
  infographic_gap_score TINYINT UNSIGNED NULL,
  offer_gap_score TINYINT UNSIGNED NULL,
  price_gap_score TINYINT UNSIGNED NULL,
  summary TEXT NULL,
  sample_size INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_benchmark_snapshots_query_created (query_id, created_at),
  KEY idx_benchmark_snapshots_listing (listing_id),
  CONSTRAINT fk_acb_benchmark_snapshots_query FOREIGN KEY (query_id) REFERENCES acb_benchmark_queries(id) ON DELETE CASCADE,
  CONSTRAINT fk_acb_benchmark_snapshots_listing FOREIGN KEY (listing_id) REFERENCES acb_avito_listings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acb_benchmark_gaps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  snapshot_id BIGINT UNSIGNED NOT NULL,
  zone VARCHAR(32) NOT NULL,
  gap_direction VARCHAR(16) NOT NULL DEFAULT 'below',
  gap_score TINYINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_benchmark_gaps_snapshot_sort (snapshot_id, sort_order),
  KEY idx_benchmark_gaps_zone (snapshot_id, zone),
  CONSTRAINT fk_acb_benchmark_gaps_snapshot FOREIGN KEY (snapshot_id) REFERENCES acb_benchmark_snapshots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acb_benchmark_patterns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  snapshot_id BIGINT UNSIGNED NOT NULL,
  pattern_type VARCHAR(32) NOT NULL,
  pattern_key VARCHAR(128) NOT NULL,
  pattern_value TEXT NOT NULL,
  confidence_level VARCHAR(16) NOT NULL DEFAULT 'medium',
  sample_size INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_benchmark_patterns_snapshot_type (snapshot_id, pattern_type),
  CONSTRAINT fk_acb_benchmark_patterns_snapshot FOREIGN KEY (snapshot_id) REFERENCES acb_benchmark_snapshots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acb_benchmark_samples (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  snapshot_id BIGINT UNSIGNED NOT NULL,
  external_listing_id VARCHAR(64) NULL,
  external_url VARCHAR(512) NOT NULL,
  title VARCHAR(255) NULL,
  price_value DECIMAL(12,2) NULL,
  city VARCHAR(255) NULL,
  source_type VARCHAR(16) NOT NULL DEFAULT 'public',
  preview_image_url VARCHAR(512) NULL,
  is_reference TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_benchmark_samples_snapshot (snapshot_id),
  KEY idx_benchmark_samples_reference (snapshot_id, is_reference),
  CONSTRAINT fk_acb_benchmark_samples_snapshot FOREIGN KEY (snapshot_id) REFERENCES acb_benchmark_snapshots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;