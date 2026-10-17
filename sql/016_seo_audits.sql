-- SEO-позиции: проверка сайта по чек-листу из 32 пунктов, по месяцам (до / после).
-- value: '1' — да, '0' — нет, '-' — не применимо, null — не оценён. source: auto — автопроверка, manual — вручную.

create table if not exists seo_audits (
  project_id char(36) not null,
  month char(7) not null,
  item_no tinyint unsigned not null,
  value char(1) null,
  comment varchar(300) null,
  source varchar(8) not null default 'manual',
  updated_at datetime(3) not null,
  primary key (project_id, month, item_no),
  constraint fk_seo_audits_project foreign key (project_id) references seo_projects(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
