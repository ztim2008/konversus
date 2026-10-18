-- SEO-позиции: общие настройки модуля. serper_paused = '1' — проверки через Serper остановлены (ночные и ручные).
create table if not exists seo_settings (
  name varchar(64) not null,
  value varchar(500) not null,
  updated_at datetime(3) not null,
  primary key (name)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
