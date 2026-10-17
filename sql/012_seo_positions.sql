-- SEO-позиции: где сайт клиента в обычной выдаче Google по его ключам (снимки через Serper).
-- Каждая проверка — отдельный снимок, история не перезаписывается.

create table if not exists seo_projects (
  id char(36) not null primary key,
  name varchar(200) not null,
  domain varchar(253) not null,
  gl varchar(8) not null,
  hl varchar(8) not null,
  location varchar(200) not null,
  max_pages tinyint not null default 5,
  share_slug char(24) not null,
  is_active tinyint(1) not null default 1,
  created_at datetime(3) not null,
  unique key uq_seo_projects_share (share_slug)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists seo_keywords (
  id char(36) not null primary key,
  project_id char(36) not null,
  keyword varchar(300) not null,
  is_active tinyint(1) not null default 1,
  checking_since datetime(3) null,
  created_at datetime(3) not null,
  constraint fk_seo_keywords_project foreign key (project_id) references seo_projects(id) on delete cascade,
  unique key uq_seo_keywords_project_keyword (project_id, keyword),
  index idx_seo_keywords_project (project_id, is_active)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

-- status: found | not_found (нет в проверенной глубине) | error (результата нет, это не «не найден»)
create table if not exists seo_snapshots (
  id char(36) not null primary key,
  keyword_id char(36) not null,
  checked_at datetime(3) not null,
  status varchar(16) not null,
  position int null,
  page tinyint null,
  matched_url varchar(1000) null,
  depth int not null default 0,
  credits int not null default 0,
  top_json json null,
  error_text varchar(500) null,
  constraint fk_seo_snapshots_keyword foreign key (keyword_id) references seo_keywords(id) on delete cascade,
  index idx_seo_snapshots_keyword_time (keyword_id, checked_at),
  index idx_seo_snapshots_time (checked_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
