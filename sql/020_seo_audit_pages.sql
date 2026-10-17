-- SEO-позиции: чек-лист по страницам. page_url = '' — главная и пункты сайта целиком (текущие оценки остаются там же),
-- иначе нормализованный адрес страницы (только пункты страницы).

alter table seo_audits
  add column page_url varchar(500) not null default '' after month,
  drop primary key,
  add primary key (project_id, month, page_url, item_no);
