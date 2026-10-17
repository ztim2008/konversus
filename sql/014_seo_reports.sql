-- SEO-позиции: ручной текст месячного отчёта (план на следующий месяц). Цифры отчёта считаются из снимков.

create table if not exists seo_reports (
  project_id char(36) not null,
  month char(7) not null,
  plan_text text null,
  updated_at datetime(3) not null,
  primary key (project_id, month),
  constraint fk_seo_reports_project foreign key (project_id) references seo_projects(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
