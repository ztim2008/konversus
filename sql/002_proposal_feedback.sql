-- Таблица обратной связи от клиентов
create table if not exists proposal_feedback (
  id char(36) primary key,
  proposal_id char(36) not null,
  share_link_id char(36) null,
  author_name varchar(255) null,
  rating tinyint unsigned null,
  comment text null,
  created_at timestamp not null default current_timestamp,
  constraint fk_feedback_proposal foreign key (proposal_id) references proposals(id) on delete cascade,
  constraint chk_feedback_rating check (rating is null or (rating >= 1 and rating <= 5)),
  index idx_feedback_proposal_id (proposal_id),
  index idx_feedback_created_at (created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
