create table if not exists public.local_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  event_type text not null check (
    event_type in (
      'city_wide_garage_sale',
      'community_sale',
      'flea_market',
      'swap_meet',
      'farmers_market',
      'local_market'
    )
  ),
  description text,
  address_line text,
  city text not null,
  state text not null,
  zip text,
  county text,
  latitude double precision,
  longitude double precision,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  event_schedule text,
  source_url text,
  source_platform text,
  source_notes text,
  status text not null default 'active' check (status in ('active', 'cancelled', 'ended')),
  visibility_status text not null default 'public' check (visibility_status in ('public', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sales
  add column if not exists event_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_event_id_fkey'
  ) then
    alter table public.sales
      add constraint sales_event_id_fkey
      foreign key (event_id)
      references public.local_events(id)
      on delete set null;
  end if;
end $$;

create index if not exists sales_event_id_idx
  on public.sales (event_id, starts_at);

create index if not exists local_events_public_idx
  on public.local_events (visibility_status, status, state, city, starts_at);

alter table public.local_events enable row level security;
