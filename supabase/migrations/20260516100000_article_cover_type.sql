alter table public.articles
  add column if not exists cover_type text not null default 'banner'
  check (cover_type in ('banner', 'above_title', 'below_title'));
