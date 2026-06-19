-- Таблицы для Лид-радара

CREATE TABLE IF NOT EXISTS lead_radars (
  id CHAR(36) PRIMARY KEY,
  city VARCHAR(255) NOT NULL,
  niche VARCHAR(255) NOT NULL,
  filters JSON NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  last_check_at DATETIME NULL,
  lead_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (active),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lead_radar_sites (
  id CHAR(36) PRIMARY KEY,
  radar_id CHAR(36) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  name VARCHAR(255) NULL,
  url VARCHAR(500) NULL,
  ssl_status ENUM('ok','warning','error','unknown') DEFAULT 'unknown',
  ssl_days INT NULL,
  ssl_grade VARCHAR(5) NULL,
  http_status INT NULL,
  has_https TINYINT(1) DEFAULT 0,
  score INT DEFAULT 0,
  phone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  vk_url VARCHAR(500) NULL,
  telegram VARCHAR(100) NULL,
  problems JSON NULL,
  status ENUM('new','contacted','replied','won','lost','archived') DEFAULT 'new',
  notes TEXT NULL,
  found_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  contacted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_radar_site FOREIGN KEY (radar_id) REFERENCES lead_radars(id) ON DELETE CASCADE,
  INDEX idx_radar (radar_id),
  INDEX idx_domain (domain),
  INDEX idx_status (status),
  INDEX idx_score (score),
  INDEX idx_found (found_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
