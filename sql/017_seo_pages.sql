-- SEO-позиции: фоновые проверки, целевая страница запроса, SEO-проверка страниц под запросы.

create table if not exists seo_audit_runs (
  project_id char(36) not null,
  kind varchar(16) not null,
  month char(7) not null,
  status varchar(8) not null,
  started_at datetime(3) not null,
  finished_at datetime(3) null,
  error_text varchar(300) null,
  primary key (project_id, kind),
  constraint fk_seo_audit_runs_project foreign key (project_id) references seo_projects(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

alter table seo_keywords add column target_url varchar(1000) null after keyword;

create table if not exists seo_page_checks (
  project_id char(36) not null,
  month char(7) not null,
  url_hash char(40) not null,
  url varchar(1000) not null,
  checked_at datetime(3) not null,
  status_code smallint null,
  final_url varchar(1000) null,
  title varchar(500) null,
  description varchar(1000) null,
  h1 varchar(500) null,
  h1_count smallint not null default 0,
  canonical varchar(1000) null,
  noindex tinyint(1) not null default 0,
  words int not null default 0,
  metrika tinyint(1) not null default 0,
  error_text varchar(300) null,
  primary key (project_id, month, url_hash),
  constraint fk_seo_page_checks_project foreign key (project_id) references seo_projects(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
