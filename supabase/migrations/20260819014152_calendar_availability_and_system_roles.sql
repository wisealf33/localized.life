-- Availability belongs to a Person's private account calendar. Appointments
-- remain the source of truth for scheduled time; these rows only mark whether
-- a calendar date is open or closed.
create table public.account_calendar_availability (
  owner_person_id uuid not null references public.people (id) on delete cascade,
  availability_date date not null,
  status text not null check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_person_id, availability_date)
);

alter table public.account_calendar_availability enable row level security;
revoke all on table public.account_calendar_availability from public, anon, authenticated;
grant all on table public.account_calendar_availability to service_role;

create policy "Service role manages private account availability"
  on public.account_calendar_availability for all
  to service_role
  using (true)
  with check (true);

comment on table public.account_calendar_availability is
  'Private owner-scoped calendar dates marked open or closed; scheduled state is derived from account_appointments.';

-- System roles determine administrative visibility. These are never profile
-- preferences and are not directly exposed to signed-in browser clients.
create table public.person_system_roles (
  person_id uuid not null references public.people (id) on delete cascade,
  role text not null check (role in ('founder', 'system_manager')),
  active boolean not null default true,
  granted_by_person_id uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (person_id, role)
);

create index person_system_roles_granted_by_idx
  on public.person_system_roles (granted_by_person_id)
  where granted_by_person_id is not null;

alter table public.person_system_roles enable row level security;
revoke all on table public.person_system_roles from public, anon, authenticated;
grant all on table public.person_system_roles to service_role;

create policy "Service role manages private system roles"
  on public.person_system_roles for all
  to service_role
  using (true)
  with check (true);

insert into public.person_system_roles (person_id, role)
select person_id, 'founder'
from public.connector_profiles
where slug = 'garrett'
on conflict (person_id, role) do update
set active = true,
    updated_at = now();

comment on table public.person_system_roles is
  'Private system-assigned authority. Person profile owners do not choose these roles or their visibility boundaries.';

comment on column public.people.profile_visibility is
  'Legacy preference retained for compatibility; current profile access is determined by system roles and network relationships.';
comment on column public.people.contact_visibility is
  'Legacy preference retained for compatibility; current contact access is determined by system roles and network relationships.';
comment on column public.people.location_visibility is
  'Legacy preference retained for compatibility; current location access is determined by system roles and network relationships.';
comment on column public.people.directory_opt_in is
  'Legacy preference retained for compatibility; no person directory is enabled by this field.';
comment on column public.people.matching_opt_in is
  'Legacy preference retained for compatibility; matching access is governed by system rules.';
