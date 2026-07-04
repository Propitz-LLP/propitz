-- Add cover image URL (Vercel Blob) to properties
alter table properties add column if not exists "imageUrl" text;
