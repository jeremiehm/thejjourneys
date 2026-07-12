alter table public.articles
  add column if not exists meta_description text,
  add column if not exists lang text not null default 'fr';

create table if not exists public.article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  title text not null,
  excerpt text,
  meta_description text,
  content jsonb not null,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists article_revisions_article_id_created_at_idx
  on public.article_revisions(article_id, created_at desc);

alter table public.article_revisions enable row level security;

create policy "Authenticated can manage article revisions"
  on public.article_revisions for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
