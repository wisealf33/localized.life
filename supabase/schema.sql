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
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  sale_schedule text,
  categories text[] default '{}',
  status text not null default 'active' check (status in ('active', 'cancelled', 'ended')),
  source_type text not null default 'seller_created' check (source_type in ('seller_created', 'community_added', 'admin_added')),
  claim_status text not null default 'unclaimed' check (claim_status in ('unclaimed', 'claim_pending', 'claimed')),
  visibility_status text not null default 'public' check (visibility_status in ('public', 'hidden', 'removed')),
  source_notes text,
  source_url text,
  raw_source_text text,
  manage_token_hash text unique,
  claimed_at timestamptz,
  claimed_by_name text,
  claimed_by_contact text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.claim_requests (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  name text not null,
  contact text not null,
  relationship text not null,
  message text,
  claim_code text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

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

create index if not exists sales_public_search_idx
  on public.sales (visibility_status, status, city, state, zip, starts_at);

create index if not exists sales_claim_visibility_idx
  on public.sales (claim_status, source_type);

create index if not exists claim_requests_status_idx
  on public.claim_requests (status, created_at desc);

create index if not exists listing_requests_status_idx
  on public.listing_requests (status, created_at desc);

alter table public.sales enable row level security;
alter table public.claim_requests enable row level security;
alter table public.listing_requests enable row level security;

-- Launch 1 uses server-side access through SUPABASE_SERVICE_ROLE_KEY only.
-- Add public read/write policies later only if the app moves forms to direct browser writes.
