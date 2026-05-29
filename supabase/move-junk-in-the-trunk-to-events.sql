create extension if not exists pgcrypto;

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

insert into public.local_events (
  slug,
  title,
  event_type,
  description,
  address_line,
  city,
  state,
  zip,
  county,
  latitude,
  longitude,
  starts_at,
  ends_at,
  event_schedule,
  source_url,
  source_platform,
  source_notes,
  status,
  visibility_status
)
values (
  'junk-in-the-trunk-outdoor-flea-market-in-gilman-9722f8',
  'Junk In The Trunk Outdoor Flea Market in Gilman',
  'flea_market',
  'Community-added local event listing for Junk In The Trunk, an outdoor flea market at The Gathering & Front Porch Cafe in Gilman. Public flyer lists free vendor setup and market dates through September. Confirm current details with the organizer before going.',
  '931 S Crescent St',
  'Gilman',
  'IL',
  '60938',
  'Iroquois County',
  40.766282,
  -87.992333,
  '2026-05-30T09:00:00-05:00',
  '2026-09-26T14:00:00-05:00',
  'Upcoming 2026 dates shown on public flyer:
Saturday, May 30 9 AM-2 PM
Saturday, June 27 9 AM-2 PM
Saturday, July 25 9 AM-2 PM
Saturday, August 29 9 AM-2 PM
Saturday, September 26 9 AM-2 PM
Earlier listed dates: March 28 and April 25.',
  'https://www.facebook.com/share/1EBjMDM1K2/',
  'Facebook',
  'Public Facebook post by The Gathering in Gilman. Flyer says Junk In The Trunk Outdoor Flea Market at The Gathering & Front Porch Cafe, 931 S Crescent, Rt 24/45, Gilman IL, 9:00-2:00. Phone listed on flyer: 815-265-4635.',
  'active',
  'public'
)
on conflict (slug) do update
set
  title = excluded.title,
  event_type = excluded.event_type,
  description = excluded.description,
  address_line = excluded.address_line,
  city = excluded.city,
  state = excluded.state,
  zip = excluded.zip,
  county = excluded.county,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  event_schedule = excluded.event_schedule,
  source_url = excluded.source_url,
  source_platform = excluded.source_platform,
  source_notes = excluded.source_notes,
  status = excluded.status,
  visibility_status = excluded.visibility_status,
  updated_at = now();

update public.sales
set
  visibility_status = 'hidden',
  admin_notes = 'Hidden because this is a flea market/local event and belongs in local_events, not regular SaleTrail sale listings.',
  updated_at = now()
where slug = 'junk-in-the-trunk-outdoor-flea-market-in-gilman-9722f8';
