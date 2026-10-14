-- Ссылка на VK Видео или Rutube. Если она есть, фото у работы необязательны.

alter table portfolio_entries
  add column video_url varchar(500) null after description;
