create extension if not exists pgcrypto;

create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  avatar_url text,
  bio text
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  cover_image_url text,
  layout jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  author_id uuid not null references public.authors(id),
  title text not null,
  slug text not null unique,
  excerpt text,
  cover_image_url text,
  content jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, position)
);

create index if not exists collections_status_idx on public.collections(status);
create index if not exists articles_collection_position_idx on public.articles(collection_id, position);
create index if not exists articles_status_published_idx on public.articles(status, published_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger authors_set_updated_at before update on public.authors for each row execute function public.set_updated_at();
create trigger collections_set_updated_at before update on public.collections for each row execute function public.set_updated_at();
create trigger articles_set_updated_at before update on public.articles for each row execute function public.set_updated_at();

alter table public.authors enable row level security;
alter table public.collections enable row level security;
alter table public.articles enable row level security;

create policy "Public can read authors" on public.authors for select using (true);
create policy "Admins can manage authors" on public.authors for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Public can read published collections" on public.collections for select using (status = 'published' or auth.role() = 'authenticated');
create policy "Admins can manage collections" on public.collections for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Public can read published articles" on public.articles for select using (status = 'published' or auth.role() = 'authenticated');
create policy "Admins can manage articles" on public.articles for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "Public can read media" on storage.objects for select using (bucket_id = 'media');
create policy "Admins can upload media" on storage.objects for insert with check (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "Admins can update media" on storage.objects for update using (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "Admins can delete media" on storage.objects for delete using (bucket_id = 'media' and auth.role() = 'authenticated');
