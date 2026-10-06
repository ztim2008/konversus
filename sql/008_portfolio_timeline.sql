-- Портфолио-лента Алексея Тимофеева. Управление с публичной страницы при сессии админа.

create table if not exists portfolio_entries (
  id char(36) not null primary key,
  title varchar(200) not null,
  description text null,
  created_at datetime(3) not null,
  updated_at datetime(3) not null,
  published tinyint(1) not null default 0,
  index idx_portfolio_entries_feed (published, created_at, id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists portfolio_media (
  id char(36) not null primary key,
  entry_id char(36) null,
  url varchar(500) not null,
  lightbox_url varchar(500) not null,
  thumb_url varchar(500) null,
  original_path varchar(500) not null,
  width int not null,
  height int not null,
  alt varchar(300) not null default '',
  sort_order int not null default 0,
  created_at datetime(3) not null,
  constraint fk_portfolio_media_entry foreign key (entry_id) references portfolio_entries(id) on delete cascade,
  index idx_portfolio_media_entry_sort (entry_id, sort_order),
  index idx_portfolio_media_orphan (entry_id, created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
