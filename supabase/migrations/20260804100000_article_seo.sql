-- SEO fields + redirects for articles.
-- Only adds columns that did not already exist (slug, excerpt, meta_description,
-- published_at, updated_at were created in the initial schema).

alter table public.articles
  add column if not exists meta_title text,
  add column if not exists og_image_url text,
  add column if not exists canonical_url text,
  add column if not exists noindex boolean not null default false;

-- SEO-facing "last meaningfully published/updated" timestamp.
-- Unlike updated_at (bumped by every autosave, including one-character draft fixes),
-- content_updated_at is set only on publish (saveArticle). Sitemap lastModified and
-- metadata dateModified MUST read this column, never updated_at.
alter table public.articles
  add column if not exists content_updated_at timestamptz;

comment on column public.articles.content_updated_at is
  'Set on publish only. SEO dateModified / sitemap lastModified. Do NOT bump on autosave — use updated_at for that.';

-- Backfill content_updated_at from existing updated_at
update public.articles
set content_updated_at = coalesce(content_updated_at, updated_at, published_at, created_at)
where content_updated_at is null;

-- Ensure no empty slugs (slug already unique/not null, but empty strings may exist)
update public.articles
set slug = 'article-' || substr(replace(id::text, '-', ''), 1, 8)
where trim(coalesce(slug, '')) = '';

-- Deduplicate empty-fixed collisions by appending a short suffix when needed
do $$
declare
  r record;
  candidate text;
  n int;
begin
  for r in
    select id, slug
    from public.articles a
    where exists (
      select 1 from public.articles b
      where b.slug = a.slug and b.id <> a.id
    )
    order by created_at, id
  loop
    n := 2;
    loop
      candidate := r.slug || '-' || n::text;
      exit when not exists (select 1 from public.articles where slug = candidate);
      n := n + 1;
    end loop;
    -- Only rename the later duplicate rows: keep the earliest owner of the slug
    if exists (
      select 1 from public.articles
      where slug = r.slug and id <> r.id
        and (created_at, id) < (
          select created_at, id from public.articles where id = r.id
        )
    ) then
      update public.articles set slug = candidate where id = r.id;
    end if;
  end loop;
end $$;

create index if not exists articles_noindex_published_idx
  on public.articles (noindex, published_at desc)
  where status = 'published' and noindex = false;

create table if not exists public.article_redirects (
  id uuid primary key default gen_random_uuid(),
  from_slug text not null unique,
  to_slug text not null,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists article_redirects_to_slug_idx on public.article_redirects (to_slug);
create index if not exists article_redirects_article_id_idx on public.article_redirects (article_id);

alter table public.article_redirects enable row level security;

create policy "Public can read article redirects"
  on public.article_redirects for select
  using (true);

create policy "Admins can manage article redirects"
  on public.article_redirects for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
