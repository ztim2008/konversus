-- SEO-позиции: статистика рекламы по дням. source: google — скрипт в аккаунте Google Ads, yandex — API Директа.
-- seo_ads_links — ключ скрипта (хранится только sha256) и последняя выгрузка.
-- seo_ads_coverage — дни, за которые скрипт прислал данные: день в покрытии без строк в seo_ads_daily = реклама стояла.

create table if not exists seo_ads_links (
  project_id char(36) not null,
  source varchar(8) not null,
  token_hash char(64) not null,
  created_at datetime(3) not null,
  synced_at datetime(3) null,
  account_name varchar(255) null,
  currency char(3) null,
  primary key (project_id, source),
  unique key uq_seo_ads_links_token (token_hash),
  constraint fk_seo_ads_links_project foreign key (project_id) references seo_projects(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists seo_ads_coverage (
  project_id char(36) not null,
  source varchar(8) not null,
  day date not null,
  primary key (project_id, source, day),
  constraint fk_seo_ads_coverage_project foreign key (project_id) references seo_projects(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists seo_ads_daily (
  project_id char(36) not null,
  source varchar(8) not null,
  day date not null,
  campaign_id varchar(32) not null,
  campaign_name varchar(255) not null,
  impressions int not null default 0,
  clicks int not null default 0,
  cost decimal(16,2) not null default 0,
  conversions decimal(10,2) not null default 0,
  hours varchar(100) null,
  primary key (project_id, source, day, campaign_id),
  constraint fk_seo_ads_daily_project foreign key (project_id) references seo_projects(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
