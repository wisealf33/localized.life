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
) values (
  'unity-international-festival-in-kankakee-2026',
  'Unity International Festival in Kankakee',
  'community_sale',
  'Third annual Unity International Festival at Genesis Community Ministries in Kankakee. Event is rain or shine and includes entertainment, food, children''s games, and a 1:30 PM dedication of the Genesis Historical Memorial Garden. Public flyer lists more info by phone at 815-295-0585.',
  '2100 E Maple Street',
  'Kankakee',
  'IL',
  '60901',
  'Kankakee County',
  41.1197,
  -87.8364,
  '2026-05-30 14:00:00-05',
  '2026-05-30 18:00:00-05',
  'Saturday, May 30 2 PM-6 PM
1:30 PM dedication of Genesis Historical Memorial Garden
Rain or shine',
  'https://www.facebook.com/share/p/1KjzxYmB6K/',
  'Facebook',
  'Public Facebook post shared by A Motion Latin Dance in What''s Happening in Momence. Flyer image was not copied into the listing.',
  'active',
  'public'
) on conflict (slug) do update set
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

notify pgrst, 'reload schema';
