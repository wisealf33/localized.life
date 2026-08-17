-- Explicit access control for the private referral-intake queue.

create table public.referral_coordinators (
  person_id uuid primary key references public.people (id) on delete restrict,
  active boolean not null default true,
  created_by_person_id uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.referral_coordinators enable row level security;

revoke all on table public.referral_coordinators from public, anon, authenticated;
grant all on table public.referral_coordinators to service_role;

create policy referral_coordinators_service_role_all
  on public.referral_coordinators for all
  to service_role
  using (true)
  with check (true);

insert into public.referral_coordinators (person_id, created_by_person_id)
select person_id, person_id
from public.connector_profiles
where slug = 'garrett' and active = true
on conflict (person_id) do update
set active = true, updated_at = now();

comment on table public.referral_coordinators is
  'People authorized to review unassigned referral intake and record a direct referrer.';
