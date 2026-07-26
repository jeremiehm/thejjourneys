-- Engagement: views + likes without bumping articles.updated_at

alter table public.articles
  add column if not exists view_count integer not null default 0 check (view_count >= 0),
  add column if not exists like_count integer not null default 0 check (like_count >= 0);

-- Preserve updated_at when only engagement counters change.
-- Use jsonb only — this function is shared with collections/authors triggers.
create or replace function public.set_updated_at()
returns trigger as $$
declare
  old_j jsonb;
  new_j jsonb;
begin
  if tg_table_name = 'articles' then
    old_j := to_jsonb(old);
    new_j := to_jsonb(new);

    if (old_j - 'updated_at' - 'view_count' - 'like_count')
         = (new_j - 'updated_at' - 'view_count' - 'like_count')
       and (
         (old_j ->> 'view_count') is distinct from (new_j ->> 'view_count')
         or (old_j ->> 'like_count') is distinct from (new_j ->> 'like_count')
       )
    then
      new.updated_at := old.updated_at;
      return new;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.article_likes (
  article_id uuid not null references public.articles(id) on delete cascade,
  visitor_key text not null check (char_length(visitor_key) between 8 and 80),
  created_at timestamptz not null default now(),
  primary key (article_id, visitor_key)
);

create index if not exists article_likes_article_id_idx on public.article_likes(article_id);

alter table public.article_likes enable row level security;
-- No direct table policies: access only via security definer RPCs below.

create or replace function public.increment_article_view(p_article_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.articles
  set view_count = view_count + 1
  where id = p_article_id
    and status = 'published'
  returning view_count into new_count;

  return coalesce(new_count, 0);
end;
$$;

create or replace function public.toggle_article_like(p_article_id uuid, p_visitor_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liked boolean;
  v_count integer;
begin
  if p_visitor_key is null or char_length(p_visitor_key) < 8 or char_length(p_visitor_key) > 80 then
    raise exception 'invalid visitor key';
  end if;

  if not exists (
    select 1 from public.articles where id = p_article_id and status = 'published'
  ) then
    raise exception 'article not found';
  end if;

  if exists (
    select 1 from public.article_likes where article_id = p_article_id and visitor_key = p_visitor_key
  ) then
    delete from public.article_likes
    where article_id = p_article_id and visitor_key = p_visitor_key;

    update public.articles
    set like_count = greatest(like_count - 1, 0)
    where id = p_article_id
    returning like_count into v_count;

    v_liked := false;
  else
    insert into public.article_likes (article_id, visitor_key)
    values (p_article_id, p_visitor_key);

    update public.articles
    set like_count = like_count + 1
    where id = p_article_id
    returning like_count into v_count;

    v_liked := true;
  end if;

  return jsonb_build_object('liked', v_liked, 'like_count', coalesce(v_count, 0));
end;
$$;

create or replace function public.get_article_liked(p_article_id uuid, p_visitor_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_visitor_key is null or char_length(p_visitor_key) < 8 then
    return false;
  end if;

  return exists (
    select 1
    from public.article_likes
    where article_id = p_article_id and visitor_key = p_visitor_key
  );
end;
$$;

grant execute on function public.increment_article_view(uuid) to anon, authenticated;
grant execute on function public.toggle_article_like(uuid, text) to anon, authenticated;
grant execute on function public.get_article_liked(uuid, text) to anon, authenticated;
