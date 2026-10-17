-- SEO-позиции: отметки «что изменили на сайте и когда». keyword_id null — отметка для всех запросов проекта.

create table if not exists seo_notes (
  id char(36) not null primary key,
  project_id char(36) not null,
  keyword_id char(36) null,
  note_date date not null,
  text varchar(300) not null,
  created_at datetime(3) not null,
  constraint fk_seo_notes_project foreign key (project_id) references seo_projects(id) on delete cascade,
  constraint fk_seo_notes_keyword foreign key (keyword_id) references seo_keywords(id) on delete cascade,
  index idx_seo_notes_project_date (project_id, note_date)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
