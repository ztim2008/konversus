-- Core MVP migration: add admin role to users

ALTER TABLE acb_users
  ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER real_name;
