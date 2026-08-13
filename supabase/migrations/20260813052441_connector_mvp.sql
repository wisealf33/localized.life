create table public.people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  email text,
  phone text,
  town text,
  state text check (state is null or char_length(state) <= 2),
  how_met text,
  private_notes text,
  abilities text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index people_email_unique_idx
  on public.people (lower(email))
  where email is not null and trim(email) <> '';

create index people_auth_user_idx on public.people (auth_user_id);

create table public.connector_profiles (
  person_id uuid primary key references public.people (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null,
  headline text not null default '',
  intro text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text,
  address_line text,
  town text,
  state text check (state is null or char_length(state) <= 2),
  zip text,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_memberships (
  person_id uuid not null references public.people (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'manager')),
  joined_at timestamptz not null default now(),
  primary key (person_id, household_id)
);

create index household_memberships_household_idx
  on public.household_memberships (household_id, role);

create table public.connector_relationships (
  id uuid primary key default gen_random_uuid(),
  connector_person_id uuid not null references public.people (id) on delete restrict,
  person_id uuid references public.people (id) on delete cascade,
  household_id uuid references public.households (id) on delete cascade,
  is_primary boolean not null default true,
  status text not null default 'active' check (status in ('active', 'inactive')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((person_id is not null)::integer + (household_id is not null)::integer = 1),
  check (person_id is null or person_id <> connector_person_id),
  check ((status = 'active' and ended_at is null) or status = 'inactive')
);

create unique index connector_relationships_primary_person_idx
  on public.connector_relationships (person_id)
  where person_id is not null and status = 'active' and is_primary;

create unique index connector_relationships_primary_household_idx
  on public.connector_relationships (household_id)
  where household_id is not null and status = 'active' and is_primary;

create index connector_relationships_connector_idx
  on public.connector_relationships (connector_person_id, status, started_at desc);

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  requester_person_id uuid not null references public.people (id) on delete restrict,
  household_id uuid references public.households (id) on delete set null,
  connector_person_id uuid not null references public.people (id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 160),
  details text not null default '',
  status text not null default 'new' check (status in ('new', 'working', 'scheduled', 'completed', 'closed')),
  scheduled_for timestamptz,
  completed_at timestamptz,
  assigned_person_id uuid references public.people (id) on delete set null,
  connection_made_by_person_id uuid references public.people (id) on delete set null,
  connector_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index needs_connector_queue_idx
  on public.needs (connector_person_id, status, updated_at desc);

create index needs_requester_history_idx
  on public.needs (requester_person_id, created_at desc);

create table public.connector_interactions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  connector_person_id uuid not null references public.people (id) on delete restrict,
  need_id uuid references public.needs (id) on delete set null,
  note text not null check (char_length(trim(note)) between 1 and 4000),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index connector_interactions_person_idx
  on public.connector_interactions (person_id, occurred_at desc);

alter table public.people enable row level security;
alter table public.connector_profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_memberships enable row level security;
alter table public.connector_relationships enable row level security;
alter table public.needs enable row level security;
alter table public.connector_interactions enable row level security;

grant all on table public.people to service_role;
grant all on table public.connector_profiles to service_role;
grant all on table public.households to service_role;
grant all on table public.household_memberships to service_role;
grant all on table public.connector_relationships to service_role;
grant all on table public.needs to service_role;
grant all on table public.connector_interactions to service_role;

grant select (id, auth_user_id, display_name, email, phone, town, state, abilities, created_at, updated_at)
  on public.people to authenticated;
grant update (auth_user_id, updated_at) on public.people to authenticated;
grant select on public.connector_profiles to anon, authenticated;
grant select on public.households to authenticated;
grant select on public.household_memberships to authenticated;
grant select on public.connector_relationships to authenticated;
grant select (id, requester_person_id, household_id, connector_person_id, title, details, status, scheduled_for, completed_at, assigned_person_id, created_at, updated_at)
  on public.needs to authenticated;
grant insert (requester_person_id, household_id, connector_person_id, title, details)
  on public.needs to authenticated;

create policy "Active connector profiles are public"
  on public.connector_profiles for select
  to anon, authenticated
  using (active);

create policy "People can read their own identity"
  on public.people for select
  to authenticated
  using (
    (select auth.uid()) = auth_user_id
    or (
      auth_user_id is null
      and email is not null
      and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  );

create policy "People can link an invited identity"
  on public.people for update
  to authenticated
  using (
    auth_user_id is null
    and email is not null
    and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
  with check (
    auth_user_id = (select auth.uid())
    and email is not null
    and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

create policy "Members can read their own household memberships"
  on public.household_memberships for select
  to authenticated
  using (
    exists (
      select 1
      from public.people person
      where person.id = household_memberships.person_id
        and person.auth_user_id = (select auth.uid())
    )
  );

create policy "Members can read their households"
  on public.households for select
  to authenticated
  using (
    exists (
      select 1
      from public.household_memberships membership
      join public.people person on person.id = membership.person_id
      where membership.household_id = households.id
        and person.auth_user_id = (select auth.uid())
    )
  );

create policy "Members can read their connector relationships"
  on public.connector_relationships for select
  to authenticated
  using (
    exists (
      select 1
      from public.people person
      where person.id = connector_relationships.person_id
        and person.auth_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.household_memberships membership
      join public.people person on person.id = membership.person_id
      where membership.household_id = connector_relationships.household_id
        and person.auth_user_id = (select auth.uid())
    )
  );

create policy "Members can read their needs"
  on public.needs for select
  to authenticated
  using (
    exists (
      select 1
      from public.people person
      where person.id = needs.requester_person_id
        and person.auth_user_id = (select auth.uid())
    )
    or (
      needs.household_id is not null
      and exists (
        select 1
        from public.household_memberships membership
        join public.people person on person.id = membership.person_id
        where membership.household_id = needs.household_id
          and membership.role = 'manager'
          and person.auth_user_id = (select auth.uid())
      )
    )
  );

create policy "Members can create needs for their connector"
  on public.needs for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.people person
      where person.id = needs.requester_person_id
        and person.auth_user_id = (select auth.uid())
    )
    and (
      needs.household_id is null
      or exists (
        select 1
        from public.household_memberships membership
        where membership.household_id = needs.household_id
          and membership.person_id = needs.requester_person_id
          and membership.role = 'manager'
      )
    )
    and exists (
      select 1
      from public.connector_relationships relationship
      where relationship.connector_person_id = needs.connector_person_id
        and relationship.status = 'active'
        and (
          relationship.person_id = needs.requester_person_id
          or (
            needs.household_id is not null
            and relationship.household_id = needs.household_id
          )
        )
    )
  );

do $$
declare
  garrett_person_id uuid;
begin
  select person_id into garrett_person_id
  from public.connector_profiles
  where slug = 'garrett';

  if garrett_person_id is null then
    insert into public.people (display_name, town, state, abilities, private_notes)
    values (
      'Garrett',
      'Peotone',
      'IL',
      'Local coordination, practical help, and trusted introductions',
      'Initial Localized.life Connector profile.'
    )
    returning id into garrett_person_id;

    insert into public.connector_profiles (person_id, slug, display_name, headline, intro)
    values (
      garrett_person_id,
      'garrett',
      'Garrett',
      'Your local Connector',
      'If you need something, tell me what is going on. I will help clarify the need, handle it when I can, or work on connecting you with the right person.'
    );
  end if;
end
$$;
