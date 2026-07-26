-- Fix shared set_updated_at: never touch OLD.view_count as a record field
-- (collections/authors triggers share this function and don't have those columns).

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

-- Ensure engagement columns exist (safe if already applied)
alter table public.articles
  add column if not exists view_count integer not null default 0 check (view_count >= 0),
  add column if not exists like_count integer not null default 0 check (like_count >= 0);
