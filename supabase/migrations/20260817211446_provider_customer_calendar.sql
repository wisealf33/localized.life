-- Private customer and appointment management for claimed Person accounts.
-- These records are intentionally separate from public People and connections:
-- a provider can organize an established customer without creating a public
-- profile, referral attribution, or claim invitation for that customer.

create table public.account_customers (
  id uuid primary key default gen_random_uuid(),
  owner_person_id uuid not null references public.people (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  email text check (email is null or char_length(email) <= 320),
  phone text check (phone is null or char_length(phone) <= 60),
  address text check (address is null or char_length(address) <= 500),
  notes text check (notes is null or char_length(notes) <= 4000),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index account_customers_owner_idx
  on public.account_customers (owner_person_id, status, display_name);

create table public.account_appointments (
  id uuid primary key default gen_random_uuid(),
  owner_person_id uuid not null references public.people (id) on delete cascade,
  customer_id uuid not null references public.account_customers (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  location text check (location is null or char_length(location) <= 500),
  notes text check (notes is null or char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at <= starts_at + interval '7 days')
);

create index account_appointments_owner_start_idx
  on public.account_appointments (owner_person_id, starts_at, status);

create index account_appointments_customer_idx
  on public.account_appointments (customer_id, starts_at desc);

alter table public.account_customers enable row level security;
alter table public.account_appointments enable row level security;

-- The application authenticates the Person in its server route before using
-- the service role. No customer or appointment data is exposed directly to a
-- browser client through the Data API.
revoke all on table public.account_customers from public, anon, authenticated;
revoke all on table public.account_appointments from public, anon, authenticated;

grant all on table public.account_customers to service_role;
grant all on table public.account_appointments to service_role;

create policy "Service role manages private account customers"
  on public.account_customers for all
  to service_role
  using (true)
  with check (true);

create policy "Service role manages private account appointments"
  on public.account_appointments for all
  to service_role
  using (true)
  with check (true);

comment on table public.account_customers is
  'Private customer directory owned by one claimed Person account; not a public Person profile or connection.';

comment on table public.account_appointments is
  'Private calendar appointments owned by one claimed Person account.';
