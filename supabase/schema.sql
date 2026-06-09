create extension if not exists pgcrypto;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  address_line text not null,
  city text not null,
  state text not null,
  zip text not null,
  latitude double precision,
  longitude double precision,
  location_precision text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  sale_schedule text,
  photo_urls text[] not null default '{}',
  categories text[] default '{}',
  status text not null default 'active' check (status in ('active', 'cancelled', 'ended')),
  source_type text not null default 'seller_created' check (source_type in ('seller_created', 'community_added', 'admin_added')),
  claim_status text not null default 'unclaimed' check (claim_status in ('unclaimed', 'claim_pending', 'claimed')),
  visibility_status text not null default 'public' check (visibility_status in ('public', 'hidden', 'removed')),
  source_notes text,
  source_platform text,
  source_url text,
  source_poster_name text,
  raw_source_text text,
  outreach_status text not null default 'not_contacted' check (
    outreach_status in (
      'not_contacted',
      'message_sent',
      'comment_posted',
      'localized_group_posted',
      'follow_up_needed',
      'outreach_complete',
      'claimed',
      'do_not_contact',
      'removed'
    )
  ),
  outreach_last_at timestamptz,
  outreach_notes text,
  outreach_private_done boolean not null default false,
  outreach_private_done_at timestamptz,
  outreach_group_done boolean not null default false,
  outreach_group_done_at timestamptz,
  event_id uuid,
  manage_token_hash text unique,
  claimed_at timestamptz,
  claimed_by_name text,
  claimed_by_contact text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  add column if not exists photo_urls text[] not null default '{}';

alter table public.sales
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_precision text;

alter table public.sales
  add column if not exists source_platform text,
  add column if not exists source_poster_name text,
  add column if not exists outreach_status text not null default 'not_contacted',
  add column if not exists outreach_last_at timestamptz,
  add column if not exists outreach_notes text,
  add column if not exists outreach_private_done boolean not null default false,
  add column if not exists outreach_private_done_at timestamptz,
  add column if not exists outreach_group_done boolean not null default false,
  add column if not exists outreach_group_done_at timestamptz;

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

alter table public.sales
  drop constraint if exists sales_outreach_status_check;

alter table public.sales
  add constraint sales_outreach_status_check check (
    outreach_status in (
      'not_contacted',
      'message_sent',
      'comment_posted',
      'localized_group_posted',
      'follow_up_needed',
      'outreach_complete',
      'claimed',
      'do_not_contact',
      'removed'
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'saletrail-photos',
  'saletrail-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.claim_requests (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  name text not null,
  contact text not null,
  claimant_email text,
  facebook_profile_name text,
  relationship text not null,
  message text,
  claim_code text not null,
  verification_method text check (verification_method in ('original_post_comment', 'localized_group_post')),
  wants_updates boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.claim_requests
  add column if not exists claimant_email text,
  add column if not exists facebook_profile_name text,
  add column if not exists verification_method text check (verification_method in ('original_post_comment', 'localized_group_post')),
  add column if not exists wants_updates boolean not null default false;

create table if not exists public.listing_requests (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  request_type text not null check (request_type in ('correction', 'removal')),
  name text,
  contact text,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('feature', 'bug', 'general')),
  name text,
  contact text,
  page_url text,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.local_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_area text not null check (submission_area in ('market', 'event', 'service')),
  title text not null,
  category text,
  name text,
  contact text,
  city text,
  state text,
  website_url text,
  description text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monetization_leads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'other' check (
    category in (
      'local_sponsor',
      'print_partner',
      'estate_sale_company',
      'citywide_partner',
      'affiliate',
      'local_business',
      'grant',
      'other'
    )
  ),
  status text not null default 'idea' check (
    status in (
      'idea',
      'researching',
      'contacted',
      'interested',
      'not_fit',
      'active'
    )
  ),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  area text,
  company_name text,
  contact_name text,
  contact_email text,
  contact_url text,
  estimated_value text,
  fit_notes text,
  next_step text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_public_search_idx
  on public.sales (visibility_status, status, city, state, zip, starts_at);

create index if not exists sales_public_map_idx
  on public.sales (visibility_status, status, latitude, longitude);

create index if not exists sales_claim_visibility_idx
  on public.sales (claim_status, source_type);

create index if not exists sales_outreach_queue_idx
  on public.sales (source_type, claim_status, outreach_status, starts_at);

create index if not exists sales_event_id_idx
  on public.sales (event_id, starts_at);

create index if not exists local_events_public_idx
  on public.local_events (visibility_status, status, state, city, starts_at);

create index if not exists claim_requests_status_idx
  on public.claim_requests (status, created_at desc);

create index if not exists listing_requests_status_idx
  on public.listing_requests (status, created_at desc);

create index if not exists feedback_requests_status_idx
  on public.feedback_requests (status, created_at desc);

create index if not exists local_submissions_status_idx
  on public.local_submissions (submission_area, status, created_at desc);

create index if not exists monetization_leads_status_idx
  on public.monetization_leads (status, priority, updated_at desc);

alter table public.sales enable row level security;
alter table public.local_events enable row level security;
alter table public.claim_requests enable row level security;
alter table public.listing_requests enable row level security;
alter table public.feedback_requests enable row level security;
alter table public.local_submissions enable row level security;
alter table public.monetization_leads enable row level security;

-- Launch 1 uses server-side access through SUPABASE_SERVICE_ROLE_KEY only.
-- Add public read/write policies later only if the app moves forms to direct browser writes.
