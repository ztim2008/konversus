-- Core MVP migration: add template_id to listings

ALTER TABLE acb_listings
  ADD COLUMN template_id VARCHAR(64) NULL AFTER user_id;
