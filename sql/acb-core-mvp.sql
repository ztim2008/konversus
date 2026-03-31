-- Core MVP schema for AVITO CONVERSION BUILDER
-- Tables: acb_users, acb_refresh_tokens, acb_listings

CREATE TABLE IF NOT EXISTS acb_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  yandex_id VARCHAR(64) NOT NULL,
  email VARCHAR(255) NULL,
  display_name VARCHAR(255) NULL,
  real_name VARCHAR(255) NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_yandex_id (yandex_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acb_refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_user_id (user_id),
  KEY idx_token_hash (token_hash),
  CONSTRAINT fk_acb_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES acb_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acb_listings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  template_id VARCHAR(64) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  archived_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_user_id (user_id),
  KEY idx_user_status (user_id, status),
  CONSTRAINT fk_acb_listings_user FOREIGN KEY (user_id) REFERENCES acb_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
