-- SEO-позиции: прогресс и итог фоновых проверок.

alter table seo_audit_runs
  add column progress_done int not null default 0 after error_text,
  add column progress_total int not null default 0 after progress_done,
  add column progress_step varchar(300) null after progress_total,
  add column result_text varchar(300) null after progress_step;
