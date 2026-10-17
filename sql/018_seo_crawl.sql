-- SEO-позиции: обход сайта по sitemap (техника сайта). Хранится последний обход за месяц.

create table if not exists seo_crawls (
  id char(36) not null primary key,
  project_id char(36) not null,
  month char(7) not null,
  started_at datetime(3) not null,
  finished_at datetime(3) null,
  pages_total int not null default 0,
  source varchar(8) not null,
  key idx_seo_crawls_project_month (project_id, month),
  constraint fk_seo_crawls_project foreign key (project_id) references seo_projects(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists seo_crawl_pages (
  crawl_id char(36) not null,
  url_hash char(40) not null,
  url varchar(1000) not null,
  in_sitemap tinyint(1) not null default 0,
  status_code smallint null,
  redirects tinyint unsigned not null default 0,
  final_url varchar(1000) null,
  title varchar(500) null,
  description varchar(1000) null,
  h1_count smallint not null default 0,
  canonical varchar(1000) null,
  noindex tinyint(1) not null default 0,
  metrika tinyint(1) not null default 0,
  gtm tinyint(1) not null default 0,
  words int not null default 0,
  is_html tinyint(1) not null default 0,
  error_text varchar(300) null,
  primary key (crawl_id, url_hash),
  constraint fk_seo_crawl_pages_crawl foreign key (crawl_id) references seo_crawls(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
