create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  context text not null default '',
  tone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_agents_single_default_idx
  on public.ai_agents ((is_default))
  where is_default = true;

create trigger ai_agents_set_updated_at
  before update on public.ai_agents
  for each row execute function public.set_updated_at();

alter table public.ai_agents enable row level security;

create policy "Authenticated can manage ai agents"
  on public.ai_agents for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
