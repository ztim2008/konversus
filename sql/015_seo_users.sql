-- SEO-позиции: логины партнёров-маркетологов. Доступ только к выданным проектам.
-- session_version растёт при сбросе пароля и блокировке — старые сессии перестают действовать.

create table if not exists seo_users (
  id char(36) not null primary key,
  login varchar(64) not null,
  name varchar(200) not null default '',
  password_hash varchar(255) not null,
  session_version int not null default 1,
  is_active tinyint(1) not null default 1,
  created_at datetime(3) not null,
  last_login_at datetime(3) null,
  unique key uq_seo_users_login (login)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists seo_user_projects (
  user_id char(36) not null,
  project_id char(36) not null,
  primary key (user_id, project_id),
  constraint fk_seo_user_projects_user foreign key (user_id) references seo_users(id) on delete cascade,
  constraint fk_seo_user_projects_project foreign key (project_id) references seo_projects(id) on delete cascade,
  index idx_seo_user_projects_project (project_id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
