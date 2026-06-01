create table if not exists companies (
  id char(36) primary key,
  name varchar(255) not null,
  website_url varchar(500) null,
  industry varchar(255) null,
  short_description text null,
  contacts json null,
  notes text null,
  status enum('draft', 'research', 'concept', 'sent', 'opened', 'won', 'archived') not null default 'draft',
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists proposals (
  id char(36) primary key,
  company_id char(36) not null,
  title varchar(255) not null,
  preset enum('industrial-dark', 'tech-blue', 'premium-light', 'heavy-industry', 'engineering-pro', 'metal-tech') not null default 'industrial-dark',
  status enum('draft', 'in-progress', 'review', 'ready', 'sent', 'opened', 'archived') not null default 'draft',
  headline text null,
  subheadline text null,
  cta_label varchar(255) null,
  structure json not null,
  settings json not null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  constraint fk_proposals_company foreign key (company_id) references companies(id) on delete cascade,
  index idx_proposals_company_id (company_id),
  index idx_proposals_status (status)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists assets (
  id char(36) primary key,
  proposal_id char(36) not null,
  kind enum('image', 'video', 'pdf', 'document', 'logo', 'screenshot') not null,
  storage_bucket varchar(120) not null default 'proposal-assets',
  storage_path varchar(500) not null,
  file_name varchar(255) not null,
  mime_type varchar(120) null,
  alt_text varchar(500) null,
  source enum('manual', 'imported', 'generated', 'captured') not null default 'manual',
  metadata json not null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  constraint fk_assets_proposal foreign key (proposal_id) references proposals(id) on delete cascade,
  index idx_assets_proposal_id (proposal_id),
  index idx_assets_kind (kind)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists share_links (
  id char(36) primary key,
  proposal_id char(36) not null,
  token varchar(255) not null unique,
  slug varchar(255) null unique,
  status enum('draft', 'active', 'expired', 'revoked') not null default 'draft',
  expires_at datetime null,
  view_count int not null default 0,
  last_opened_at datetime null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  constraint fk_share_links_proposal foreign key (proposal_id) references proposals(id) on delete cascade,
  index idx_share_links_proposal_id (proposal_id),
  index idx_share_links_status (status)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
