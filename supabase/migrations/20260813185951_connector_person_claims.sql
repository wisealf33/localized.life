alter table public.people
  add column created_by_person_id uuid references public.people (id) on delete set null,
  add column claim_status text not null default 'unclaimed'
    check (claim_status in ('unclaimed', 'claimed')),
  add column claimed_at timestamptz;

create index people_created_by_idx
  on public.people (created_by_person_id, created_at desc)
  where created_by_person_id is not null;

alter table public.needs
  add column amount_cents integer check (amount_cents is null or amount_cents >= 0);

alter table public.connector_interactions
  add column visibility text not null default 'private'
    check (visibility in ('private', 'shared'));

create table public.connector_claim_invitations (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  connector_person_id uuid not null references public.people (id) on delete cascade,
  created_by_person_id uuid not null references public.people (id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (claimed_at is null or revoked_at is null)
);

create index connector_claim_invitations_person_idx
  on public.connector_claim_invitations (person_id, created_at desc);

create unique index connector_claim_invitations_one_active_idx
  on public.connector_claim_invitations (person_id, connector_person_id)
  where claimed_at is null and revoked_at is null;

alter table public.connector_claim_invitations enable row level security;

revoke all on table public.connector_claim_invitations from anon, authenticated;
grant all on table public.connector_claim_invitations to service_role;

grant select (amount_cents) on public.needs to authenticated;
grant select (id, person_id, connector_person_id, need_id, note, visibility, occurred_at, created_at)
  on public.connector_interactions to authenticated;

revoke update (auth_user_id, updated_at) on public.people from authenticated;

drop policy if exists "People can read their own identity" on public.people;
create policy "People can read their own identity"
  on public.people for select
  to authenticated
  using ((select auth.uid()) = auth_user_id);

drop policy if exists "People can link an invited identity" on public.people;

drop policy if exists "Members cannot read private connector interaction notes"
  on public.connector_interactions;
create policy "Members can read shared connector activity"
  on public.connector_interactions for select
  to authenticated
  using (
    visibility = 'shared'
    and exists (
      select 1
      from public.people person
      where person.id = connector_interactions.person_id
        and person.auth_user_id = (select auth.uid())
    )
  );

do $$
declare
  garrett_person_id uuid;
  sole_auth_user_id uuid;
begin
  select person_id into garrett_person_id
  from public.connector_profiles
  where slug = 'garrett';

  update public.people
  set claim_status = case when auth_user_id is null then 'unclaimed' else 'claimed' end,
      claimed_at = case when auth_user_id is null then null else coalesce(claimed_at, now()) end
  where claim_status is distinct from case when auth_user_id is null then 'unclaimed' else 'claimed' end
     or (auth_user_id is not null and claimed_at is null);

  if garrett_person_id is not null
     and (select count(*) from auth.users) = 1
     and not exists (
       select 1 from public.people
       where auth_user_id is not null and id <> garrett_person_id
     ) then
    select id into sole_auth_user_id from auth.users limit 1;

    update public.people
    set auth_user_id = sole_auth_user_id,
        claim_status = 'claimed',
        claimed_at = coalesce(claimed_at, now()),
        created_by_person_id = coalesce(created_by_person_id, garrett_person_id),
        updated_at = now()
    where id = garrett_person_id
      and auth_user_id is null;
  end if;
end
$$;
